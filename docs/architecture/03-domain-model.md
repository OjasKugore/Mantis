# 03 — Domain Model

## 1. Overview

Bugzilla's domain model is built around a central `Bugzilla::Object` base class. All persistable entities inherit from it and follow a consistent pattern of `DB_TABLE`, `DB_COLUMNS`, `VALIDATORS`, and CRUD methods.

```
Bugzilla::Object (base class)
├── Bugzilla::Bug             (central domain entity)
├── Bugzilla::User            (user accounts)
├── Bugzilla::Product         (project/product)
│   └── Bugzilla::Component   (sub-area of product)
│       └── Bugzilla::Version
│           └── Bugzilla::Milestone
├── Bugzilla::Classification  (top-level grouping)
├── Bugzilla::Attachment      (file attachments)
├── Bugzilla::Comment         (bug comments, stored in longdescs)
├── Bugzilla::Flag            (review/approval flags)
├── Bugzilla::FlagType        (flag type definitions)
├── Bugzilla::Group           (security/ACL groups)
├── Bugzilla::Field           (custom field definitions)
├── Bugzilla::Keyword         (keyword/tag definitions)
├── Bugzilla::Token           (CSRF, session, account tokens)
├── Bugzilla::Status          (bug status state machine)
└── Bugzilla::Series          (chart data series)
```

---

## 2. Bugzilla::Bug — The Central Entity

**File**: `Bugzilla/Bug.pm` (~156k bytes, 5124 lines)  
**DB Table**: `bugs`

### 2.1 Core Fields

| Field | Type | Description |
|---|---|---|
| `bug_id` | `MEDIUMSERIAL` | Auto-increment primary key |
| `short_desc` | `varchar(255)` | One-line bug summary |
| `bug_status` | `varchar(64)` | Current status (UNCONFIRMED, CONFIRMED, etc.) |
| `resolution` | `varchar(64)` | Resolution if closed (FIXED, INVALID, etc.) |
| `priority` | `varchar(64)` | Priority level (Highest/High/Normal/Low/Lowest) |
| `bug_severity` | `varchar(64)` | Severity (blocker/critical/major/normal/minor/trivial/enhancement) |
| `op_sys` | `varchar(64)` | Affected operating system |
| `rep_platform` | `varchar(64)` | Affected hardware platform |
| `product_id` | `INT2` | FK → `products.id` |
| `component_id` | `INT3` | FK → `components.id` |
| `version` | `varchar(64)` | Product version this bug was found in |
| `target_milestone` | `varchar(64)` | Target milestone for fix |
| `assigned_to` | `INT3` | FK → `profiles.userid` (developer assigned) |
| `reporter` | `INT3` | FK → `profiles.userid` (who filed the bug) |
| `qa_contact` | `INT3` | FK → `profiles.userid` (QA owner) |
| `bug_file_loc` | `MEDIUMTEXT` | URL related to bug (e.g., crash URL) |
| `status_whiteboard` | `MEDIUMTEXT` | Free-form tag/note field |
| `creation_ts` | `DATETIME` | When bug was created |
| `delta_ts` | `DATETIME` | When bug was last modified |
| `lastdiffed` | `DATETIME` | Timestamp of last email notification sent |
| `everconfirmed` | `BOOLEAN` | Whether bug was ever confirmed |
| `reporter_accessible` | `BOOLEAN` | Reporter can see even if bug is restricted |
| `cclist_accessible` | `BOOLEAN` | CC list members can see even if restricted |
| `estimated_time` | `decimal(7,2)` | Hours estimated to fix |
| `remaining_time` | `decimal(7,2)` | Hours remaining |
| `deadline` | `DATETIME` | Hard deadline for resolution |

### 2.2 Validators (Field-Level Validation)

Every field has a validator function:

```perl
VALIDATORS => {
    alias           => \&_check_alias,
    assigned_to     => \&_check_assigned_to,
    blocked         => \&_check_dependencies,
    bug_file_loc    => \&_check_bug_file_loc,
    bug_severity    => \&_check_select_field,
    bug_status      => \&_check_bug_status,
    cc              => \&_check_cc,
    comment         => \&_check_comment,
    component       => \&_check_component,
    deadline        => \&_check_deadline,
    dependson       => \&_check_dependencies,
    dup_id          => \&_check_dup_id,
    estimated_time  => \&_check_time_field,
    groups          => \&_check_groups,
    keywords        => \&_check_keywords,
    priority        => \&_check_priority,
    product         => \&_check_product,
    qa_contact      => \&_check_qa_contact,
    resolution      => \&_check_resolution,
    short_desc      => \&_check_short_desc,
    target_milestone=> \&_check_target_milestone,
    version         => \&_check_version,
    ...
}
```

### 2.3 Related Tables (Bug Relationships)

| Table | Relationship | Description |
|---|---|---|
| `bugs_activity` | one-to-many | Complete change history per field |
| `bugs_fulltext` | one-to-one | Full-text search index (short_desc + comments) |
| `bugs_aliases` | one-to-many | Human-readable name aliases |
| `cc` | many-to-many | CC list (users watching the bug) |
| `longdescs` | one-to-many | All comments |
| `attachments` | one-to-many | File attachments |
| `flags` | one-to-many | Review/approval flags |
| `keywords` | many-to-many | Tags/keywords on the bug |
| `dependencies` | many-to-many | blocks/depends_on relationships |
| `bug_see_also` | one-to-many | External tracker URL links |
| `bug_group_map` | many-to-many | Security group restrictions |
| `duplicates` | one-to-one | Duplicate relationship (dupe_of/dupe) |

### 2.4 Bug Lifecycle State Machine

```
         ┌──────────────────────────────────────┐
         │          Status Transitions           │
         └──────────────────────────────────────┘

  [NEW/UNCONFIRMED] ──► [CONFIRMED] ──► [IN_PROGRESS]
         │                  │                 │
         │                  └──────┐          │
         │                         ▼          ▼
         └────────────────────► [RESOLVED] ──► [VERIFIED] ──► [CLOSED]
                                    │
                   ┌────────────────┘
                   │   (resolution type)
                   ├── FIXED
                   ├── INVALID
                   ├── WONTFIX
                   ├── DUPLICATE ──► points to another bug_id
                   ├── WORKSFORME
                   └── INCOMPLETE

REOPENING: RESOLVED → CONFIRMED (removes resolution, sets CONFIRMED)
           VERIFIED  → CONFIRMED (same)
```

**Transition validation** is handled by `Bugzilla::Status` and enforced in `_check_bug_status()` in `Bug.pm`.

---

## 3. Bugzilla::User — User Accounts

**File**: `Bugzilla/User.pm` (~103k bytes, 3408 lines)  
**DB Table**: `profiles`

### 3.1 Core Fields

| Field | DB Column | Description |
|---|---|---|
| `userid` | PK | Numeric user ID |
| `login_name` | `login_name` | Email address (unique identifier) |
| `realname` | `realname` | Display name |
| `cryptpassword` | `cryptpassword` | bcrypt-hashed password |
| `disabledtext` | `disabledtext` | Reason if account disabled |
| `disable_mail` | `disable_mail` | Suppress all email notifications |
| `extern_id` | `extern_id` | External auth ID (LDAP, etc.) |
| `is_enabled` | `is_enabled` | Account active flag |
| `last_seen_date` | `last_seen_date` | Last login date |

### 3.2 User Permissions Model

```
Global Permissions (groups table):
    admin         ─ full system administrator
    editbugs      ─ can edit all bugs (not just own)
    canconfirm    ─ can confirm UNCONFIRMED bugs
    creategroups  ─ can create new security groups
    editclassifications ─ can manage classifications
    editcomponents ─ can manage products/components
    tweakparams   ─ can change system parameters
    bz_canusewhineatnews ─ can receive news emails

Per-Product Permissions (group_control_map):
    editcomponents ─ per product
    editbugs       ─ per product
    canconfirm     ─ per product
```

### 3.3 User-Specific Features

- **Saved Searches**: Named queries stored in `namedqueries` table, can be shared
- **User Settings**: ~30 configurable preferences in `profile_setting` table
- **Watch list**: Can watch another user; receives copies of that user's notifications
- **API Keys**: Users can generate API keys for programmatic access (`user_api_keys` table)
- **Recent Searches**: Last 10 searches cached in `namedqueries_link_in_footer`
- **Last Visit Tracking**: `bug_user_last_visit` tracks when each user last viewed each bug

---

## 4. Product Hierarchy

### Bugzilla::Classification
**DB Table**: `classifications`

| Field | Type | Description |
|---|---|---|
| `id` | SMALLSERIAL | PK |
| `name` | varchar(64) | Classification name |
| `description` | MEDIUMTEXT | Description |
| `sortkey` | INT2 | Display ordering |

### Bugzilla::Product
**DB Table**: `products`

| Field | Type | Description |
|---|---|---|
| `id` | SMALLSERIAL | PK |
| `name` | varchar(64) | Product name |
| `classification_id` | INT2 | FK → classifications |
| `description` | MEDIUMTEXT | Description |
| `isactive` | BOOLEAN | Whether accepting new bugs |
| `defaultmilestone` | varchar(20) | Default target milestone |
| `allows_unconfirmed` | BOOLEAN | Can have UNCONFIRMED bugs |
| `default_cc` | (via component) | Default CC list |

### Bugzilla::Component
**DB Table**: `components`

| Field | Type | Description |
|---|---|---|
| `id` | MEDIUMSERIAL | PK |
| `name` | varchar(64) | Component name |
| `product_id` | INT2 | FK → products |
| `description` | MEDIUMTEXT | Description |
| `initialowner` | INT3 | FK → profiles (default assignee) |
| `initialqacontact` | INT3 | FK → profiles (default QA) |
| `triage_owner_id` | INT3 | FK → profiles (triage owner) |
| `isactive` | BOOLEAN | Active flag |

---

## 5. Bugzilla::Attachment

**File**: `Bugzilla/Attachment.pm`  
**DB Tables**: `attachments` (metadata), `attach_data` (blob)

| Field | Type | Description |
|---|---|---|
| `attach_id` | MEDIUMSERIAL | PK |
| `bug_id` | INT3 | FK → bugs |
| `creation_ts` | DATETIME | Upload timestamp |
| `description` | TINYTEXT | Attachment description/label |
| `mimetype` | TINYTEXT | MIME content type |
| `ispatch` | BOOLEAN | Is this a code patch? |
| `filename` | varchar(255) | Original filename |
| `submitter_id` | INT3 | FK → profiles |
| `isobsolete` | BOOLEAN | Marked as obsolete |
| `isprivate` | BOOLEAN | Hidden from non-members |

**Data storage**: Binary data stored in `attach_data.thedata` (`LONGBLOB`), separate from metadata table for performance.

**Patch viewing**: `PatchReader` and `patchutils` provide colorized unified and side-by-side diff rendering for `ispatch=1` attachments.

---

## 6. Bugzilla::Comment (longdescs)

**DB Table**: `longdescs`

| Field | Type | Description |
|---|---|---|
| `comment_id` | INTSERIAL | PK |
| `bug_id` | INT3 | FK → bugs |
| `who` | INT3 | FK → profiles (author) |
| `bug_when` | DATETIME | Timestamp |
| `work_time` | decimal(7,2) | Hours logged with this comment |
| `thetext` | LONGTEXT | Comment text (plain text) |
| `isprivate` | BOOLEAN | Only visible to `insidergroup` |
| `already_wrapped` | BOOLEAN | Pre-wrapped line indicator |
| `type` | INT2 | Comment type (normal/dupe-of/has-dupe/attachment created/updated) |
| `extra_data` | varchar(255) | Type-specific extra data |

**Comment types** (constants):
- `CMT_NORMAL = 0` — regular text comment
- `CMT_DUPE_OF = 1` — auto-generated "marked as duplicate of #N"
- `CMT_HAS_DUPE = 2` — auto-generated "bug #N marked as a duplicate"
- `CMT_ATTACHMENT_CREATED = 5` — auto-generated "attachment N created"
- `CMT_ATTACHMENT_UPDATED = 6` — auto-generated "attachment N updated"

**Comment tagging**: Comments can be tagged (via `longdescs_tags`). Tags are stored with weights (`longdescs_tags_weights`) and tag changes are audited (`longdescs_tags_activity`).

---

## 7. Bugzilla::Flag — Review/Approval System

**File**: `Bugzilla/Flag.pm`  
**DB Table**: `flags`

| Field | Type | Description |
|---|---|---|
| `id` | MEDIUMSERIAL | PK |
| `type_id` | INT3 | FK → flagtypes |
| `status` | char(1) | `?` (requested), `+` (granted), `-` (denied) |
| `bug_id` | INT3 | FK → bugs |
| `attach_id` | INT3 | FK → attachments (null if bug-level) |
| `creation_date` | DATETIME | When flag was set |
| `modification_date` | DATETIME | Last modification |
| `setter_id` | INT3 | FK → profiles (who set it) |
| `requestee_id` | INT3 | FK → profiles (who was asked) |

**Flag Type** (`flagtypes` table):
| Field | Description |
|---|---|
| `name` | Flag name (e.g., "review") |
| `description` | Human-readable description |
| `target_type` | `'b'` (bug) or `'a'` (attachment) |
| `is_active` | Active flag |
| `is_requestable` | Can be requested with `?` |
| `is_requesteeble` | Can specify a requestee |
| `is_multiplicable` | Can have multiple instances |
| `grant_group_id` | Only this group can grant `+`/`-` |
| `request_group_id` | Only this group can request `?` |

**Flag inclusions/exclusions**: `flaginclusions` and `flagexclusions` tables control which product/component combinations allow each flag type.

---

## 8. Bugzilla::Group — Access Control

**File**: `Bugzilla/Group.pm`  
**DB Table**: `groups`

| Field | Type | Description |
|---|---|---|
| `id` | SMALLSERIAL | PK |
| `name` | varchar(64) | Group name |
| `description` | MEDIUMTEXT | Description |
| `isbuggroup` | BOOLEAN | Is this a bug restriction group? |
| `userregexp` | TINYTEXT | Regex for auto-membership by email |
| `isactive` | BOOLEAN | Active flag |
| `icon_url` | varchar(255) | Optional icon URL |

**Group control map** (`group_control_map`): Controls how bugs in a product relate to a group:
- `CONTROLMAPNA = 0` — Group not applicable to this product
- `CONTROLMAPSHOWN = 1` — Group is shown as an option
- `CONTROLMAPDEFAULT = 2` — Group is selected by default
- `CONTROLMAPMANDATORY = 3` — All bugs in product must be in group

**Membership tables**:
- `user_group_map` — direct user memberships (grant type: `GRANT_DIRECT=0` or `GRANT_REGEXP=2`)
- `group_group_map` — group-in-group memberships (for nested groups)
- `bug_group_map` — which bugs are restricted to which groups

---

## 9. Bugzilla::Field — Custom Fields

**File**: `Bugzilla/Field.pm`  
**DB Table**: `fielddefs`

Custom fields allow administrators to add new bug fields without code changes.

| Field Type Constant | Value | Description |
|---|---|---|
| `FIELD_TYPE_UNKNOWN` | 0 | Unknown/unset |
| `FIELD_TYPE_FREETEXT` | 1 | Single-line text input |
| `FIELD_TYPE_SINGLE_SELECT` | 2 | Dropdown with one value |
| `FIELD_TYPE_MULTI_SELECT` | 3 | Multi-select list |
| `FIELD_TYPE_TEXTAREA` | 4 | Multi-line text |
| `FIELD_TYPE_DATETIME` | 5 | Date+time picker |
| `FIELD_TYPE_DATE` | 6 | Date-only picker |
| `FIELD_TYPE_BUG_ID` | 7 | Reference to another bug ID |
| `FIELD_TYPE_BUG_URLS` | 8 | External bug tracker URL(s) |
| `FIELD_TYPE_KEYWORDS` | 9 | Keyword selection |
| `FIELD_TYPE_INTEGER` | 10 | Integer number |

**Field visibility**: `field_visibility` table controls which fields are shown based on the value of another field (`visibility_field_id` + `visibility_value_id`). This enables conditional field display.

**Value tables**: For `SINGLE_SELECT` and `MULTI_SELECT` fields, values are stored in auto-created tables named `cf_<field_name>`.

---

## 10. Bugzilla::Token — Security Tokens

**File**: `Bugzilla/Token.pm`  
**DB Table**: `tokens`

Tokens are cryptographically secure random strings used for:

| Token Type | Purpose | Expiry |
|---|---|---|
| `session` | User session (cookie-based auth) | `MAX_LOGINCOOKIE_AGE` days |
| `api_token` | Programmatic API access | `MAX_TOKEN_AGE` days |
| `account` | New account email verification | `MAX_TOKEN_AGE` days |
| `emailold`/`emailnew` | Email change verification | `MAX_TOKEN_AGE` days |
| `password` | Password reset link | `MAX_TOKEN_AGE` days |
| `sudo` | Admin sudo token | `MAX_SUDO_TOKEN_AGE` hours |

**Security**: Tokens are generated using `Math::Random::ISAAC` (CSPRNG) and stored as SHA-256 digests. Hash tokens use `Digest::SHA::hmac_sha256_base64` for HMAC signing.

---

## 11. BugUrl — External Tracker Integration

**File**: `Bugzilla/BugUrl.pm` and `Bugzilla/BugUrl/`

The `bug_see_also` table stores URLs to external bug trackers. The `BugUrl` module recognizes and normalizes URLs for:

| Class | External Tracker |
|---|---|
| `BugUrl::Bugzilla` | Other Bugzilla instances |
| `BugUrl::GitHub` | GitHub Issues |
| `BugUrl::Google` | Google Code |
| `BugUrl::JIRA` | Atlassian JIRA |
| `BugUrl::Launchpad` | Ubuntu Launchpad |
| `BugUrl::Trac` | Trac bug trackers |
| `BugUrl::MantisBT` | MantisBT |
| `BugUrl::Debian` | Debian BTS |

---

## 12. Audit Trail

Every domain object change is captured in two ways:

1. **`bugs_activity` table**: Bug-specific field changes with `who`, `when`, `field`, `added`, `removed`
2. **`audit_log` table**: Generic audit log for admin objects (products, components, groups, etc.) with `class`, `object_id`, `field`, `removed`, `added`, `at_time`

The `Bugzilla::Object` base class automatically writes to `audit_log` for all entities where `AUDIT_CREATES=1` or `AUDIT_UPDATES=1`. The `Bug` class writes directly to `bugs_activity` instead.
