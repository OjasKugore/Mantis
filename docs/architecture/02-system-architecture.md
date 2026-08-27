# 02 — System Architecture

## 1. High-Level Architecture Overview

Bugzilla follows a **monolithic, server-side rendered MVC architecture** built entirely in Object-Oriented Perl (5.14+), running on Apache HTTP Server with mod_perl.

```
┌─────────────────────────────────────────────────────────────┐
│                  Web Browsers & API Clients                  │
│         (HTML browsers, curl, REST clients, IDEs)           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP(S) / REST / JSON-RPC / XML-RPC
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Apache HTTP Server 2.4+ (mod_perl 2.0)           │
│     (Alternatively: plain CGI via mod_cgi)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │   Entrypoint / Routing Layer     │
        │   (*.cgi scripts / rest.cgi)     │
        │   Each script = one "route"      │
        └──┬───────────────────────────┬──┘
           │                           │
    ┌──────▼──────┐             ┌──────▼──────┐
    │  Auth Layer │             │  Business   │
    │  Bugzilla   │◄───────────►│  Logic      │
    │  ::Auth     │             │  Layer      │
    └─────────────┘             │  (Bugzilla  │
                                │  ::Bug,     │
    ┌─────────────┐             │  ::User,    │
    │ Presentation│◄───────────►│  ::Product, │
    │ Layer       │             │  ::Flag,    │
    │ (Template   │             │  etc.)      │
    │  Toolkit)   │             └──────┬──────┘
    └─────────────┘                    │
                                       │
    ┌─────────────┐             ┌──────▼──────┐
    │  Extension  │◄───────────►│  Database   │
    │  Hooks      │             │  Layer      │
    │  (Bugzilla  │             │  (Bugzilla  │
    │  ::Hook)    │             │  ::DB)      │
    └─────────────┘             └──────┬──────┘
                                       │
                                       │ DBI / DBIx::Connector
                                       ▼
    ┌────────────────────────────────────────────────────────┐
    │   MariaDB / MySQL / PostgreSQL / Oracle / SQLite       │
    └────────────────────────────────────────────────────────┘
                    │
    ┌───────────────▼──────────────────┐
    │   Async Job Queue                │
    │   (TheSchwartz + jobqueue.pl)    │
    │   - BugMail notifications        │
    │   - Email sending                │
    └──────────────────────────────────┘
```

---

## 2. Layer-by-Layer Breakdown

### Layer 1: Entrypoint / Routing (CGI Scripts)

**Location**: `bugzilla/*.cgi` and `bugzilla/*.pl`  
**Technology**: Perl CGI scripts, mod_perl handlers

There is **no centralized router**. Each `.cgi` file is both a URL endpoint and a controller:

| Script | Route | Purpose |
|---|---|---|
| `index.cgi` | `GET /` | Home page |
| `show_bug.cgi` | `GET /show_bug.cgi?id=N` | Display a bug |
| `enter_bug.cgi` | `GET /enter_bug.cgi` | Bug creation form |
| `post_bug.cgi` | `POST /post_bug.cgi` | Submit new bug |
| `process_bug.cgi` | `POST /process_bug.cgi` | Update existing bug |
| `buglist.cgi` | `GET /buglist.cgi` | Search results list |
| `query.cgi` | `GET /query.cgi` | Search query builder |
| `attachment.cgi` | `GET/POST /attachment.cgi` | Attachment upload/download |
| `rest.cgi` | `ANY /rest/*` | REST API gateway |
| `jsonrpc.cgi` | `POST /jsonrpc.cgi` | JSON-RPC 2.0 gateway |
| `xmlrpc.cgi` | `POST /xmlrpc.cgi` | XML-RPC gateway |
| `chart.cgi` | `GET /chart.cgi` | Graphical chart generation |
| `report.cgi` | `GET /report.cgi` | Tabular report generation |
| `admin.cgi` | `GET /admin.cgi` | Administration portal |
| `userprefs.cgi` | `GET/POST /userprefs.cgi` | User preferences |
| `editproducts.cgi` | `GET/POST /editproducts.cgi` | Product administration |
| `editcomponents.cgi` | `GET/POST /editcomponents.cgi` | Component administration |
| `editgroups.cgi` | `GET/POST /editgroups.cgi` | Group administration |
| `editusers.cgi` | `GET/POST /editusers.cgi` | User administration |
| `editflagtypes.cgi` | `GET/POST /editflagtypes.cgi` | Flag type administration |
| `editfields.cgi` | `GET/POST /editfields.cgi` | Custom field administration |
| `relogin.cgi` | `GET/POST /relogin.cgi` | Login/logout |
| `createaccount.cgi` | `GET/POST /createaccount.cgi` | Registration |
| `token.cgi` | `GET/POST /token.cgi` | Token verification |
| `request.cgi` | `GET /request.cgi` | Flag request queue |
| `show_activity.cgi` | `GET /show_activity.cgi` | Bug change history |
| `showdependencygraph.cgi` | `GET /showdependencygraph.cgi` | Dependency graph |

**Request lifecycle in a CGI script:**
```perl
# Typical pattern inside each .cgi
use Bugzilla;
Bugzilla->init_page();                    # 1. Initialize request context
my $user = Bugzilla->login(LOGIN_REQUIRED); # 2. Authenticate

# 3. Input validation and permission check
my $bug_id = Bugzilla->cgi->param('id');
my $bug    = Bugzilla::Bug->check($bug_id);

# 4. Business logic
$bug->update_fields(...);

# 5. Render template
my $template = Bugzilla->template;
$template->process('bug/show.html.tmpl', { bug => $bug });
```

---

### Layer 2: Authentication (Bugzilla::Auth)

**Location**: `Bugzilla/Auth.pm` and `Bugzilla/Auth/`

The auth layer is a **three-stage pipeline**:

```
┌─────────────────────────────────────────┐
│          Bugzilla::Auth (orchestrator)  │
├────────────────┬─────────────────────── ┤
│  Info Getter   │  Verifier              │ ← Stage 1+2
│  (How to get   │  (How to verify        │
│   credentials) │   credentials)         │
│                │                        │
│  - Cookie      │  - DB (bcrypt hash)    │
│  - CGI Form    │  - LDAP                │
│  - Env Var     │  - RADIUS              │
│  - API Key     │  - Stack (chain)       │
└────────────────┴────────────────────────┘
                         │
             ┌───────────▼───────────┐
             │  Persister            │ ← Stage 3
             │  - Cookie persistence │
             └───────────────────────┘
```

**Auth constants:**
```
AUTH_OK          = 0  (success)
AUTH_NODATA      = 1  (no credentials provided)
AUTH_ERROR       = 2  (system error)
AUTH_LOGINFAILED = 3  (wrong password)
AUTH_DISABLED    = 4  (account disabled)
AUTH_NO_SUCH_USER= 5  (user doesn't exist)
AUTH_LOCKOUT     = 6  (too many failed attempts)
```

**Login requirement levels:**
```
LOGIN_OPTIONAL = 0  (anonymous access allowed)
LOGIN_NORMAL   = 1  (try to log in but don't require it)
LOGIN_REQUIRED = 2  (must be logged in)
```

---

### Layer 3: Business Logic (Domain Objects)

**Location**: `Bugzilla/*.pm`  
**Base class**: `Bugzilla::Object`

All domain entities extend `Bugzilla::Object`, which provides:
- CRUD operations mapped to database tables
- Field-level validation via `VALIDATORS` hash
- Automatic audit logging
- Memcached integration hooks
- Hook firing on create/update/delete

Key domain objects:

| Class | DB Table | Purpose |
|---|---|---|
| `Bugzilla::Bug` | `bugs` | Central bug record (156k lines) |
| `Bugzilla::User` | `profiles` | User accounts and permissions |
| `Bugzilla::Product` | `products` | Product definitions |
| `Bugzilla::Component` | `components` | Component within a product |
| `Bugzilla::Classification` | `classifications` | Top-level grouping |
| `Bugzilla::Attachment` | `attachments` | File attachments |
| `Bugzilla::Comment` | `longdescs` | Bug comments |
| `Bugzilla::Flag` | `flags` | Review/approval flags |
| `Bugzilla::FlagType` | `flagtypes` | Flag type definitions |
| `Bugzilla::Group` | `groups` | Security groups |
| `Bugzilla::Field` | `fielddefs` | Custom field definitions |
| `Bugzilla::Keyword` | `keyworddefs` | Tag/keyword definitions |
| `Bugzilla::Milestone` | `milestones` | Release milestones |
| `Bugzilla::Version` | `versions` | Product versions |
| `Bugzilla::Status` | (enum) | Bug status state machine |
| `Bugzilla::Token` | `tokens` | CSRF/account/session tokens |

---

### Layer 4: Database Abstraction (Bugzilla::DB)

**Location**: `Bugzilla/DB.pm`, `Bugzilla/DB/`

```
Bugzilla::DB (abstract base, uses Moo)
├── Bugzilla::DB::Mysql    (MySQL driver)
├── Bugzilla::DB::MariaDB  (MariaDB driver, extends Mysql)
├── Bugzilla::DB::Pg       (PostgreSQL driver)
├── Bugzilla::DB::Oracle   (Oracle driver)
└── Bugzilla::DB::Sqlite   (SQLite driver, dev/test only)
```

Key features:
- Built on **DBI** (Perl DBI interface) + **DBIx::Connector** for connection management
- Provides cross-database SQL helpers: `sql_date_format()`, `sql_date_math()`, `sql_istrcmp()`, `sql_fulltext_search()`, `sql_limit()`
- **Schema auto-migration**: `Bugzilla::DB::Schema` tracks all table definitions and auto-generates DDL
- Isolation level: `REPEATABLE READ` for transactional consistency
- Connection stored per-request in `Bugzilla->dbh`

**Schema versioning**: The `bz_schema` table stores a serialized Perl snapshot of the canonical schema. Migrations compare this against current DB state and auto-apply `ALTER TABLE` statements.

---

### Layer 5: Search Engine (Bugzilla::Search)

**Location**: `Bugzilla/Search.pm` (~110k bytes, ~3562 lines)

The most complex module. It translates a user's boolean chart queries into SQL:

```
User Query Params
    │
    ▼
┌─────────────────────────────────┐
│  Bugzilla::Search               │
│  - Parses chart tuples          │
│  - Builds ClauseGroup/Clause    │
│  - Resolves field→SQL mappings  │
│  - Handles custom fields        │
│  - Applies security JOIN        │
│  - Generates ORDER BY           │
└──────────────┬──────────────────┘
               │
               ▼
    Raw SQL query with JOINs
               │
               ▼
    DBI execute → result set
               │
               ▼
    Bug list / export
```

**Query types supported:**
- Simple quicksearch (freetext)
- Advanced boolean charts (AND/OR/NOT)
- Saved named queries
- Recent searches (stored per-user)

---

### Layer 6: Presentation (Template Toolkit)

**Location**: `template/en/default/`  
**Technology**: Perl Template Toolkit 3

Templates are `.html.tmpl` files organized by section:
```
template/en/default/
├── account/          User registration, login, password reset
├── admin/            All admin management screens
├── attachment/       Upload, detail, diff views
├── bug/              show.html.tmpl (main bug view), activity, create
├── email/            bugmail.html.tmpl, whine emails
├── global/           header.html.tmpl, footer, messages, select-menu
├── list/             Bug list table, column selector, format options
├── reports/          Tabular/chart reports
├── request/          Flag request queue
└── pages/            Static-ish content pages
```

**Template context**: The CGI scripts pass Perl data structures to templates. Templates access data via `[% variable %]` syntax with auto-escaping.

---

### Layer 7: Extension/Hook System (Bugzilla::Hook)

**Location**: `Bugzilla/Hook.pm`, `Bugzilla/Extension.pm`, `extensions/`

Extensions can inject code at predefined hook points:

```perl
# In any Bugzilla core code:
Bugzilla::Hook::process("bug_end_of_update", {
    bug     => $bug,
    changes => \%changes,
    old_bug => $old_bug,
});

# An extension responds:
sub bug_end_of_update {
    my ($self, $args) = @_;
    my $bug = $args->{bug};
    # Custom logic here
}
```

Available extensions in the repository:
- `BmpConvert` — auto-converts BMP attachments to PNG
- `Example` — reference implementation with all hooks
- `MoreBugUrl` — adds more external tracker URL types
- `Voting` — bug voting and popularity scoring
- `OldBugMove` — legacy bug movement tool

---

### Layer 8: Async Background Processing

**Location**: `jobqueue.pl`, `Bugzilla/JobQueue.pm`, `Bugzilla/Job/`  
**Technology**: TheSchwartz (database-backed job queue)

```
HTTP Request
    │
    ▼
Business Logic runs
    │ (triggers notifications)
    ▼
Bugzilla::BugMail::Send() ──► TheSchwartz::Job enqueued
    │                          into 'ts_job' table
    ▼
HTTP Response returned immediately (fast)

(Background)
    ┌──────────────────────┐
    │  jobqueue.pl daemon  │
    │  (TheSchwartz worker)│
    │  polls ts_job table  │
    │  picks up jobs       │
    │  executes them       │
    └──────────────────────┘
         │
         ▼
    Email::Sender dispatches
    via Sendmail/SMTP/SMTP-SSL
```

**Scheduled processes (cron-based):**
- `whine.pl` — runs saved queries and sends reminder emails
- `collectstats.pl` — collects daily bug statistics snapshots
- `clean-bug-user-last-visit.pl` — purges old last-visit records
- `whineatnews.pl` — sends "bugzilla news" emails

---

## 3. Request Lifecycle (Complete Flow)

```
1. Browser sends HTTP GET /show_bug.cgi?id=12345
2. Apache routes to mod_perl handler or CGI executor
3. show_bug.cgi executes:
   a. Bugzilla->init_page()
      - Read localconfig (db credentials, etc.)
      - Connect to DB via Bugzilla::DB
      - Initialize Memcached connection
      - Load extensions
   b. Bugzilla->login(LOGIN_REQUIRED)
      - Auth::Login::Cookie tries session cookie
      - Auth::Login::APIKey tries X-BUGZILLA-API-KEY header
      - Auth::Login::CGI tries form params
      - Auth::Verify::DB checks bcrypt hash
      - Auth::Persist::Cookie sets/renews session cookie
   c. $bug = Bugzilla::Bug->check(12345)
      - Checks bug exists
      - Checks user has permission to view
      - Returns lazy-loading bug object
   d. Permission check: can_see_bug()
   e. Pass $bug to Template Toolkit
   f. template->process('bug/show.html.tmpl', {bug => $bug})
      - Template renders HTML
      - Calls $bug->comments, $bug->attachments lazily
      - Calls $bug->flags lazily
      - Fires hook "bug_format_comment" for extensions
4. Apache sends HTML response to browser
```

---

## 4. Configuration System

**Location**: `Bugzilla/Config.pm`, `Bugzilla/Config/`

Two types of configuration:

| Type | File | Description |
|---|---|---|
| **localconfig** | `localconfig` | Database credentials, filesystem paths, web server group |
| **params** | Stored in DB `params` table | All runtime-configurable settings (SMTP, auth method, policies) |

Configuration sections (params):
- `Auth` — login methods, password policy, account creation rules
- `BugChange` — default bug fields, status workflow
- `Email` — SMTP server, from address, email policies
- `GroupSecurity` — group visibility and restriction policies  
- `Attachment` — size limits, allowed MIME types
- `Advanced` — caching, debugging, performance toggles
- `MTA` — mail transport agent configuration

---

## 5. Security Architecture

Security is layered at multiple levels:

1. **Auth Layer**: login required for most actions; API keys for programmatic access
2. **Permission Checks**: every object access goes through `can_see_bug()`, `can_edit_bug()` etc.
3. **CSRF Tokens**: form submissions include tokens via `Bugzilla::Token`; validated on POST
4. **Group-based Access Control**: bugs can be restricted to groups; queries are SQL-filtered
5. **Taint Mode**: Perl taint mode enabled; all user input is explicitly untainted before use
6. **SQL Parameterization**: all queries use DBI placeholders; no string concatenation with user data
7. **XSS Prevention**: Template Toolkit auto-escapes HTML by default; explicit `html` filter
8. **Content-Security-Policy**: headers set via Apache `.htaccess`
9. **Account Lockout**: `MAX_LOGIN_ATTEMPTS` and `LOGIN_LOCKOUT_INTERVAL` constants

---

## 6. Deployment Architecture

### Docker (Recommended)
```yaml
# docker-compose.yml
services:
  bugzilla:
    build: .                    # Ubuntu 24.04 LTS base
    ports: ["8080:80"]
    environment:
      - BZ_DB_HOST=bugzilla5.db
      - BZ_ADMIN_EMAIL=admin@bugzilla.test
  
  bugzilla5.db:
    image: bugzilla/mariadb:latest
    volumes:
      - db_data:/var/lib/mysql
```

### Native (Production)
```
Linux (Ubuntu/Debian/RHEL)
  └── Apache HTTP Server 2.4+
        └── mod_perl 2.0
              └── Bugzilla (Perl 5.14+)
                    └── MariaDB / MySQL / PostgreSQL
```

**Key Apache modules required:**
- `mod_perl2` or `mod_cgi`
- `mod_rewrite`
- `mod_headers`
- `mod_expires`

---

## 7. Component Interaction Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Browser  │────►│ Apache/  │────►│  .cgi    │────►│ Auth     │
│          │◄────│ mod_perl │◄────│ Script   │◄────│ Layer    │
└──────────┘     └──────────┘     └────┬─────┘     └──────────┘
                                       │
                    ┌──────────────────▼─────────────────────┐
                    │           Business Logic Layer           │
                    │  Bug    User   Product   Flag   Group   │
                    └──────────────────┬─────────────────────┘
                                       │
              ┌────────────────────────▼──────────────────────┐
              │                   DB Layer                     │
              │    Bugzilla::DB → DBI → MariaDB/MySQL/Pg      │
              └───────────────────────────────────────────────┘
                    │                 │                 │
              ┌─────▼────┐    ┌───────▼──────┐  ┌─────▼────┐
              │ Memcached│    │  TheSchwartz  │  │ Template │
              │ Cache    │    │  Job Queue    │  │ Toolkit  │
              └──────────┘    └──────────────┘  └──────────┘
```
