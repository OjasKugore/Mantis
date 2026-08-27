# 08 — Background Jobs & Async Processing

## 1. Overview

Bugzilla uses an asynchronous background processing system to handle time-consuming tasks without blocking HTTP responses. The primary mechanism is **TheSchwartz** — a database-backed reliable job queue — supplemented by traditional Unix **cron jobs**.

---

## 2. TheSchwartz Job Queue

**Technology**: `TheSchwartz` Perl module (database-backed)  
**Daemon**: `jobqueue.pl`  
**DB Tables**: `ts_job`, `ts_funcmap`, `ts_note`, `ts_error`, `ts_exitstatus`

### 2.1 Architecture

```
HTTP Request
     │
     ▼
Business Logic (e.g., bug update)
     │
     ▼
Bugzilla::BugMail::Send() called
     │ (doesn't send immediately)
     ▼
TheSchwartz::Job created → inserted into ts_job table
     │
     ▼
HTTP Response returned (fast, ~50ms)

────────────────────────────────────
[Background — jobqueue.pl daemon]
     │
     ▼
Polls ts_job table every N seconds
     │
     ▼
Grabs job (atomic UPDATE with grabbed_until)
     │
     ▼
Executes Bugzilla::Job::Mailer worker
     │
     ▼
Email::Sender dispatches email
     │
     ▼
Job marked complete (ts_exitstatus)
```

### 2.2 Job Types

**Location**: `Bugzilla/Job/`

| Job Class | Purpose | Triggers When |
|---|---|---|
| `Bugzilla::Job::BugMail` | Sends bug notification emails | Any bug change (create/update/flag/comment) |
| `Bugzilla::Job::Mailer` | Generic email sending | Account confirmation, password reset, whine |

### 2.3 Running the Daemon

```bash
# Start the job queue daemon
perl jobqueue.pl start

# Run in foreground (for debugging)
perl jobqueue.pl foreground

# Stop the daemon
perl jobqueue.pl stop

# Check daemon status
perl jobqueue.pl status
```

The daemon uses `Daemon::Generic` for process management (PID file, signals, etc.).

### 2.4 TheSchwartz Database Tables

#### `ts_funcmap` — Job Type Registry
```sql
-- Maps function names to numeric IDs for fast lookups
funcid   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
funcname VARCHAR(255) NOT NULL UNIQUE   -- e.g., 'Bugzilla::Job::BugMail'
```

#### `ts_job` — Pending Jobs
```sql
jobid         BIGINT AUTO_INCREMENT PRIMARY KEY
funcid        INT UNSIGNED NOT NULL          -- FK: ts_funcmap.funcid
arg           MEDIUMBLOB                     -- Serialized job arguments
uniqkey       VARCHAR(255)                   -- Optional deduplication key
insert_time   INT UNSIGNED                   -- Unix timestamp of insertion
run_after     INT UNSIGNED NOT NULL          -- Earliest execution time
grabbed_until INT UNSIGNED NOT NULL          -- Worker lease expiry timestamp
priority      SMALLINT UNSIGNED              -- Job priority
coalesce      VARCHAR(255)                   -- Coalescing key for batching
```

#### `ts_note` — Job Progress Notes
```sql
jobid    BIGINT NOT NULL       -- FK: ts_job.jobid
notekey  VARCHAR(255)
value    MEDIUMBLOB
```

#### `ts_error` — Job Errors
```sql
error_time INT UNSIGNED NOT NULL
error      VARCHAR(255) NOT NULL
jobid      BIGINT NOT NULL
funcid     INT UNSIGNED NOT NULL DEFAULT 0
```

#### `ts_exitstatus` — Completed Jobs
```sql
jobid         BIGINT NOT NULL PRIMARY KEY
funcid        INT UNSIGNED NOT NULL DEFAULT 0
status        SMALLINT UNSIGNED
completion_time INT UNSIGNED
delete_after  INT UNSIGNED
```

### 2.5 Email Deduplication

The BugMail job uses the `uniqkey` field to prevent duplicate emails:

```perl
# One email per bug per "lastdiffed" window
uniqkey => "bug_$bug_id:$lastdiffed"
```

Within a window, multiple changes are batched into a single notification email rather than sending one email per change.

---

## 3. Outbound Email System

**Location**: `Bugzilla/Mailer.pm`, `Bugzilla/Sender/`

### 3.1 Email Transport Stack

```perl
Bugzilla::Mailer::MessageToMTA($message)
     │
     ▼
Email::Sender::Simple->send($email, transport => $transport)
     │
     ├── Sendmail transport (default): pipes to /usr/sbin/sendmail
     ├── SMTP transport: connects to configured SMTP server
     └── SMTP-SSL/TLS transport: encrypted SMTP
```

**Transport selection**: Controlled by Bugzilla parameter `mail_delivery_method`:
- `Sendmail` — uses sendmail binary (most reliable for local delivery)
- `SMTP` — connects to external SMTP server
- `SMTPS` — SMTP with TLS
- `None` — disables email (testing mode)

### 3.2 BugMail Notification Logic

**Location**: `Bugzilla/BugMail.pm`

The `BugMail::Send()` function:

1. Loads the bug and finds all interested parties:
   - Reporter (`REL_REPORTER`)
   - Assignee (`REL_ASSIGNEE`)
   - QA Contact (`REL_QA`)
   - CC list members (`REL_CC`)
   - Global watchers (`REL_GLOBAL_WATCHER`)
   - Users watching the assignee/reporter (watch list)

2. For each recipient, checks their email preferences matrix (`email_setting` table):
   - Should they receive mail for their role in this bug?
   - Should they receive mail for this type of event?

3. Generates the diff of changes since `lastdiffed`:
   ```
   Status: CONFIRMED → IN_PROGRESS
   Assignee: nobody → developer@example.com
   Comment added: "Starting work on this..."
   ```

4. Renders email using Template Toolkit templates:
   - `email/bugmail.html.tmpl` (HTML version)
   - `email/bugmail.txt.tmpl` (plain-text version)

5. Sends multipart MIME email with proper headers:
   ```
   X-Bugzilla-Reason: AssignedTo
   X-Bugzilla-Type: changed
   X-Bugzilla-Watch-Reason: Watcher developer@example.com
   X-Bugzilla-Product: Firefox
   X-Bugzilla-Component: Networking
   X-Bugzilla-Keywords: crash, regression
   X-Bugzilla-Status: IN_PROGRESS
   X-Bugzilla-Priority: P1
   ```

### 3.3 Email Templates

**Location**: `template/en/default/email/`

| Template | Content |
|---|---|
| `bugmail.html.tmpl` | HTML bug notification with colored diffs |
| `bugmail.txt.tmpl` | Plain text bug notification |
| `whine.html.tmpl` | Whine reminder email with bug list |
| `newaccount.txt.tmpl` | Account verification email |
| `passwordreset.txt.tmpl` | Password reset link email |
| `request.txt.tmpl` | Flag request notification |
| `flagmail.txt.tmpl` | Flag granted/denied notification |

### 3.4 MIME Handling

**Module**: `Bugzilla::MIME` and `Email::MIME`

Emails are built as multipart MIME messages:
```
Content-Type: multipart/alternative
├── text/plain (plain text body)
└── text/html  (HTML body)
```

Attachment data in email notifications is never included inline — only metadata is shown.

---

## 4. Inbound Email Processing (`email_in.pl`)

This script allows users to interact with Bugzilla via email:

### 4.1 Setup

```bash
# Configure MTA to pipe emails for bugs@ to email_in.pl
# Example for Postfix /etc/aliases:
bugs: |/path/to/bugzilla/email_in.pl

# Run manually for testing:
cat email.msg | perl email_in.pl
```

### 4.2 Email → Bug Actions

The script parses MIME email and:

1. **Creates a new bug** if:
   - Email has `X-Bugzilla-Product` and `X-Bugzilla-Component` headers
   - OR headers are present in special `@` syntax in the body

2. **Adds a comment** if:
   - Email is a reply to a bug notification (detected via `In-Reply-To` header matching a bug ID)
   - Or the subject line contains `[Bug NNNN]`

### 4.3 Email Headers for Bug Fields

```
X-Bugzilla-Product: Firefox
X-Bugzilla-Component: Networking
X-Bugzilla-Version: 113.0
X-Bugzilla-Severity: normal
X-Bugzilla-Priority: Normal
X-Bugzilla-Status: CONFIRMED
X-Bugzilla-Assigned-To: developer@example.com
```

Or in body format:
```
@product      = Firefox
@component    = Networking
@version      = 113.0
```

---

## 5. Cron-Based Background Tasks

### 5.1 `whine.pl` — Scheduled Query Reminders

**Purpose**: Runs saved queries on a schedule and emails results to users/groups

```
whine_events table:    → Defines email subject/body template
whine_schedules table: → Defines when to run (day, hour)
whine_queries table:   → Defines which saved queries to run
```

**Schedule logic:**
```perl
# On each invocation, find events due to run:
SELECT ws.* FROM whine_schedules ws
WHERE ws.run_next <= NOW()

# For each due schedule, run the associated queries
# Send email with results if bugs found
# Update run_next for next scheduled time
```

**Schedule formats:**
- `run_day`: `Sun`, `Mon`, ..., `Sat`, `Day` (every day), `MDay` (1st of month), `WDay` (weekdays)
- `run_time`: `0`-`23` (hour), `interval` (every 15 min/hour/etc.)

**Cron setup:**
```bash
# /etc/cron.d/bugzilla
*/15 * * * * bugzilla /var/www/html/bugzilla/whine.pl
```

### 5.2 `collectstats.pl` — Historical Statistics Collector

**Purpose**: Counts bugs matching each series query and stores the daily snapshot

```bash
# Run daily via cron:
0 0 * * * bugzilla /var/www/html/bugzilla/collectstats.pl

# What it does:
# 1. Find all series in series table
# 2. For each series, run the stored query
# 3. Count the results
# 4. INSERT INTO series_data (series_id, series_date, series_value)
# 5. Update duplicate tracking data
```

These pre-aggregated counts power the graphical trend charts.

### 5.3 `clean-bug-user-last-visit.pl`

**Purpose**: Purges old `bug_user_last_visit` records to prevent unbounded table growth

```bash
# Run periodically:
0 6 * * * bugzilla /var/www/html/bugzilla/clean-bug-user-last-visit.pl

# Deletes records older than MAX_BUG_USER_LAST_VISIT_DAYS (default: 30 days)
```

### 5.4 `whineatnews.pl` — News Notifications

**Purpose**: Sends "Bugzilla news" notifications to subscribed users (rarely used)

---

## 6. XML Import (`importxml.pl`)

A bulk import tool for migrating bugs from other systems:

```bash
perl importxml.pl bugdump.xml

# Supports:
# - Bugzilla XML export format
# - Creates bugs, comments, attachments
# - Maps users by email address
# - Resolves product/component/version by name
# - Reports errors for unmapped values
```

The XML format mirrors the structure of bug export from `query.cgi` with `ctype=xml`.

---

## 7. Database Migration (`migrate.pl`)

Assists in migrating between database engines:

```bash
# Migrate from MySQL to PostgreSQL
perl migrate.pl --from=mysql --to=pg --pg-host=newserver

# Steps performed:
# 1. Dump all data from source DB
# 2. Transform data types for target DB
# 3. Insert into target DB in dependency order
# 4. Verify row counts match
```

---

## 8. Sanity Check (`sanitycheck.cgi` / `sanitycheck.pl`)

Both a web-accessible admin tool and a CLI utility that checks database integrity:

**Checks performed:**
- Bugs with invalid product/component references
- CC list entries with no corresponding profile
- Bugs with invalid bug status for their resolution
- Dependency graph cycles
- Group membership inconsistencies
- Orphaned attachment data records
- Duplicate bug_group_map entries
- Profile inconsistencies
- Flag orphans

```bash
perl sanitycheck.pl
# Outputs list of problems found and optionally fixes them
```

---

## 9. Async Architecture Limitations

### Current Problems:
1. **Single-server job queue**: TheSchwartz uses the Bugzilla DB; no horizontal scaling without a shared DB
2. **Polling-based**: Workers poll every few seconds, not event-driven
3. **No job priority queuing**: All jobs treated equally except for manual priority field
4. **No dead letter queue**: Failed jobs require manual inspection of `ts_error`
5. **No job progress tracking**: No way to see "email for bug 12345 is being processed"
6. **Cron dependency**: Scheduled tasks require OS-level cron setup

### Modern Replacement Recommendations:
| Current | Modern Equivalent |
|---|---|
| TheSchwartz in-DB queue | Redis/BullMQ, AWS SQS, or RabbitMQ |
| cron-based whining | Scheduled tasks in job queue (BullMQ cron) |
| Perl daemon | Node.js/Go worker service |
| TheSchwartz polling | Event-driven consumers |
| collectstats.pl | Streaming analytics or scheduled DB aggregation |
| email_in.pl via MTA pipe | Webhook/email parsing service (e.g., SendGrid inbound parse) |
