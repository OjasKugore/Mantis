# 11 — Extension & Plugin System

## 1. Overview

Bugzilla has a sophisticated plugin system called **Extensions** that allows third-party code to augment and modify core behavior without patching core files. The system is built around a **named hook** pattern — the core fires named events, and extensions listen and respond.

---

## 2. Extension Architecture

### 2.1 Extension File Structure

```
extensions/
├── MyExtension/
│   ├── Extension.pm         Required: Main extension class
│   ├── Config.pm            Optional: Configuration class
│   ├── lib/                 Optional: Additional Perl modules
│   ├── template/en/default/ Optional: Template overrides
│   │   └── hook/            Hook-specific template fragments
│   ├── web/                 Optional: Web assets (CSS, JS, images)
│   └── t/                   Optional: Extension-specific tests
```

### 2.2 Minimal Extension

```perl
# extensions/MyExtension/Extension.pm
package Bugzilla::Extension::MyExtension;

use 5.14.0;
use strict;
use warnings;

use base qw(Bugzilla::Extension);

use constant NAME => 'MyExtension';  # Required: extension name

# Hook handler: called when bug_end_of_update hook fires
sub bug_end_of_update {
    my ($self, $args) = @_;
    my $bug     = $args->{bug};
    my $changes = $args->{changes};
    
    # Custom logic here
    if ($changes->{priority}) {
        # Priority was changed - do something
    }
}

__PACKAGE__->NAME;  # Required: return the NAME constant
```

### 2.3 Extension Loading

**Location**: `Bugzilla/Extension.pm`

Extensions are loaded during `Bugzilla->extensions`:

```perl
# In Bugzilla.pm:
sub extensions {
    my $class = shift;
    
    if (!$class->request_cache->{extensions}) {
        # Find all extensions in extensions/ directory
        my @ext_files = glob("extensions/*/Extension.pm");
        
        # Load each extension module
        my @loaded = map { Bugzilla::Extension->load($_) } @ext_files;
        
        # Instantiate each
        $class->request_cache->{extensions} = 
            [map { $_->new() } @loaded];
    }
    
    return $class->request_cache->{extensions};
}
```

---

## 3. Hook Invocation System

**Location**: `Bugzilla/Hook.pm`

```perl
# Core code invokes a hook:
Bugzilla::Hook::process("hook_name", {
    arg1 => $value1,
    arg2 => $value2,
});

# Hook.pm finds all extensions that implement hook_name:
sub process {
    my ($name, $args) = @_;
    foreach my $extension (@{Bugzilla->extensions}) {
        if ($extension->can($name)) {
            $extension->$name($args);
        }
    }
}
```

The `$args` hashref is passed **by reference** — extensions can modify its contents to change the behavior of the calling code.

---

## 4. Complete Hook Reference

**Location**: `Bugzilla/Hook.pm` (47k bytes, 1763 lines of documentation)

### 4.1 Bug Lifecycle Hooks

| Hook Name | When Fired | Args | Purpose |
|---|---|---|---|
| `bug_before_create` | Before bug creation | `{params}` | Validate/modify create params |
| `bug_after_create` | After bug creation | `{bug, params}` | Post-creation actions |
| `bug_check_can_change_field` | During field change permission check | `{bug, field, new_value, priv_results}` | Custom permission rules |
| `bug_columns` | When building bug SELECT columns | `{columns}` | Add custom DB columns |
| `bug_end_of_update` | After bug update committed | `{bug, old_bug, timestamp, changes}` | Post-update actions |
| `bug_end_of_create_auth` | After bug creation auth check | `{bug, params}` | Extra auth validation |
| `bug_fields` | When listing editable fields | `{fields}` | Add custom editable fields |
| `bug_format_comment` | During comment text rendering | `{text, bug, regexes}` | Extend link detection |
| `bug_start_of_update` | Before bug update | `{bug, old_bug, timestamp, changes}` | Pre-update validation |
| `bug_url_sub_classes` | When loading BugUrl classes | `{sub_classes}` | Register new external trackers |

### 4.2 Attachment Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `attachment_process_data` | When processing attachment upload | `{data, attributes}` |
| `attachment_after_create` | After attachment created | `{attachment}` |
| `attachment_end_of_update` | After attachment updated | `{attachment, changes}` |

### 4.3 Auth Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `auth_login_methods` | When listing login methods | `{modules}` |
| `auth_verify_methods` | When listing verify methods | `{modules}` |
| `user_preferences` | When rendering user preferences | `{current_tab, panel, save, tabs}` |

### 4.4 Search Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `search_operator_field_override` | When building search SQL for a field | `{operators, search}` |
| `buglist_columns` | When listing bug list columns | `{columns}` |
| `buglist_column_joins` | When joining for bug list columns | `{column_joins}` |

### 4.5 Email Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `bugmail_recipients` | When computing email recipients | `{bug, recipients, diffs, comments}` |
| `bugmail_relationships` | When listing email relationship types | `{relationships}` |
| `bugmail_referenced_bugs` | When finding referenced bugs | `{referenced_bug_ids, updated_bug}` |
| `mailer_before_send` | Before sending any email | `{email, mailer_args}` |

### 4.6 UI/Template Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `page_before_template` | Before rendering any page template | `{page_id, vars}` |
| `template_before_create` | Before Template Toolkit is instantiated | `{config}` |
| `template_before_process` | Before each template is processed | `{vars, file, context}` |

### 4.7 Admin/Config Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `config_add_panels` | When listing config panels | `{panel_modules}` |
| `config_modify_panels` | After loading config panels | `{panels}` |
| `install_before_final_checks` | Before checksetup final checks | `{silent}` |
| `install_update_db` | During DB schema update | (none) |
| `install_filesystem` | During filesystem permission setup | `{files, recurse_dirs, etc.}` |
| `db_schema_abstract_schema` | When loading schema | `{schema}` |

### 4.8 Flag Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `flag_end_of_update` | After flag changes | `{bug, attachment, timestamp, old_flags, new_flags}` |
| `flagtype_end_of_update` | After flag type changed | `{flagtype, timestamp, changes}` |

### 4.9 WebService/API Hooks

| Hook Name | When Fired | Args |
|---|---|---|
| `webservice` | When loading WebService modules | `{dispatch}` |
| `webservice_error_codes` | When listing error codes | `{error_map}` |
| `webservice_before_call` | Before any WebService method | `{method, full_method}` |
| `webservice_after_call` | After any WebService method | `{method, full_method, result}` |
| `webservice_fix_credentials` | When processing auth credentials | `{params}` |
| `webservice_status_code_map` | When mapping HTTP status codes | `{map}` |

---

## 5. Template Hook System

Extensions can inject content into templates using **template hooks**:

```html
<!-- In a core template (e.g., bug/show.html.tmpl): -->
[% Hook.process("bug-view-comment") %]
```

An extension provides:
```
extensions/MyExtension/template/en/default/hook/bug/show-comment.html.tmpl
```

Content in that file is automatically rendered at that hook point.

**Convention**: Template hook file names follow the pattern:
`hook/{template-path-with-slashes-replaced-by-dashes}.html.tmpl`

---

## 6. Bundled Extensions

### 6.1 BmpConvert

**Location**: `extensions/BmpConvert/`  
**Purpose**: Automatically converts BMP format attachments to PNG

```perl
sub attachment_process_data {
    my ($self, $args) = @_;
    my $attributes = $args->{attributes};
    
    return unless $attributes->{content_type} eq 'image/bmp';
    
    # Convert BMP data to PNG using GD or ImageMagick
    my $png_data = convert_bmp_to_png($args->{data});
    
    $args->{data}            = \$png_data;
    $attributes->{content_type} = 'image/png';
    $attributes->{filename}  =~ s/\.bmp$/.png/i;
}
```

### 6.2 Example

**Location**: `extensions/Example/`  
**Purpose**: Reference implementation demonstrating all available hooks

Every hook in `Bugzilla::Hook` has a sample implementation in `extensions/Example/Extension.pm`. This is the canonical reference for extension developers.

### 6.3 MoreBugUrl

**Location**: `extensions/MoreBugUrl/`  
**Purpose**: Adds additional external issue tracker URL recognizers

Adds support for tracking external bugs in:
- `MoreBugUrl::Chromium` — Chromium issue tracker
- `MoreBugUrl::GetSatisfaction` — GetSatisfaction community forums
- `MoreBugUrl::Remo` — Mozilla Reps portal
- `MoreBugUrl::Yelp` — Yelp issue tracker

```perl
sub bug_url_sub_classes {
    my ($self, $args) = @_;
    my $list = $args->{sub_classes};
    
    push @$list, 
        'Bugzilla::Extension::MoreBugUrl::Chromium',
        'Bugzilla::Extension::MoreBugUrl::GetSatisfaction';
}
```

### 6.4 Voting

**Location**: `extensions/Voting/`  
**Purpose**: Adds a voting system where users can vote on bugs they want fixed

**Database tables added** (via `install_update_db` hook):
```sql
-- Added by Voting extension:
votes:
  bug_id    INT NOT NULL
  who       INT NOT NULL
  vote_count SMALLINT NOT NULL

-- Added to products table:
products.votesperuser    SMALLINT
products.maxvotesperbug  SMALLINT  
products.votestoconfirm  SMALLINT
```

**Features:**
- Users get N votes per product (configured by admin)
- Votes can confirm UNCONFIRMED bugs (if threshold reached)
- Vote counts displayed in bug list and bug view
- Reports on most-voted bugs

### 6.5 OldBugMove

**Location**: `extensions/OldBugMove/`  
**Purpose**: Legacy extension for moving bugs between Bugzilla installations

Adds a "Move this bug to another installation" feature, primarily for inter-organization bug handoff. Uses the XML bug format for transport.

---

## 7. Creating a New Extension

The scaffolding tool `extensions/create.pl` generates the skeleton:

```bash
cd extensions
perl create.pl MyNewExtension

# Creates:
extensions/MyNewExtension/
├── Extension.pm   (with NAME constant and empty stubs)
├── Config.pm      (optional configuration)
└── t/             (test directory)
```

### 7.1 Adding a New Admin Panel

```perl
# In Extension.pm:
sub config_add_panels {
    my ($self, $args) = @_;
    my $modules = $args->{panel_modules};
    $modules->{MyPanel} = "Bugzilla::Extension::MyExt::Config::MyPanel";
}

# In Config/MyPanel.pm:
package Bugzilla::Extension::MyExt::Config::MyPanel;
use parent 'Bugzilla::Config::Section';

use constant NAME => 'MyPanel';
use constant PARAMS => (
    {
        name    => 'my_feature_enabled',
        type    => 'b',          # boolean
        default => 0,
    },
    {
        name    => 'my_api_key',
        type    => 't',          # text
        default => '',
        checker => \&check_string,
    },
);
```

### 7.2 Adding Custom DB Tables

```perl
# Extensions add DB tables via the install_update_db hook:
sub db_schema_abstract_schema {
    my ($self, $args) = @_;
    my $schema = $args->{schema};
    
    $schema->{my_ext_data} = {
        FIELDS => [
            id     => {TYPE => 'INTSERIAL', NOTNULL => 1, PRIMARYKEY => 1},
            bug_id => {
                TYPE => 'INT3',
                REFERENCES => {TABLE => 'bugs', COLUMN => 'bug_id', DELETE => 'CASCADE'}
            },
            data   => {TYPE => 'MEDIUMTEXT'},
        ],
        INDEXES => [
            my_ext_data_bug_id_idx => ['bug_id'],
        ],
    };
}
```

### 7.3 Adding New WebService Methods

```perl
sub webservice {
    my ($self, $args) = @_;
    my $dispatch = $args->{dispatch};
    $dispatch->{MyExt} = 'Bugzilla::Extension::MyExt::WebService';
}

# Now accessible at: /rest/MyExt/mymethod
# or JSON-RPC: MyExt.mymethod
```

---

## 8. Extension Limitations

| Limitation | Details |
|---|---|
| **No hot reload** | Extensions are loaded per-process; changes require server restart |
| **Perl only** | Extensions must be written in Perl |
| **Sequential hooks** | Extensions run in undefined order; no hook priority |
| **No dependency management** | No extension-to-extension dependencies declared |
| **Limited testing** | No isolated test environment for extensions |
| **No marketplace** | No official extension repository or discovery |
| **Template conflicts** | Two extensions providing the same template hook fragment conflict |

---

## 9. Modern Plugin System Design (for Replacement)

For a modern system, the extension system should be redesigned as:

```typescript
// Plugin interface (TypeScript)
interface BugzillaPlugin {
  name: string;
  version: string;
  dependencies?: string[];
  
  // Lifecycle hooks
  onIssueCreate?(context: IssueCreateContext): Promise<void>;
  onIssueUpdate?(context: IssueUpdateContext): Promise<void>;
  onCommentAdd?(context: CommentContext): Promise<void>;
  
  // API extensions
  routes?: Router;          // Additional API routes
  
  // UI extensions  
  panelComponents?: ReactComponent[];  // Sidebar panels
  menuItems?: MenuItem[];              // Nav menu items
  
  // Schema extensions
  customFields?: FieldDefinition[];    // Additional issue fields
  
  // Webhook consumers
  webhooks?: WebhookHandler[];
}

// Plugin registry with dependency resolution and version management
class PluginRegistry {
  register(plugin: BugzillaPlugin): void;
  load(pluginName: string): Promise<BugzillaPlugin>;
  resolve(): BugzillaPlugin[];  // Topological sort by deps
}
```
