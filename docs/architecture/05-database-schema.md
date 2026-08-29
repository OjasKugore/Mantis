# 05 — Database Schema

## 1. Overview

Mantis uses a **relational database schema** defined entirely in `Mantis/DB/Schema.pm` as Perl data structures (the `ABSTRACT_SCHEMA` constant). This abstraction is what allows Mantis to support multiple RDBMS backends.

**Supported databases:**
- MariaDB 10.0+ (recommended)
- MySQL 5.0.15+
- PostgreSQL 8.3+
- Oracle 10.01.0+
- SQLite (development/testing only)

**Schema version**: 3 (controlled by `SCHEMA_VERSION` constant)

---

## 2. Complete Table Inventory

### 2.1 Bug-Related Tables

#### `bugs` — Core Bug Records
```sql
CREATE TABLE bugs (
    bug_id           MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    assigned_to      MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    bug_file_loc     MEDIUMTEXT NOT NULL DEFAULT '',
    bug_severity     VARCHAR(64) NOT NULL,
    bug_status       VARCHAR(64) NOT NULL,
    creation_ts      DATETIME,
    delta_ts         DATETIME NOT NULL,
    short_desc       VARCHAR(255) NOT NULL,
    op_sys           VARCHAR(64) NOT NULL,
    priority         VARCHAR(64) NOT NULL,
    product_id       SMALLINT UNSIGNED NOT NULL,   -- FK: products.id
    rep_platform     VARCHAR(64) NOT NULL,
    reporter         MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    version          VARCHAR(64) NOT NULL,
    component_id     MEDIUMINT UNSIGNED NOT NULL,  -- FK: components.id
    resolution       VARCHAR(64) NOT NULL DEFAULT '',
    target_milestone VARCHAR(64) NOT NULL DEFAULT '---',
    qa_contact       MEDIUMINT UNSIGNED,           -- FK: profiles.userid
    status_whiteboard MEDIUMTEXT NOT NULL DEFAULT '',
    lastdiffed       DATETIME,
    everconfirmed    TINYINT(1) NOT NULL,
    reporter_accessible TINYINT(1) NOT NULL DEFAULT 1,
    cclist_accessible   TINYINT(1) NOT NULL DEFAULT 1,
    estimated_time   DECIMAL(7,2) NOT NULL DEFAULT 0,
    remaining_time   DECIMAL(7,2) NOT NULL DEFAULT 0,
    deadline         DATETIME,
    -- + dynamic custom fields (cf_* columns added at runtime)
);
```

**Indexes**: `assigned_to`, `creation_ts`, `delta_ts`, `bug_severity`, `bug_status`, `op_sys`, `priority`, `product_id`, `reporter`, `version`, `component_id`, `resolution`, `target_milestone`, `qa_contact`

#### `bugs_fulltext` — Full-Text Search Index
```sql
CREATE TABLE bugs_fulltext (
    bug_id             MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY,  -- FK: bugs.bug_id CASCADE
    short_desc         VARCHAR(255) NOT NULL,
    comments           LONGTEXT,           -- All public + private comments concatenated
    comments_noprivate LONGTEXT            -- Only public comments
);
-- FULLTEXT indexes on short_desc, comments, comments_noprivate
```

#### `bugs_activity` — Complete Change Audit Trail
```sql
CREATE TABLE bugs_activity (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bug_id    MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    attach_id MEDIUMINT UNSIGNED,           -- FK: attachments.attach_id CASCADE (if attachment change)
    who       MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    bug_when  DATETIME NOT NULL,
    fieldid   MEDIUMINT UNSIGNED NOT NULL,  -- FK: fielddefs.id
    added     VARCHAR(255),
    removed   VARCHAR(255),
    comment_id INT UNSIGNED                 -- FK: longdescs.comment_id CASCADE
);
```

#### `bugs_aliases` — Bug Name Aliases
```sql
CREATE TABLE bugs_aliases (
    alias  VARCHAR(40) NOT NULL,
    bug_id MEDIUMINT UNSIGNED         -- FK: bugs.bug_id CASCADE
);
-- UNIQUE index on alias
```

#### `cc` — CC List (Many-to-Many)
```sql
CREATE TABLE cc (
    bug_id MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    who    MEDIUMINT UNSIGNED NOT NULL   -- FK: profiles.userid CASCADE
);
-- UNIQUE(bug_id, who)
```

#### `longdescs` — Bug Comments
```sql
CREATE TABLE longdescs (
    comment_id      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bug_id          MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    who             MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    bug_when        DATETIME NOT NULL,
    work_time       DECIMAL(7,2) NOT NULL DEFAULT 0,
    thetext         LONGTEXT NOT NULL,
    isprivate       TINYINT(1) NOT NULL DEFAULT 0,
    already_wrapped TINYINT(1) NOT NULL DEFAULT 0,
    type            SMALLINT NOT NULL DEFAULT 0,
    extra_data      VARCHAR(255)
);
```

#### `longdescs_tags` — Comment Tags
```sql
CREATE TABLE longdescs_tags (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    comment_id INT UNSIGNED,    -- FK: longdescs.comment_id CASCADE
    tag        VARCHAR(24) NOT NULL
);
```

#### `longdescs_tags_weights` — Tag Popularity
```sql
CREATE TABLE longdescs_tags_weights (
    id     MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tag    VARCHAR(24) NOT NULL UNIQUE,
    weight MEDIUMINT NOT NULL
);
```

#### `longdescs_tags_activity` — Tag Change Log
```sql
CREATE TABLE longdescs_tags_activity (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bug_id     MEDIUMINT UNSIGNED NOT NULL,
    comment_id INT UNSIGNED,
    who        MEDIUMINT UNSIGNED NOT NULL,
    bug_when   DATETIME NOT NULL,
    added      VARCHAR(24),
    removed    VARCHAR(24)
);
```

#### `dependencies` — Bug Dependency Graph
```sql
CREATE TABLE dependencies (
    blocked   MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE (the blocking bug)
    dependson MEDIUMINT UNSIGNED NOT NULL   -- FK: bugs.bug_id CASCADE (the blocked bug)
);
-- UNIQUE(blocked, dependson)
```

#### `duplicates` — Duplicate Relationships
```sql
CREATE TABLE duplicates (
    dupe_of MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE (canonical bug)
    dupe    MEDIUMINT UNSIGNED NOT NULL   -- FK: bugs.bug_id CASCADE (duplicate bug)
);
-- PRIMARY KEY on dupe (one-to-one)
```

#### `bug_see_also` — External Tracker Links
```sql
CREATE TABLE bug_see_also (
    id     MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bug_id MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    value  VARCHAR(255) NOT NULL,
    class  VARCHAR(255) NOT NULL DEFAULT ''
);
```

---

### 2.2 Attachment Tables

#### `attachments` — Attachment Metadata
```sql
CREATE TABLE attachments (
    attach_id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bug_id            MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    creation_ts       DATETIME NOT NULL,
    modification_time DATETIME NOT NULL,
    description       TINYTEXT NOT NULL,
    mimetype          TINYTEXT NOT NULL,
    ispatch           TINYINT(1) NOT NULL DEFAULT 0,
    filename          VARCHAR(255) NOT NULL,
    submitter_id      MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    isobsolete        TINYINT(1) NOT NULL DEFAULT 0,
    isprivate         TINYINT(1) NOT NULL DEFAULT 0
);
```

#### `attach_data` — Binary Attachment Content
```sql
CREATE TABLE attach_data (
    id      MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY,  -- FK: attachments.attach_id CASCADE
    thedata LONGBLOB NOT NULL
);
```

> **Design note**: Attachment metadata and binary data are split across two tables so that metadata queries don't need to load the binary blobs.

---

### 2.3 Audit Table

#### `audit_log` — Administrative Change Log
```sql
CREATE TABLE audit_log (
    user_id   MEDIUMINT UNSIGNED,   -- FK: profiles.userid SET NULL
    class     VARCHAR(255) NOT NULL,
    object_id INT NOT NULL,
    field     VARCHAR(64) NOT NULL,
    removed   MEDIUMTEXT,
    added     MEDIUMTEXT,
    at_time   DATETIME NOT NULL
);
-- INDEX on (class, at_time)
```

---

### 2.4 Keyword Tables

#### `keyworddefs` — Keyword Definitions
```sql
CREATE TABLE keyworddefs (
    id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64) NOT NULL UNIQUE,
    description MEDIUMTEXT NOT NULL
);
```

#### `keywords` — Bug-Keyword Mapping
```sql
CREATE TABLE keywords (
    bug_id    MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    keywordid SMALLINT UNSIGNED NOT NULL    -- FK: keyworddefs.id CASCADE
);
-- UNIQUE(bug_id, keywordid)
```

---

### 2.5 Flag Tables

#### `flags` — Active Flag Instances
```sql
CREATE TABLE flags (
    id                MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type_id           MEDIUMINT UNSIGNED NOT NULL,  -- FK: flagtypes.id CASCADE
    status            CHAR(1) NOT NULL,             -- '?', '+', or '-'
    bug_id            MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    attach_id         MEDIUMINT UNSIGNED,           -- FK: attachments.attach_id CASCADE
    creation_date     DATETIME NOT NULL,
    modification_date DATETIME,
    setter_id         MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    requestee_id      MEDIUMINT UNSIGNED            -- FK: profiles.userid
);
```

#### `flagtypes` — Flag Type Definitions
```sql
CREATE TABLE flagtypes (
    id               MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(50) NOT NULL,
    description      MEDIUMTEXT NOT NULL,
    cc_list          VARCHAR(200),
    target_type      CHAR(1) NOT NULL DEFAULT 'b',   -- 'b' (bug) or 'a' (attachment)
    is_active        TINYINT(1) NOT NULL DEFAULT 1,
    is_requestable   TINYINT(1) NOT NULL DEFAULT 0,
    is_requesteeble  TINYINT(1) NOT NULL DEFAULT 0,
    is_multiplicable TINYINT(1) NOT NULL DEFAULT 0,
    sortkey          SMALLINT NOT NULL DEFAULT 0,
    grant_group_id   MEDIUMINT UNSIGNED,             -- FK: groups.id SET NULL
    request_group_id MEDIUMINT UNSIGNED              -- FK: groups.id SET NULL
);
```

#### `flaginclusions` / `flagexclusions`
```sql
CREATE TABLE flaginclusions (
    type_id      MEDIUMINT UNSIGNED NOT NULL,  -- FK: flagtypes.id CASCADE
    product_id   SMALLINT UNSIGNED,            -- FK: products.id CASCADE (NULL = all products)
    component_id MEDIUMINT UNSIGNED            -- FK: components.id CASCADE (NULL = all components)
);
-- UNIQUE(type_id, product_id, component_id)
```

---

### 2.6 Field Definition Tables

#### `fielddefs` — Custom and Built-in Field Definitions
```sql
CREATE TABLE fielddefs (
    id                  MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(64) NOT NULL UNIQUE,
    type                SMALLINT NOT NULL DEFAULT 0,    -- FIELD_TYPE_* constants
    custom              TINYINT(1) NOT NULL DEFAULT 0,
    description         TINYTEXT NOT NULL,
    long_desc           VARCHAR(255) NOT NULL DEFAULT '',
    mailhead            TINYINT(1) NOT NULL DEFAULT 0,
    sortkey             SMALLINT NOT NULL,
    obsolete            TINYINT(1) NOT NULL DEFAULT 0,
    enter_bug           TINYINT(1) NOT NULL DEFAULT 0,  -- Show on bug entry form
    buglist             TINYINT(1) NOT NULL DEFAULT 0,  -- Can appear in bug lists
    visibility_field_id MEDIUMINT UNSIGNED,             -- FK: fielddefs.id (self)
    value_field_id      MEDIUMINT UNSIGNED,             -- FK: fielddefs.id (self)
    reverse_desc        TINYTEXT,
    is_mandatory        TINYINT(1) NOT NULL DEFAULT 0,
    is_numeric          TINYINT(1) NOT NULL DEFAULT 0
);
```

#### `field_visibility` — Conditional Field Display
```sql
CREATE TABLE field_visibility (
    field_id MEDIUMINT UNSIGNED,  -- FK: fielddefs.id CASCADE
    value_id SMALLINT NOT NULL
);
-- UNIQUE(field_id, value_id)
```

---

### 2.7 User / Profile Tables

#### `profiles` — User Accounts
```sql
CREATE TABLE profiles (
    userid        MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    login_name    VARCHAR(255) NOT NULL UNIQUE,
    cryptpassword VARCHAR(128),
    realname      VARCHAR(255) NOT NULL DEFAULT '',
    disabledtext  MEDIUMTEXT NOT NULL DEFAULT '',
    disable_mail  TINYINT(1) NOT NULL DEFAULT 0,
    mybugslink    TINYINT(1) NOT NULL DEFAULT 1,
    extern_id     VARCHAR(64),
    is_enabled    TINYINT(1) NOT NULL DEFAULT 1,
    last_seen_date DATE
);
```

#### `profile_setting` — Per-User Preferences
```sql
CREATE TABLE profile_setting (
    user_id       MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    setting_name  VARCHAR(32) NOT NULL,
    setting_value VARCHAR(32) NOT NULL
);
-- PRIMARY KEY(user_id, setting_name)
```

#### `setting` / `setting_value` — Setting Definitions
```sql
CREATE TABLE setting (
    name          VARCHAR(32) NOT NULL PRIMARY KEY,
    default_value VARCHAR(32) NOT NULL DEFAULT '',
    is_enabled    TINYINT(1) NOT NULL DEFAULT 1,
    subclass      VARCHAR(32)
);

CREATE TABLE setting_value (
    name     VARCHAR(32) NOT NULL,  -- FK: setting.name CASCADE
    value    VARCHAR(32) NOT NULL,
    sortindex SMALLINT NOT NULL
);
```

#### `tokens` — Security Tokens
```sql
CREATE TABLE tokens (
    userid    MEDIUMINT UNSIGNED,  -- FK: profiles.userid CASCADE (NULL for account tokens)
    issuedate DATETIME NOT NULL,
    token     VARCHAR(16) NOT NULL PRIMARY KEY,
    tokentype VARCHAR(16) NOT NULL,
    eventdata TINYTEXT
);
```

#### `user_api_keys` — API Keys
```sql
CREATE TABLE user_api_keys (
    id           MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id      MEDIUMINT UNSIGNED NOT NULL,   -- FK: profiles.userid CASCADE
    api_key      VARCHAR(40) NOT NULL UNIQUE,
    description  VARCHAR(255),
    revoked      TINYINT(1) NOT NULL DEFAULT 0,
    last_used    DATETIME,
    last_used_ip VARCHAR(40)
);
```

#### `logincookies` — Session Cookies
```sql
CREATE TABLE logincookies (
    cookieid    MEDIUMSERIAL NOT NULL PRIMARY KEY,
    userid      MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    ipaddr      VARCHAR(40),
    lastused    DATETIME NOT NULL,
    cookie      VARCHAR(22) NOT NULL UNIQUE,
    restrict_ipaddr TINYINT(1) NOT NULL DEFAULT 0
);
```

---

### 2.8 Group / ACL Tables

#### `groups` — Group Definitions
```sql
CREATE TABLE groups (
    id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description MEDIUMTEXT NOT NULL,
    isbuggroup  TINYINT(1) NOT NULL,
    userregexp  TINYTEXT NOT NULL DEFAULT '',
    isactive    TINYINT(1) NOT NULL DEFAULT 1,
    icon_url    VARCHAR(255)
);
```

#### `user_group_map` — User Group Memberships
```sql
CREATE TABLE user_group_map (
    user_id  MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    group_id SMALLINT UNSIGNED NOT NULL,   -- FK: groups.id CASCADE
    isbless  TINYINT(1) NOT NULL DEFAULT 0,  -- Can grant membership
    grant_type SMALLINT NOT NULL DEFAULT 0   -- 0=direct, 2=regexp
);
-- UNIQUE(user_id, group_id, grant_type, isbless)
```

#### `group_group_map` — Group Nesting / Inheritance
```sql
CREATE TABLE group_group_map (
    member_id   SMALLINT UNSIGNED NOT NULL,  -- FK: groups.id CASCADE
    grantor_id  SMALLINT UNSIGNED NOT NULL,  -- FK: groups.id CASCADE
    grant_type  SMALLINT NOT NULL DEFAULT 0
);
-- UNIQUE(member_id, grantor_id, grant_type)
```

#### `bug_group_map` — Bug Access Restrictions
```sql
CREATE TABLE bug_group_map (
    bug_id   MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    group_id SMALLINT UNSIGNED NOT NULL    -- FK: groups.id CASCADE
);
-- UNIQUE(bug_id, group_id)
```

#### `group_control_map` — Per-Product Group Access Rules
```sql
CREATE TABLE group_control_map (
    group_id          SMALLINT UNSIGNED NOT NULL,   -- FK: groups.id CASCADE
    product_id        SMALLINT UNSIGNED NOT NULL,   -- FK: products.id CASCADE
    entry             TINYINT(1) NOT NULL DEFAULT 0,
    membercontrol     SMALLINT NOT NULL DEFAULT 0,  -- CONTROLMAP* constants
    othercontrol      SMALLINT NOT NULL DEFAULT 0,  -- CONTROLMAP* constants
    canedit           TINYINT(1) NOT NULL DEFAULT 0,
    editcomponents    TINYINT(1) NOT NULL DEFAULT 0,
    editbugs          TINYINT(1) NOT NULL DEFAULT 0,
    canconfirm        TINYINT(1) NOT NULL DEFAULT 0
);
-- UNIQUE(group_id, product_id)
```

---

### 2.9 Product / Component Tables

#### `classifications`
```sql
CREATE TABLE classifications (
    id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64) NOT NULL UNIQUE,
    description MEDIUMTEXT,
    sortkey     SMALLINT NOT NULL DEFAULT 0
);
```

#### `products`
```sql
CREATE TABLE products (
    id                  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(64) NOT NULL UNIQUE,
    classification_id   SMALLINT UNSIGNED NOT NULL DEFAULT 1,  -- FK: classifications.id
    description         MEDIUMTEXT NOT NULL,
    isactive            TINYINT(1) NOT NULL DEFAULT 1,
    defaultmilestone    VARCHAR(20) NOT NULL DEFAULT '---',
    allows_unconfirmed  TINYINT(1) NOT NULL DEFAULT 1
);
```

#### `components`
```sql
CREATE TABLE components (
    id              MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(64) NOT NULL,
    product_id      SMALLINT UNSIGNED NOT NULL,  -- FK: products.id CASCADE
    description     MEDIUMTEXT NOT NULL,
    initialowner    MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid
    initialqacontact MEDIUMINT UNSIGNED,          -- FK: profiles.userid
    triage_owner_id MEDIUMINT UNSIGNED,           -- FK: profiles.userid
    isactive        TINYINT(1) NOT NULL DEFAULT 1
);
-- UNIQUE(product_id, name)
```

#### `versions`
```sql
CREATE TABLE versions (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    value      VARCHAR(64) NOT NULL,
    product_id SMALLINT UNSIGNED NOT NULL,  -- FK: products.id CASCADE
    isactive   TINYINT(1) NOT NULL DEFAULT 1
);
-- UNIQUE(product_id, value)
```

#### `milestones`
```sql
CREATE TABLE milestones (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product_id SMALLINT UNSIGNED NOT NULL,  -- FK: products.id CASCADE
    value      VARCHAR(20) NOT NULL,
    sortkey    SMALLINT NOT NULL DEFAULT 0,
    isactive   TINYINT(1) NOT NULL DEFAULT 1
);
-- UNIQUE(product_id, value)
```

---

### 2.10 Search / Query Tables

#### `namedqueries` — Saved Search Queries
```sql
CREATE TABLE namedqueries (
    id          MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    userid      MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    name        VARCHAR(64) NOT NULL,
    query       LONGTEXT NOT NULL
);
-- UNIQUE(userid, name)
```

#### `namedqueries_link_in_footer` — Queries Linked in Nav
```sql
CREATE TABLE namedqueries_link_in_footer (
    namedquery_id MEDIUMINT UNSIGNED NOT NULL,  -- FK: namedqueries.id CASCADE
    user_id       MEDIUMINT UNSIGNED NOT NULL   -- FK: profiles.userid CASCADE
);
-- UNIQUE(namedquery_id, user_id)
```

#### `namedquery_group_map` — Shared Queries
```sql
CREATE TABLE namedquery_group_map (
    namedquery_id MEDIUMINT UNSIGNED NOT NULL,  -- FK: namedqueries.id CASCADE
    group_id      SMALLINT UNSIGNED NOT NULL    -- FK: groups.id CASCADE
);
-- UNIQUE on namedquery_id
```

#### `tag` / `bug_tag` — Bug Tags
```sql
CREATE TABLE tag (
    id      MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    name    VARCHAR(64) NOT NULL
);
-- UNIQUE(user_id, name)

CREATE TABLE bug_tag (
    bug_id MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    tag_id MEDIUMINT UNSIGNED NOT NULL   -- FK: tag.id CASCADE
);
-- UNIQUE(bug_id, tag_id)
```

#### `bug_user_last_visit` — Last Bug View per User
```sql
CREATE TABLE bug_user_last_visit (
    id           MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id      MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    bug_id       MEDIUMINT UNSIGNED NOT NULL,  -- FK: bugs.bug_id CASCADE
    last_visit_ts DATETIME NOT NULL
);
-- UNIQUE(user_id, bug_id)
```

---

### 2.11 Email / Notification Tables

#### `email_setting` — Per-User Notification Preferences
```sql
CREATE TABLE email_setting (
    user_id       MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    relationship  SMALLINT NOT NULL,            -- REL_* constants
    event         SMALLINT NOT NULL             -- EVT_* constants
);
-- PRIMARY KEY(user_id, relationship, event)
```

#### `whine_queries` — Whine Query Definitions
```sql
CREATE TABLE whine_queries (
    id           MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    eventid      MEDIUMINT UNSIGNED NOT NULL,  -- FK: whine_events.id CASCADE
    query_name   VARCHAR(64) NOT NULL DEFAULT '',
    sortkey      SMALLINT NOT NULL DEFAULT 0,
    onemailperbug TINYINT(1) NOT NULL DEFAULT 0,
    title        VARCHAR(128) NOT NULL DEFAULT ''
);
```

#### `whine_events` — Scheduled Whine Events
```sql
CREATE TABLE whine_events (
    id       MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    owner_userid MEDIUMINT UNSIGNED NOT NULL,  -- FK: profiles.userid CASCADE
    subject  VARCHAR(128),
    body     MEDIUMTEXT,
    mailifnobugs TINYINT(1) NOT NULL DEFAULT 0
);
```

#### `whine_schedules` — Whine Cron Schedules
```sql
CREATE TABLE whine_schedules (
    id         MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    eventid    MEDIUMINT UNSIGNED NOT NULL,  -- FK: whine_events.id CASCADE
    run_day    VARCHAR(32),                  -- 'Sun','Mon',...,'Sat','Day','MDay','WDay'
    run_time   VARCHAR(32),                  -- '0','1',...,'23' or 'interval'
    run_next   DATETIME,
    mailto     MEDIUMINT UNSIGNED,           -- FK: profiles.userid/groups.id
    mailto_type SMALLINT NOT NULL DEFAULT 0 -- 0=user, 1=group
);
```

---

### 2.12 Async Job Queue Tables (TheSchwartz)

#### `ts_job` — Job Queue
```sql
CREATE TABLE ts_job (
    jobid           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    funcid          INT UNSIGNED NOT NULL,
    arg             MEDIUMBLOB,
    uniqkey         VARCHAR(255),
    insert_time     INT UNSIGNED,
    run_after       INT UNSIGNED NOT NULL,
    grabbed_until   INT UNSIGNED NOT NULL,
    priority        SMALLINT UNSIGNED,
    coalesce        VARCHAR(255)
);
```

#### `ts_funcmap` — Job Type Registry
```sql
CREATE TABLE ts_funcmap (
    funcid   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    funcname VARCHAR(255) NOT NULL UNIQUE
);
```

#### `ts_note` / `ts_error` / `ts_exitstatus` — Job Lifecycle
Standard TheSchwartz tables for job notes, errors, and completion tracking.

---

### 2.13 Analytics / Charting Tables

#### `series` — Chart Series Definitions
```sql
CREATE TABLE series (
    series_id   MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    creator     MEDIUMINT UNSIGNED,  -- FK: profiles.userid SET NULL
    category    MEDIUMINT UNSIGNED NOT NULL,  -- FK: series_categories.id CASCADE
    subcategory MEDIUMINT UNSIGNED NOT NULL,  -- FK: series_categories.id CASCADE
    name        VARCHAR(64) NOT NULL,
    frequency   SMALLINT NOT NULL DEFAULT 1,  -- Days between data points
    last_viewed DATETIME,
    public      TINYINT(1) NOT NULL DEFAULT 0,
    query       MEDIUMTEXT NOT NULL
);
```

#### `series_data` — Chart Data Points
```sql
CREATE TABLE series_data (
    series_id   MEDIUMINT UNSIGNED NOT NULL,  -- FK: series.series_id CASCADE
    series_date DATE NOT NULL,
    series_value MEDIUMINT UNSIGNED NOT NULL
);
-- UNIQUE(series_id, series_date)
```

#### `series_categories` — Chart Category Names
```sql
CREATE TABLE series_categories (
    id   MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE
);
```

---

## 3. Entity-Relationship Overview

```
classifications
    └── products (classification_id)
          ├── components (product_id)
          │     └── bugs (component_id, product_id)
          │           ├── longdescs (bug_id) → comments
          │           ├── attachments (bug_id)
          │           │     └── attach_data (attach_id)
          │           ├── bugs_activity (bug_id)
          │           ├── flags (bug_id, attach_id?)
          │           ├── keywords (bug_id) → keyworddefs
          │           ├── cc (bug_id) → profiles
          │           ├── dependencies (blocked/dependson)
          │           ├── duplicates (dupe_of/dupe)
          │           ├── bug_see_also (bug_id)
          │           ├── bug_group_map (bug_id) → groups
          │           └── bugs_fulltext (bug_id)
          ├── versions (product_id)
          ├── milestones (product_id)
          └── group_control_map (product_id) → groups

profiles (users)
    ├── user_group_map → groups
    ├── email_setting
    ├── profile_setting
    ├── namedqueries
    ├── user_api_keys
    ├── logincookies
    ├── tokens
    └── bug_user_last_visit → bugs

groups
    ├── group_group_map (nesting)
    ├── user_group_map → profiles
    ├── bug_group_map → bugs
    └── group_control_map → products

flagtypes
    ├── flaginclusions → products/components
    ├── flagexclusions → products/components
    └── flags → bugs/attachments

fielddefs (custom fields)
    └── field_visibility
    -- Dynamic tables: cf_<field_name> for select fields
```

---

## 4. Dynamic Schema Features

### Custom Field Tables

When a `SINGLE_SELECT` or `MULTI_SELECT` custom field is created, Mantis automatically creates a table `cf_<fieldname>` using `FIELD_TABLE_SCHEMA`:

```sql
CREATE TABLE cf_custom_status (
    id                  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    value               VARCHAR(64) NOT NULL UNIQUE,
    sortkey             SMALLINT NOT NULL DEFAULT 0,
    isactive            TINYINT(1) NOT NULL DEFAULT 1,
    visibility_value_id SMALLINT
);
```

### Schema Migration

The schema migration process:
1. `Mantis::DB::Schema` serializes the expected schema to a Perl data structure
2. On each `checksetup.pl` run, the current schema is compared with the expected schema
3. Missing tables → `CREATE TABLE`
4. Missing columns → `ALTER TABLE ADD COLUMN`
5. Missing indexes → `CREATE INDEX`
6. Modified columns → `ALTER TABLE MODIFY COLUMN`
7. Missing foreign keys → `ALTER TABLE ADD CONSTRAINT FOREIGN KEY`
