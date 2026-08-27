# Bugzilla

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-blue.svg)](https://opensource.org/licenses/MPL-2.0)
[![Perl Version](https://img.shields.io/badge/Perl-5.14.0%2B-39457E.svg)](https://www.perl.org/)
[![Database Support](https://img.shields.io/badge/Databases-MariaDB%20|%20MySQL%20|%20PostgreSQL%20|%20Oracle%20|%20SQLite-brightgreen.svg)](#complete-technology-stack)
[![API Support](https://img.shields.io/badge/APIs-REST%20|%20JSON--RPC%202.0%20|%20XML--RPC-orange.svg)](#web-services--api-integration)

**Bugzilla** is a mature, enterprise-grade defect tracking, issue management, and workflow automation system originally developed by the Mozilla Foundation and maintained by a global community of developers. Powering major open-source projects (such as Mozilla Firefox, Linux Kernel bug trackers, Eclipse, LibreOffice, and Apache infrastructure) as well as commercial enterprise software teams worldwide, Bugzilla provides comprehensive lifecycle management for defects, feature requests, and complex software delivery pipelines.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Features & Capabilities](#key-features--capabilities)
- [Complete Technology Stack](#complete-technology-stack)
- [Repository Structure](#repository-structure)
- [Quick Start with Docker](#quick-start-with-docker)
- [Native Installation & Setup](#native-installation--setup)
- [Web Services & API Integration](#web-services--api-integration)
- [Background Daemons & Scheduled Tasks](#background-daemons--scheduled-tasks)
- [Extension & Plugin Architecture](#extension--plugin-architecture)
- [Authentication & Directory Integration](#authentication--directory-integration)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Security Model & Hardening](#security-model--hardening)
- [License & Community](#license--community)

---

## Overview & Architecture

Bugzilla is designed with an MVC-style layered architecture written in Object-Oriented Perl:

```
                      +------------------------------------------+
                      |         Web Browsers & API Clients       |
                      +------------------------------------------+
                                           |
                                  HTTP(S) / REST / RPC
                                           v
                      +------------------------------------------+
                      |       Web Server (Apache / mod_perl)     |
                      +------------------------------------------+
                                           |
                      +------------------------------------------+
                      |    Entrypoint Layer (*.cgi / *.pl)       |
                      |  show_bug.cgi, rest.cgi, enter_bug.cgi   |
                      +------------------------------------------+
                                           |
        +----------------------------------+----------------------------------+
        |                                  |                                  |
        v                                  v                                  v
+---------------+                +-------------------+               +------------------+
| Presentation  |                |  Business Logic   |               | Extension Hooks  |
| (Template     | <------------> |  (Bugzilla::Bug,  | <-----------> | (Bugzilla::Hook, |
|  Toolkit 3.x) |                |   User, Field)    |               |  extensions/*)   |
+---------------+                +-------------------+               +------------------+
                                           |
        +----------------------------------+----------------------------------+
        |                                  |                                  |
        v                                  v                                  v
+---------------+                +-------------------+               +------------------+
| Auth Layer    |                | Database Layer    |               | Async Job Queue  |
| (DB, LDAP,    |                | (Bugzilla::DB,    |               | (TheSchwartz,    |
|  RADIUS, Env) |                |  DBI / Connector) |               |  jobqueue.pl)    |
+---------------+                +-------------------+               +------------------+
                                           |
                                           v
                       +---------------------------------------+
                       | MariaDB / MySQL / PostgreSQL / Oracle |
                       +---------------------------------------+
```

1. **Routing & Dispatch Layer**: CGI and REST/RPC endpoints receive requests, manage HTTP sessions, and perform authentication and authorization.
2. **Business Domain Objects**: High-performance domain models (`Bugzilla::Bug`, `Bugzilla::User`, `Bugzilla::Product`, `Bugzilla::Component`, `Bugzilla::Attachment`, `Bugzilla::Flag`) enforce permissions, workflow rules, field validation, and change audit logging.
3. **Persistence & Database Abstraction**: An abstraction layer (`Bugzilla::DB`) built on DBI and `DBIx::Connector` provides unified SQL dialect translation, schema auto-migration, and query optimization across multiple RDBMS engines.
4. **Presentation Engine**: Template Toolkit (`Template::Toolkit`) separates all presentation markup, HTML, JavaScript templates, and localized language packs from business logic.
5. **Asynchronous Background Processing**: A distributed worker framework (`TheSchwartz`) handles deferred email delivery, notification fan-outs, and heavy background jobs without blocking HTTP transactions.

---

## Key Features & Capabilities

### 1. Defect & Workflow Management
- **Customizable State Machines**: Define fine-grained status transitions (`UNCONFIRMED` -> `CONFIRMED` -> `IN_PROGRESS` -> `RESOLVED` -> `VERIFIED` -> `CLOSED`) with conditional transition rules.
- **Resolution Control**: Customizable resolutions (`FIXED`, `INVALID`, `WONTFIX`, `DUPLICATE`, `WORKSFORME`, `INCOMPLETE`).
- **Dependencies & Blocking Trees**: Full tracking of `depends_on` and `blocks` relationships with visual dependency tree exploration and Graphviz dependency charts (`showdependencygraph.cgi`, `showdependencytree.cgi`).
- **Milestones & Version Tracking**: Product-level target milestones, release versions, and component structures with dedicated classification hierarchies (`Classification` -> `Product` -> `Component`).

### 2. Custom Fields & Extensibility
- **Dynamic Field Types**: Free text, single-select dropdowns, multi-select lists, text areas, date/time pickers, bug IDs, and external URL references.
- **Conditional Visibility**: Show or mandate custom fields based on product, component, or the value of other fields.
- **Audit Trails & Activity Logs**: Complete history tracking for every change on every field (`show_activity.cgi`) with exact attribution, timestamping, and diff tracking.

### 3. Review & Approval Flags
- **Flag Types**: Attachment-level and bug-level flags for code reviews, patches, information requests, and release tracking (e.g. `review?`, `approval+`, `needinfo?`).
- **Requestee Targeting**: Assign flag requests to specific team members or leave them open to group queues.

### 4. Advanced Search & Query Builder
- **Boolean Search Engine**: Build nested Boolean query trees (AND / OR / NOT) across all native and custom fields.
- **Quicksearch Syntax**: Power-user query shortcuts and macro expansions.
- **Saved Searches & Shared Queries**: Save, organize, subscribe to, and share search queries.
- **Custom Columns & Export**: Configure visible columns in search results; export results in CSV, XML, Atom feeds, or JSON.

### 5. Analytics, Reporting & Visualization
- **Multi-Dimensional Reports**: Tabular matrix reports (Rows vs. Columns vs. Tables) for multi-variable bug distribution analysis.
- **Graphical Charts**: 2D/3D Bar charts, Line graphs, and Pie charts powered by `GD` and `Chart::Lines`.
- **Trend & Historical Analysis**: Scheduled statistical snapshots collected via `collectstats.pl` for tracking resolution velocity and backlog growth over time.

### 6. Communication, Whining & Inbound Email
- **Granular Email Preferences**: Per-user event subscription matrices (receive emails only for specific roles: Reporter, Assignee, QA, CC, or Watcher, and specific change types).
- **Scheduled Nagging ("Whining")**: Automated query-driven reminders (`whine.pl`) sent to assignees or groups on custom cron schedules.
- **Inbound Email Gateway (`email_in.pl`)**: Create bugs and post comments directly by parsing inbound emails or replying to notifications.

### 7. Cross-Tracker Bug Linking (`BugUrl`)
- Built-in recognition and bidirectional hyperlinking with external issue trackers, including:
  - GitHub (`BugUrl::GitHub`)
  - GitLab / Google Code (`BugUrl::Google`)
  - Atlassian JIRA (`BugUrl::JIRA`)
  - Launchpad (`BugUrl::Launchpad`)
  - Trac (`BugUrl::Trac`)
  - MantisBT (`BugUrl::MantisBT`)
  - Debian BTS (`BugUrl::Debian`)
  - Other Bugzilla instances (`BugUrl::Bugzilla`)

---

## Complete Technology Stack

| Layer | Technology / Module | Description |
|---|---|---|
| **Core Runtime** | **Perl 5** (`>= 5.14.0`, tested on 5.34/5.38/5.40) | Object-oriented backend utilizing `Moo`, `List::MoreUtils`, `DateTime`, `Digest::SHA` |
| **Web Server** | **Apache HTTP Server 2.4+** | Optimized for `mod_perl2` (`Apache2::SizeLimit`) with support for prefork MPM and CGI |
| **Templating Engine** | **Template Toolkit 3** (`Template::Toolkit`) | Fast, secure template evaluation with custom plugins (`Bugzilla::Template`) and auto-escaping |
| **Database Abstraction** | **DBI** & **DBIx::Connector** | Connection management, dynamic SQL generation, and cross-RDBMS schema upgrades |
| **Supported Databases** | MariaDB, MySQL, PostgreSQL, Oracle, SQLite | Supported via `DBD::MariaDB`, `DBD::mysql`, `DBD::Pg`, `DBD::Oracle`, `DBD::SQLite` |
| **Asynchronous Queue** | **TheSchwartz** & **Daemon::Generic** | Reliable database-backed asynchronous worker daemon (`jobqueue.pl`) |
| **Frontend / Assets** | Vanilla JavaScript, HTML5, CSS3 | Custom UI controllers (`js/field.js`, `js/bug.js`, etc.), dynamic form validation, skinning engine |
| **Asset Pipeline** | Runtime Concatenator & Minifier | Dynamic asset concatenation and caching controlled by `CONCATENATE_ASSETS` |
| **Caching Layer** | **Memcached** (`Cache::Memcached`) | High-performance distributed key-value cache with internal memory memoization (`Memoize`) |
| **APIs & Protocols** | REST, JSON-RPC 2.0, XML-RPC | Supported via `JSON::RPC`, `JSON::XS`, `SOAP::Lite`, `XMLRPC::Lite` |
| **Authentication** | Local DB, LDAP, Active Directory, RADIUS, Env | Supported via `Net::LDAP`, `Authen::Radius`, `Authen::SASL`, HTTP Header Auth |
| **Email Processing** | `Email::Sender`, `Email::MIME`, `Email::Reply` | Outbound multi-transport dispatch (Sendmail, SMTP, SMTP-SSL) and inbound MIME parsing |
| **Graphics & Charts** | `GD`, `GD::Graph`, `GD::Text`, `Chart::Lines` | Server-side chart generation and dependency rendering via Graphviz (`dot`) |
| **Patch & Diff Viewer**| `PatchReader`, `patchutils` | Colorized side-by-side and unified patch diff rendering |
| **Security & RNG** | `Math::Random::ISAAC`, `Digest::SHA` | Cryptographically secure pseudo-random number generator for tokens and salts |
| **Containerization** | Docker, Docker Compose | Official container images based on Ubuntu LTS with automated database provisioning |

---

## Repository Structure

```
bugzilla/
├── Bugzilla/                   # Core application Perl modules (Object-Oriented Domain Layer)
│   ├── Attachment/             # Attachment handlers, storage backends & patch parsing
│   ├── Auth/                   # Authentication & verification providers (DB, LDAP, RADIUS, Stack)
│   ├── BugUrl/                 # Cross-tracker integrators (GitHub, JIRA, Launchpad, Trac, etc.)
│   ├── DB/                     # Database drivers (MariaDB.pm, Mysql.pm, Pg.pm, Oracle.pm, Sqlite.pm)
│   │   └── Schema.pm           # Canonical schema definition and automated table migrations
│   ├── Install/                # Installation routines, system checks & requirements (Requirements.pm)
│   ├── Job/ & JobQueue/        # Asynchronous job definitions (BugMail, Mailer, etc.)
│   ├── Search/                 # Search engine implementation, quicksearch & boolean clauses
│   ├── Sender/                 # Outbound email dispatchers (Sendmail, SMTP, Sendmail::SSL)
│   ├── Template/               # Template Toolkit plugins, context providers and filters
│   ├── WebService/             # Web API services (REST, JSON-RPC, XML-RPC handlers)
│   │   └── Server/             # REST.pm, JSONRPC.pm, XMLRPC.pm protocol servers
│   ├── Bug.pm                  # Central Bug domain model (validation, creation, update, fields)
│   ├── Constants.pm            # System-wide configuration constants & status flags
│   ├── DB.pm                   # Base database abstraction layer
│   ├── Field.pm                # Custom field engine & selection value controller
│   ├── Group.pm                # Access control list (ACL) and group security management
│   ├── Hook.pm                 # Pluggable extension hook invocation manager
│   ├── Object.pm               # Base class for all persisted domain entities
│   ├── User.pm                 # User accounts, preferences, credentials & permissions
│   └── Util.pm                 # Formatting, validation, string manipulation & crypto utilities
├── template/en/default/        # Template Toolkit presentation layer
│   ├── account/                # User login, registration, password reset templates
│   ├── admin/                  # Administrative management consoles (products, groups, flags, etc.)
│   ├── attachment/             # Attachment upload, details, and diff view templates
│   ├── bug/                    # Bug view, creation, activity log, and workflow templates
│   ├── email/                  # Inbound and outbound email notification templates
│   ├── global/                 # Universal headers, footers, breadcrumbs, banners, message boxes
│   ├── list/                   # Bug list search results, table formatters, column selectors
│   ├── reports/                # Tabular reports, graphical charts, and milestone summaries
│   └── request/                # Review and flag request queues
├── js/                         # Client-side JavaScript controllers and utilities
│   ├── bug.js                  # Dynamic bug view interactivity, comment collapsing
│   ├── field.js                # Custom field dynamic visibility and value synchronization
│   ├── custom-search.js        # Dynamic boolean query builder UI
│   └── comment-tagging.js      # Inline comment tagging and filtering
├── skins/                      # Themes, CSS stylesheets, and visual skins
│   ├── standard/               # Default production stylesheet suite
│   └── contrib/                # Contributed and high-contrast skin alternatives
├── extensions/                 # Pluggable modular extensions
│   ├── BmpConvert/             # Automatically convert BMP attachments to PNG
│   ├── Example/                # Reference extension showing UI and backend hooks
│   ├── MoreBugUrl/             # Extended bug URL providers
│   ├── Voting/                 # Bug voting and popularity scoring system
│   └── create.pl               # Scaffold tool to create a new Bugzilla extension
├── docs/                       # Comprehensive documentation (reStructuredText & Sphinx)
│   └── en/rst/                 # User guides, administration manuals, API references, installation docs
├── docker/                     # Docker container configuration, entrypoints & Apache setup
│   ├── 000-default.conf        # Apache virtual host configuration
│   └── startup.sh              # Container startup & auto-provisioning orchestrator
├── contrib/                    # Auxiliary scripts, shell completions & developer utilities
├── t/ & xt/                    # Unit, regression, compilation, and code quality test suites
│
├── *.cgi                       # Web Entrypoint CGI Scripts
│   ├── show_bug.cgi            # Display and edit bug records
│   ├── enter_bug.cgi           # Bug creation step-by-step wizard
│   ├── post_bug.cgi            # Form handler for bug submission
│   ├── process_bug.cgi         # Form handler for bug updates and transitions
│   ├── buglist.cgi             # Bug query execution and search results view
│   ├── query.cgi               # Search query generator (simple & advanced modes)
│   ├── attachment.cgi          # Attachment downloader, uploader, and patch viewer
│   ├── rest.cgi                # RESTful Web Service gateway
│   ├── jsonrpc.cgi             # JSON-RPC 2.0 Web Service gateway
│   ├── xmlrpc.cgi              # XML-RPC Web Service gateway
│   ├── admin.cgi               # Administration landing portal
│   ├── userprefs.cgi           # User preferences and API key management
│   ├── chart.cgi / report.cgi  # Statistical and graphical reporting consoles
│   └── request.cgi             # Review flag approval queue
│
├── *.pl                        # CLI Utilities & Maintenance Daemons
│   ├── checksetup.pl           # System setup, dependency checker, schema migrator & admin creator
│   ├── jobqueue.pl             # Asynchronous background job daemon (TheSchwartz runner)
│   ├── whine.pl                # Scheduled query-based email reminder ("whining") daemon
│   ├── collectstats.pl         # Scheduled daily bug statistics collector for historical charts
│   ├── email_in.pl             # Inbound email processing gateway (pipe from MTA)
│   ├── importxml.pl            # XML-based bug import and migration tool
│   ├── install-module.pl       # Automated CPAN module installer for Bugzilla dependencies
│   ├── migrate.pl              # Database engine migration tool (e.g. MySQL -> PostgreSQL)
│   ├── sanitycheck.pl / .cgi   # Database integrity checker and consistency validator
│   └── runtests.pl             # Test suite execution runner
│
├── Dockerfile                  # Container definition based on Ubuntu 24.04 LTS
├── docker-compose.yml          # Multi-container orchestration (Bugzilla Web + MariaDB)
└── README.md                   # Repository documentation
```

---

## Quick Start with Docker

The fastest way to spin up a fully functioning Bugzilla instance with an isolated database is using Docker Compose.

### 1. Launch Containers
```bash
docker compose up
```

### 2. Access the Application
Once `checksetup.pl` finishes provisioning the database schema, the terminal displays the connection details:

- **Web URL**: `http://127.0.0.1:8080/`
- **Default Administrator**: `admin@bugzilla.test`
- **Default Password**: `password01!`

### 3. Environment Variables
You can customize the deployment in `docker-compose.yml` or via environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `BZ_ADMIN_EMAIL` | `admin@bugzilla.test` | Initial administrator account email |
| `BZ_ADMIN_PASSWORD` | `password01!` | Initial administrator password |
| `BZ_ADMIN_REALNAME` | `Test Admin` | Initial administrator real name |
| `BZ_URLBASE` | `http://127.0.0.1:8080/` | Canonical base URL for Bugzilla links |
| `BZ_DB_HOST` | `bugzilla5.db` | Hostname of database container |
| `BZ_DB_PORT` | `3306` | Port of database service |
| `BZ_DB_NAME` | `bugs` | Database name |
| `BZ_DB_USER` | `bugs` | Database username |
| `BZ_DB_PASS` | `bugzilla` | Database password |
| `BZ_ALLOW_UNSAFE_UTF8_CONVERSION` | `0` | Set to `1` to permit automated non-interactive UTF-8 schema conversion |

---

## Native Installation & Setup

### Prerequisites
- **Operating System**: Linux (Ubuntu, Debian, RHEL, Fedora, openSUSE), macOS, or FreeBSD
- **Perl**: 5.14.0 or newer
- **Database Server**: MariaDB (10.0+), MySQL (5.0.15+), PostgreSQL (8.3+), or Oracle (10.01.0+)
- **Web Server**: Apache HTTP Server 2.4+ (with `mod_perl` or `mod_cgi`, `mod_rewrite`, `mod_headers`, `mod_expires`)

### Step 1: Clone the Repository
```bash
git clone https://github.com/bugzilla/bugzilla.git /var/www/html/bugzilla
cd /var/www/html/bugzilla
```

### Step 2: Verify and Install Perl Dependencies
Run `checksetup.pl` to inspect installed modules:
```bash
perl checksetup.pl --check-modules
```

To install all required and optional Perl modules automatically via CPAN:
```bash
perl install-module.pl --all
```

Or install distribution packages (e.g., Debian/Ubuntu):
```bash
sudo apt-get install \
    apache2 libapache2-mod-perl2 libdbi-perl libdbd-mariadb-perl \
    libtemplate-perl libemail-sender-perl libemail-mime-perl \
    libmath-random-isaac-perl libjson-rpc-perl libchart-perl \
    libgd-graph-perl libtheschwartz-perl graphviz
```

### Step 3: Configure Database and Parameters
Run `checksetup.pl` once to generate the `localconfig` file:
```bash
perl checksetup.pl
```

Edit `localconfig` with your database credentials and web server group:
```perl
$webservergroup = 'www-data';
$db_driver      = 'MariaDB';    # 'mysql', 'Pg', 'Oracle', or 'SQLite'
$db_host        = 'localhost';
$db_name        = 'bugs';
$db_user        = 'bugs';
$db_pass        = 'your_strong_password';
$db_port        = 0;
```

### Step 4: Run Final Setup & Schema Initialization
Execute `checksetup.pl` again to build tables, set file permissions, compile templates, and prompt for the administrator credentials:
```bash
perl checksetup.pl
```

### Step 5: Configure Apache HTTP Server
Enable required Apache modules:
```bash
sudo a2enmod rewrite headers expires cgi
```

Configure a virtual host (e.g., `/etc/apache2/sites-available/bugzilla.conf`):
```apache
<VirtualHost *:80>
    ServerName bugzilla.example.com
    DocumentRoot /var/www/html/bugzilla

    <Directory /var/www/html/bugzilla>
        AddHandler cgi-script .cgi
        Options +ExecCGI +FollowSymLinks
        DirectoryIndex index.cgi index.html
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/bugzilla_error.log
    CustomLog ${APACHE_LOG_DIR}/bugzilla_access.log combined
</VirtualHost>
```

Enable the site and restart Apache:
```bash
sudo a2ensite bugzilla.conf
sudo systemctl restart apache2
```

---

## Web Services & API Integration

Bugzilla provides three synchronous Web Service APIs: **RESTful JSON API**, **JSON-RPC 2.0**, and **XML-RPC**.

### Authentication Options
1. **API Key (Recommended)**: Pass via query parameter `?api_key=KEY`, header `X-BUGZILLA-API-KEY: KEY`, or JSON payload `{"api_key": "KEY"}`. Generate keys in **User Preferences -> API Keys**.
2. **Login / Password Basic Auth**: Standard HTTP Basic Authentication or parameters `Bugzilla_login` & `Bugzilla_password`.
3. **Session Cookie / Token**: Obtain a login token via `GET /rest/login`.

### Key REST Endpoints (`/rest/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rest/version` | Returns the Bugzilla server version |
| `GET` | `/rest/bug/{id}` | Retrieve comprehensive bug details, fields, and history |
| `POST` | `/rest/bug` | Create a new bug |
| `PUT` | `/rest/bug/{id}` | Update fields, add comments, change status, or assignees |
| `GET` | `/rest/bug/{id}/comment` | Retrieve all comments and attachments on a bug |
| `POST` | `/rest/bug/{id}/comment` | Add a new comment or tag existing comments |
| `GET` | `/rest/bug/{id}/attachment`| Retrieve attachments and metadata |
| `POST` | `/rest/bug/{id}/attachment`| Upload a new base64-encoded attachment or patch |
| `GET` | `/rest/user` | Search and inspect user accounts and profile data |
| `GET` | `/rest/product` | List accessible products, components, versions, and milestones |
| `GET` | `/rest/field/bug/{field_name}` | Retrieve legal values and dependencies for a field |

#### Example: Create a Bug using cURL
```bash
curl -X POST "https://bugzilla.example.com/rest/bug" \
     -H "Content-Type: application/json" \
     -H "X-BUGZILLA-API-KEY: your_api_key_here" \
     -d '{
       "product": "CoreProduct",
       "component": "Backend",
       "summary": "Database connection timeout under heavy load",
       "version": "1.0",
       "description": "Observed intermittent timeout during peak traffic window.",
       "op_sys": "Linux",
       "platform": "PC",
       "priority": "High",
       "severity": "major"
     }'
```

---

## Background Daemons & Scheduled Tasks

Bugzilla includes automated daemons and maintenance scripts that should be configured via `systemd` or `cron`.

### 1. Asynchronous Job Queue (`jobqueue.pl`)
Processes outbound notification emails, external tracker webhooks, and long-running operations asynchronously using `TheSchwartz`:
```bash
# Run in foreground / development
perl jobqueue.pl run

# Run as background daemon
perl jobqueue.pl start
```

### 2. Scheduled Whining / Reminders (`whine.pl`)
Evaluates user-configured search alerts and sends scheduled summary emails:
```bash
# Add to crontab to run every 15 minutes:
*/15 * * * * cd /var/www/html/bugzilla && perl whine.pl
```

### 3. Historical Statistics Collection (`collectstats.pl`)
Snapshots bug counts and status distributions to generate historical trend graphs:
```bash
# Add to crontab to run daily at midnight:
0 0 * * * cd /var/www/html/bugzilla && perl collectstats.pl
```

### 4. Inbound Email Processor (`email_in.pl`)
Integrate with an MTA (Postfix, Sendmail, Exim) to convert incoming emails into bug comments or new bug filings:
```bash
# Example Postfix alias:
# bugzilla-submit: "|/var/www/html/bugzilla/email_in.pl"
```

---

## Extension & Plugin Architecture

Bugzilla provides a modular extension system located in `extensions/`. Extensions can alter data models, inject custom HTML/CSS/JS into templates, listen to lifecycle hooks, and expose new REST endpoints.

### Creating a New Extension
Use the built-in scaffolding tool:
```bash
cd extensions/
perl create.pl MyCustomExtension
```

This creates an extension directory containing:
- `Extension.pm`: Main class defining metadata and hooking into lifecycle events (`bug_start_of_update`, `object_before_create`, etc.).
- `template/`: Overrides and template hooks injected into existing UI views.
- `web/`: Custom static CSS, JavaScript, and asset files.
- `Config.pm`: Extension-specific configuration parameters editable via the Bugzilla Admin UI.

---

## Authentication & Directory Integration

Bugzilla supports multiple authentication and authorization providers configured under **Administration -> Parameters -> Authentication**:

- **Database (`DB`)**: Local user accounts with secure salted password hashing (`Math::Random::ISAAC` and `Digest::SHA`).
- **LDAP / Active Directory (`LDAP`)**: Query remote directory servers for authentication and attribute mapping (UID, email, real name).
- **RADIUS (`RADIUS`)**: Authenticate against enterprise RADIUS AAA servers.
- **Environment / Web Server Auth (`Env`)**: Delegate authentication to the web server (enabling Kerberos, SAML, OpenID Connect, OAuth2 via reverse proxy headers).
- **Stacking**: Multiple providers can be stacked in priority sequence (e.g., attempt LDAP first; fall back to local DB).

---

## Testing & Quality Assurance

Bugzilla includes automated test suites covering compilation, unit tests, web service contracts, and code formatting:

```bash
# Run all core tests
perl runtests.pl

# Run a specific test with prove
prove -l t/001compile.t
prove -l t/008filter.t

# Run WebService test suite
prove -l t/011pod.t
```

---

## Security Model & Hardening

- **Access Controls & Group Blessings**: Product and component isolation through group restriction maps (`NA`, `SHOWN`, `DEFAULT`, `MANDATORY`).
- **CSRF & XSS Prevention**: Cryptographic request tokens on all state-changing forms and automatic HTML filtering via Template Toolkit.
- **SQL Injection Prevention**: 100% parameterized SQL execution with placeholder binding across all query paths.
- **Taint Mode**: Strict Perl taint mode (`-T`) execution to prevent unsanitized user inputs from reaching shell or filesystem operations.
- **Password Policies**: Configurable minimum length, complexity checks, account lockout thresholds after failed attempts, and rate limiting.

### Reporting Security Vulnerabilities
Security vulnerabilities should be reported directly to the [Mozilla Bugzilla Security Team](https://bugzilla.mozilla.org/enter_bug.cgi?product=Bugzilla) with the security flag enabled to ensure embargoed handling.

---

## License & Community

- **License**: [Mozilla Public License, version 2.0 (MPL-2.0)](LICENSE).
- **Official Website**: [https://www.bugzilla.org/](https://www.bugzilla.org/)
- **Documentation**: [https://www.bugzilla.org/docs/](https://www.bugzilla.org/docs/)
- **Community Forum & Mailing Lists**: [Mozilla Bugzilla Discourse](https://discourse.mozilla.org/c/bugzilla)
- **IRC / Matrix**: `#bugzilla` on Matrix / IRC.
