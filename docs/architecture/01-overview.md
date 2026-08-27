# 01 — System Overview & Problem Statement

## 1. The Core Problem Bugzilla Solves

Software engineering at any scale produces **defects**, **feature requests**, and **tasks** that need to be:

- **Reported** by testers, users, or developers with enough context to reproduce them
- **Triaged** and assigned to the right person or team
- **Tracked** through a structured lifecycle (open → in-progress → resolved → verified)
- **Communicated** to all stakeholders via notifications and updates
- **Audited** so that the full history of every change is permanently recorded
- **Searched and reported** so that teams can understand their bug backlog and velocity

Bugzilla was built in 1998 at Mozilla to address this exact problem at scale. It became the reference implementation for **enterprise defect tracking systems**.

---

## 2. Core Developer Workflows (Extracted from Bugzilla)

Understanding these workflows is essential before building a modern replacement.

### Workflow A: Bug Reporting
```
Reporter → Fill Bug Form → Submit → System assigns ID → Notify stakeholders
                                 ↓
              System checks for duplicates
              System validates product/component
              System triggers hooks → Extensions run
              System sends creation email
```

**Key data collected on creation:**
- Summary (short description, max 255 chars)
- Product → Component hierarchy
- Version (what version was it found in)
- Platform (`rep_platform`) and OS (`op_sys`)
- Priority & Severity
- URL of the bug (external link)
- Initial comment (description)
- Groups (security/visibility restrictions)
- Assignee, QA Contact, CC list

### Workflow B: Bug Triage
```
Triage Lead → Open UNCONFIRMED queue → Review → Confirm or Close as INVALID
                                              ↓
              Assign to appropriate developer
              Set target milestone & version
              Add/remove keywords
              Set priority
```

**Status states in Bugzilla:**
```
UNCONFIRMED → CONFIRMED → IN_PROGRESS → RESOLVED → VERIFIED → CLOSED
                    ↑_________________________|
                    (reopened)
```

**Resolution types (when RESOLVED):**
- `FIXED` — the bug was fixed
- `INVALID` — not actually a bug
- `WONTFIX` — bug is real but won't be addressed
- `DUPLICATE` — same as another bug (links to canonical)
- `WORKSFORME` — cannot reproduce
- `INCOMPLETE` — not enough information

### Workflow C: Code Review / Approval via Flags
```
Developer → Attaches patch → Sets flag: review? → Assigns to reviewer
                                                 ↓
           Reviewer reviews code → Sets flag: review+ or review-
                                 ↓
           If review+: proceeds to landing
           If review-: developer revises, re-requests
```

**Flag states:** `?` (requested), `+` (granted), `-` (denied), ` ` (cleared)

### Workflow D: Bug Update Cycle
```
Developer → Edit Bug → Modify fields → Add comment → Submit
                                    ↓
               System validates all changes
               System records diffs in bugs_activity table
               System queues BugMail notification job
               Async job runner sends emails to affected parties
```

### Workflow E: Search & Reporting
```
User → Query Builder → Construct boolean search → Execute → View results
                                               ↓
        Save as named query for reuse
        Export as CSV / Atom / XML
        Create tabular or chart report
```

---

## 3. Key Organizational Concepts

### Classification → Product → Component Hierarchy

```
Classification (top-level grouping, e.g., "Mozilla Products")
  └── Product (e.g., "Firefox")
        ├── Component (e.g., "Networking")
        ├── Component (e.g., "JavaScript Engine")
        └── Component (e.g., "CSS")
              ├── Version (e.g., "113.0", "114.0")
              └── Milestone (e.g., "Firefox 115", "Firefox 116")
```

Each Product has:
- Its own set of **Versions** and **Milestones**
- Per-product **group controls** (who can see/edit bugs)
- Per-product **flag types** (which reviews are applicable)
- Default **assignee** and **QA contact** per component

### Groups and Access Control

- **Bug Groups**: bugs can be restricted to a group (only members see them)
- **Admin Groups**: control who can administrate Bugzilla functions
- **Grant/Regexp Groups**: users can auto-join based on email patterns

### Relationships / Roles (for email notifications)

| Role Constant | Meaning |
|---|---|
| `REL_REPORTER` | User who filed the bug |
| `REL_ASSIGNEE` | User assigned to fix it |
| `REL_QA` | QA contact for the bug |
| `REL_CC` | Users on the CC list |
| `REL_GLOBAL_WATCHER` | Users watching all bugs |

---

## 4. Notification Event Model

Every user has a subscription matrix. They can select, per role, which events trigger email:

**Positive Events (opt-in):**
- `EVT_COMMENT` — a new comment is added
- `EVT_ATTACHMENT` — an attachment is added/changed
- `EVT_ATTACHMENT_DATA` — attachment content changed
- `EVT_PROJ_MANAGEMENT` — product/component/version/milestone changes
- `EVT_OPENED_CLOSED` — bug is opened or closed
- `EVT_KEYWORD` — a keyword is added/removed
- `EVT_CC` — CC list is modified
- `EVT_DEPEND_BLOCK` — dependency/blocks changes
- `EVT_BUG_CREATED` — a new bug is created

**Negative Events (opt-out):**
- `EVT_UNCONFIRMED` — do not mail when bug is UNCONFIRMED
- `EVT_CHANGED_BY_ME` — do not mail for my own changes

**Global Events (flag-specific):**
- `EVT_FLAG_REQUESTED` — someone has requested a flag of me
- `EVT_REQUESTED_FLAG` — someone responded to my flag request

---

## 5. The "Whining" System (Scheduled Reminders)

Bugzilla includes a scheduled notification system called "whining":
- Users create named saved queries
- They attach cron-like schedules to those queries
- At the scheduled time, the system runs the query and emails results to the user or a group
- Used for "nag" emails: e.g., "your P1 bugs have not been updated in 7 days"

---

## 6. Inbound Email Processing

Bugzilla supports email-to-bug creation:
- An MTA pipes emails to `email_in.pl`
- The script parses MIME content and extracts bug field values from email headers
- It can create new bugs or append comments to existing bugs
- Used for workflows where users reply to notification emails to comment

---

## 7. Time Tracking

Bugzilla has a built-in time tracking system:
- Each bug has `estimated_time`, `remaining_time`, and `actual_time` (sum of work_time on comments)
- Developers log hours spent via comments
- Reports (`summarize_time.cgi`) aggregate logged time by product/component/user
- Restricted to members of the `timetrackinggroup` group

---

## 8. Dependency Visualization

Bugs can block and depend on other bugs:
- `bugs_depends_on_bug_X` forms a directed acyclic graph
- `showdependencygraph.cgi` renders this as a Graphviz DOT image
- `showdependencytree.cgi` renders it as an HTML tree
- Circular dependency detection is enforced at write time

---

## 9. Pain Points of the Legacy System (Motivating Modernization)

| Pain Point | Details |
|---|---|
| **CGI-per-action model** | Every action is a separate `.cgi` file, no routing layer |
| **Server-side rendering only** | All UI is Template Toolkit HTML, no reactive frontend |
| **No real-time updates** | No WebSockets; must refresh page to see changes |
| **Email-only notifications** | No in-app notification center |
| **Perl/mod_perl only** | No modern API framework; deployment is complex |
| **No mobile-first design** | UI is from early 2000s, not responsive |
| **Monolithic frontend** | Vanilla JS sprinkled into templates; no component system |
| **Complex installation** | Requires Apache + mod_perl + dozens of CPAN modules |
| **Limited search UX** | Boolean chart builder is powerful but cryptic for new users |
| **No Markdown support** | Comments are plain text with URL detection only |
