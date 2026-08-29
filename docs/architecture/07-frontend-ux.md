# 07 — Frontend & User Experience

## 1. Overview

Mantis's frontend is a **server-side rendered, form-based** interface using:
- **Template Toolkit 3** for HTML generation
- **Vanilla JavaScript** (no framework) for interactive elements
- **Yahoo! UI Library (YUI 2)** for some advanced widgets
- **Vanilla CSS** with a skin system

The result is functional but dated — no responsive design, no reactive components, and limited accessibility.

---

## 2. Template System

**Technology**: Template Toolkit (TT3)  
**Location**: `template/en/default/`

### 2.1 Directory Structure

```
template/en/default/
├── account/
│   ├── email/           Email change confirmation templates
│   ├── prefs/           Preferences page tabs (account, email, saved-searches, etc.)
│   ├── auth-delegation.html.tmpl
│   ├── create.html.tmpl          Registration form
│   ├── login.html.tmpl           Login form
│   └── password-resetting.html.tmpl
│
├── admin/
│   ├── classifications/  Classification management
│   ├── components/       Component management
│   ├── custom_fields/    Custom field editor
│   ├── fieldvalues/      Field value editor
│   ├── flag-type/        Flag type management
│   ├── groups/           Group management
│   ├── keywords/         Keyword management
│   ├── milestones/       Milestone management
│   ├── params/           System parameter editor
│   ├── products/         Product management
│   ├── settings/         User setting defaults
│   ├── users/            User administration
│   ├── versions/         Version management
│   ├── workflow/         Status transition workflow editor
│   └── index.html.tmpl   Admin portal home
│
├── attachment/
│   ├── created.html.tmpl          Post-upload confirmation
│   ├── edit.html.tmpl             Attachment metadata edit form
│   ├── list.html.tmpl             Attachment list
│   ├── show-multiple.html.tmpl    Multi-attachment view
│   └── diff-header.html.tmpl      Patch diff viewer header
│
├── bug/
│   ├── activity/          Bug change history view
│   ├── comments/          Comment formatting and threading
│   ├── create/            Bug creation wizard
│   ├── edit.html.tmpl     Inline field editing
│   ├── show.html.tmpl     Main bug view (largest template)
│   ├── summarize-time.html.tmpl  Time tracking summary
│   └── format/            Alternative bug display formats
│
├── email/
│   ├── bugmail.html.tmpl  HTML bug notification email
│   ├── bugmail.txt.tmpl   Plain-text bug notification
│   ├── whine.html.tmpl    Whine reminder email
│   └── newaccount.txt.tmpl  Registration confirmation email
│
├── global/
│   ├── code-error.html.tmpl   Developer error page
│   ├── common-links.html.tmpl Navigation links
│   ├── header.html.tmpl       Page header + nav
│   ├── footer.html.tmpl       Page footer
│   ├── messages.html.tmpl     Flash message templates
│   ├── modal.html.tmpl        Modal dialog template
│   ├── select-menu.html.tmpl  Reusable dropdown component
│   ├── user-error.html.tmpl   User-facing error page
│   └── variables.none.tmpl    Global TT variable definitions
│
├── list/
│   ├── list.html.tmpl         Bug list table
│   ├── table.html.tmpl        Bug table with columns
│   ├── format/                Export formats (CSV, XML, Atom, JSON)
│   └── column-selector.html.tmpl  Column picker UI
│
├── reports/
│   ├── report.html.tmpl       Chart page
│   ├── reports.html.tmpl      Reports home
│   ├── duplicates.html.tmpl   Duplicate bugs report
│   ├── graphical.html.tmpl    Chart rendering page
│   └── tabular.html.tmpl      Tabular matrix report
│
└── request/
    ├── queue.html.tmpl        Flag request queue
    └── email.txt.tmpl         Flag request notification
```

### 2.2 Template Toolkit Features Used

```
[% variable %]                  — Variable substitution (auto-escaped as HTML)
[% INCLUDE 'file.tmpl' %]       — Template inclusion
[% PROCESS 'file.tmpl' %]       — Template processing (shares namespace)
[% BLOCK name %]...[% END %]    — Named template blocks
[% IF condition %]...[% END %]  — Conditionals
[% FOREACH item IN list %]      — Loops
[% item | html %]               — HTML-escape filter
[% item | url %]                — URL-encode filter
[% item | js %]                 — JavaScript-escape filter
[% item | email %]              — Email-obfuscate filter
[% HOOK hook_name %]            — Extension hook point
```

### 2.3 Custom TT Plugins (`Mantis::Template`)

**Location**: `Mantis/Template.pm` and `Mantis/Template/`

Custom plugins add Mantis-specific functionality to templates:

```perl
# Custom filters registered:
html_linebreak    — Convert \n to <br>
wrap_comment      — Word-wrap comment text at COMMENT_COLS columns
quoteUrls         — Convert URLs and bug references to hyperlinks
time              — Format DateTime objects
none              — Explicitly marks content as safe (no escaping)
txt               — Text format filter
html              — HTML escaping
```

**`quoteUrls` filter** is particularly important: it scans comment text and converts:
- `bug 12345` → `<a href="show_bug.cgi?id=12345">bug 12345</a>`
- `comment 5` → link to comment #5 on the same bug
- `https://...` → clickable link
- `attachment 67` → link to attachment

---

## 3. JavaScript Architecture

**Location**: `js/`  
**Technology**: Vanilla JavaScript + YUI 2

### 3.1 JavaScript Files

| File | Purpose |
|---|---|
| `field.js` | Custom field dynamic visibility and value synchronization (44k) |
| `bug.js` | Bug view interactivity, collapsing long comments |
| `attachment.js` | Attachment upload, preview, and flag UI |
| `custom-search.js` | Dynamic boolean query builder UI |
| `comment-tagging.js` | Inline comment tagging interface |
| `comments.js` | Comment collapsing, expanding, threading |
| `productform.js` | Product/component/version selector cascade |
| `flag.js` | Flag request UI (requestee autocomplete) |
| `change-columns.js` | Bug list column selector |
| `expanding-tree.js` | Collapsible dependency tree |
| `params.js` | Admin params form helpers |
| `global.js` | Utility functions used across pages |
| `util.js` | Date formatting, string utilities |
| `TUI.js` | Terminal UI helpers (for non-browser contexts) |

### 3.2 `field.js` — Dynamic Custom Fields (Most Complex JS)

The largest JS file implements conditional field visibility:

```javascript
// When "Component" changes, update:
// - Version dropdown (filtered to product-compatible versions)
// - Milestone dropdown (filtered)
// - Flag type list (filtered to product/component)
// - Custom fields with visibility_field_id dependencies
// - Component description display

function updateDependentFields(field_name, value) {
    // Re-fetch valid values from server
    // Show/hide fields based on current values
    // Update all dependent dropdowns
}
```

**Key interactions:**
- `Product` change → cascade update of `Component`, `Version`, `Milestone`
- `Component` change → update default `Assignee` and `QA Contact`
- Custom field `X` change → show/hide field `Y` based on `field_visibility`

### 3.3 YUI 2 Components

Located in `js/yui/`:
- `autocomplete` — User email autocomplete for assignee, CC, requestee fields
- `calendar` — Date picker for custom date fields and deadline
- `animation` — Transition animations
- `datasource` — AJAX data loading for autocomplete

---

## 4. Skin System

**Location**: `skins/`

```
skins/
├── standard/          Default skin (production)
│   ├── global.css     Base styles, typography, layout
│   ├── index.css      Home page styles
│   ├── bug.css        Bug view styles
│   ├── create_bug.css Bug creation form
│   ├── admin.css      Admin pages
│   ├── buglist.css    Bug list styles
│   ├── attachment.css Attachment viewer
│   ├── panel.css      Panel/modal components
│   └── yui/           YUI widget styles
└── contrib/           Community-contributed skins
```

**Skin selection**: Users can select their preferred skin in User Preferences. Each skin is a set of CSS files that override or replace the base styles.

---

## 5. Page-by-Page UX Analysis

### 5.1 Bug View (`show_bug.cgi`)

The most complex page in Mantis. Contents:

```
┌─────────────────────────────────────────────────────┐
│ Bug #XXXXX – [Summary]                              │
├─────────────────────────────────────────────────────┤
│ Status: CONFIRMED  │  Priority: Normal               │
│ Product: Firefox   │  Component: Networking          │
│ Version: 113.0     │  Target: Firefox 115            │
│ Assigned To: user  │  QA Contact: qa@example.com     │
├─────────────────────────────────────────────────────┤
│ Flags: review? (requested of: reviewer@example.com) │
├─────────────────────────────────────────────────────┤
│ Depends on: #12340, #12341                          │
│ Blocks: #12350                                      │
├─────────────────────────────────────────────────────┤
│ CC List: user1@, user2@, user3@                     │
├─────────────────────────────────────────────────────┤
│ [Attachments Table]                                  │
│   - patch.diff (review?, ispatch) [view] [details]  │
├─────────────────────────────────────────────────────┤
│ [Comments]                                           │
│ Comment 0 (creation): Original description...        │
│ Comment 1: Additional context...                     │
│ Comment 2: patch attached, r? on reviewer            │
├─────────────────────────────────────────────────────┤
│ [Edit Form]                                          │
│ Add Comment: [textarea]                              │
│ Work Time: [input]                                   │
│ Change fields: [various field inputs]               │
│ [Save Changes] button                               │
└─────────────────────────────────────────────────────┘
```

**UX problems:**
- Massive single-page form — all fields editable at once
- Inline editing uses traditional form POST (full page reload)
- Comments cannot be reordered or threaded
- No real-time collaboration features
- No Markdown rendering

### 5.2 Bug List (`buglist.cgi`)

```
┌──────────────────────────────────────────────────────┐
│ Search: [product=Firefox component=Networking]        │
│ [XX bugs found] [Export CSV] [Export XML] [Atom feed]│
├────┬──────────┬────────────┬─────────┬───────────────┤
│ ID │ Product  │ Component  │ Status  │ Summary       │
├────┼──────────┼────────────┼─────────┼───────────────┤
│ 1  │ Firefox  │ Networking │ NEW     │ ...           │
│ 2  │ Firefox  │ Networking │ FIXED   │ ...           │
└────┴──────────┴────────────┴─────────┴───────────────┘
```

**Features:**
- Configurable columns (stored per-user)
- Sortable by any column
- Paginated
- Multiple export formats (CSV, XML, Atom, JSON)
- "Change columns" dialog (AJAX-powered)

### 5.3 Advanced Search / Query Builder (`query.cgi`)

The most powerful (and complex) UI:

```
Simple Search:
  [Product ▼] [Component ▼] [Status ▼] [Summary contains: ____]

Advanced (Boolean Charts):
  ┌─ Chart 1 ─────────────────────────────────────────┐
  │ [Priority ▼] [is ▼] [Normal ▼] [OR]              │
  │ [Priority ▼] [is ▼] [High ▼]   [AND]             │
  ├────────────────────────────────────────────────────┤
  │ [Status ▼]  [is ▼] [CONFIRMED ▼]                  │
  └────────────────────────────────────────────────────┘
  + [Add another boolean chart]
  
  [Save Query as: ____] [Share with group: ▼]
  [Search] [Reset]
```

**Quicksearch** (power user mode):
```
crash+graphics product:Firefox assignee:developer@example.com
```

### 5.4 Administration Portal (`admin.cgi`)

A text-link-based menu of admin sections:

```
┌────────────────────────────────────────┐
│ Mantis Administration                │
├────────────────────────────────────────┤
│ Parameters     - System configuration  │
│ Users          - User management       │
│ Groups         - Group management      │
│ Products       - Product management    │
│ Components     - Component management  │
│ Versions       - Version management    │
│ Milestones     - Milestone management  │
│ Classifications                        │
│ Field Values                           │
│ Custom Fields                          │
│ Flag Types                             │
│ Keyword Definitions                    │
│ Workflow        - Status transitions   │
│ Sanity Check    - DB integrity checker │
└────────────────────────────────────────┘
```

---

## 6. User Preferences System

**Location**: `userprefs.cgi`, `template/en/default/account/prefs/`

Users can configure (organized in tabs):

### Account Settings
- Real name, login name (email)
- Password change
- API key management

### Email Preferences
Fine-grained matrix of:
- Role (Reporter / Assignee / QA / CC / Watcher)
- Event (comment added, attachment added, status changed, etc.)

```
                Reporter  Assignee  QA Contact  CC  Watcher
Comment Added:  [✓]       [✓]       [✓]         [ ] [✓]
Attachment:     [ ]       [✓]       [✓]         [ ] [ ]
Status Changed: [✓]       [✓]       [✓]         [✓] [✓]
...
```

### General Preferences

| Setting | Options | Default |
|---|---|---|
| Skin | standard, contrib | standard |
| Timezone | (list) | UTC |
| Date format | YYYY-MM-DD, MM/DD/YYYY, etc. | YYYY-MM-DD |
| Comment display | Oldest first, Newest first | Oldest first |
| Remember last query | Yes / No | Yes |
| Default search page | Simple / Advanced | Simple |
| Show my bugs link | Yes / No | Yes |

### Saved Searches
- List of all saved named queries
- Toggle which appear in navigation footer
- Edit/delete queries

### Watched Users
- Add/remove users to watch list (get copies of their notifications)

---

## 7. Accessibility Gaps in the Legacy System

| Issue | Details |
|---|---|
| **No ARIA roles** | Forms and components lack semantic ARIA attributes |
| **Keyboard navigation** | Some UI elements not keyboard-accessible |
| **Color contrast** | Default skin doesn't meet WCAG 2.1 AA |
| **Form labels** | Some form inputs missing explicit `<label>` elements |
| **Error messages** | Not associated with specific fields |
| **Skip navigation** | No "skip to content" links |
| **Focus management** | No focus trap in modals |
| **Mobile responsiveness** | No responsive breakpoints |
| **Screen reader** | Tables lack proper `<th scope>` attributes |
| **Alt text** | Some icons lack descriptive alt text |

---

## 8. Key UX Patterns to Extract

When building the modern replacement, preserve these UX patterns:

1. **Bug ID as primary reference** — every bug has a stable numeric ID
2. **Field-level change history** — users see exactly what changed, when, by whom
3. **CC subscriptions** — granular watch/subscribe model
4. **Flag-based review workflow** — explicit request/grant/deny with requestee targeting
5. **Saved queries with sharing** — team can share standardized views
6. **Email notification matrix** — per-role, per-event email control
7. **Quick access to recently viewed bugs** — "last viewed" tracking
8. **Duplicate detection** — automatic fuzzy match on submission
9. **Dependency chains** — blocks/depends with graph visualization
10. **Bulk edit** — select multiple bugs from list and apply changes
