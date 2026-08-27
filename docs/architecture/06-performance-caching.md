# 06 — Performance & Caching

## 1. Overview

Bugzilla employs several caching and performance mechanisms to handle high-traffic deployments. These range from request-scoped memoization to distributed Memcached clusters to database-side indexing strategies.

---

## 2. Caching Layers

### 2.1 Request-Scoped Cache (`request_cache`)

**Location**: `Bugzilla.pm` — `Bugzilla->request_cache`

Every HTTP request gets a hash reference stored per-request in a process-local variable. This cache is cleared between requests (in mod_perl, via the cleanup handler).

```perl
# Usage in Bugzilla.pm
sub request_cache {
    my $class = shift;
    return $class->process_cache->{request_cache} //= {};
}
```

Objects cached in `request_cache`:
- `dbh` — the active database handle
- `user` — the authenticated `Bugzilla::User` object
- `template` — the Template Toolkit instance
- `cgi` — the CGI object
- `fields` — active custom field definitions
- `extensions` — loaded extension modules
- `params` — system parameters
- `hook_stack` — current hook call stack

**Benefit**: Prevents repeated DB lookups within a single request. A bug page that calls `$bug->product`, `$bug->component`, and `$bug->flags` multiple times only fetches each once.

### 2.2 Process-Level Cache (`process_cache`)

**Location**: `Bugzilla.pm` — `Bugzilla->process_cache`

A hash stored at the mod_perl process level, persisting across requests within the same Apache child process.

```perl
# Survives across requests in mod_perl
our $process_cache = {};
sub process_cache { return $process_cache; }
```

Used to cache:
- Extension object instances (expensive to reload from disk each request)
- Compiled template references

**Benefit**: Extension loading (requiring Perl modules from disk) is expensive. By caching loaded extensions per process, subsequent requests in the same worker are much faster.

### 2.3 Memcached Integration

**Location**: `Bugzilla/Memcached.pm`  
**Perl module**: `Cache::Memcached`

Memcached is an optional distributed key-value cache. When configured, it sits between the application and the database.

**Configuration** (in Bugzilla admin params):
- `memcached_servers` — comma-separated list of `host:port` pairs
- `memcached_namespace` — key prefix to avoid collisions between Bugzilla instances

**What gets cached in Memcached:**
```perl
# From Bugzilla::Object base class:
# Objects with USE_MEMCACHED => 1 are cached by ID and by name
# Examples: Products, Components, Groups, Keywords, Milestones, Versions

# Cache key pattern:
"bugzilla:Product:id:42"
"bugzilla:Product:name:Firefox"
```

**Cache invalidation**: On object update/delete, the `Bugzilla::Object` class automatically clears the relevant Memcached keys.

**Note**: `Bugzilla::Bug` has `USE_MEMCACHED => 0` — bugs are too frequently updated and have too complex a permission model to cache globally. However, individual user last-visit data (`bug_user_last_visit`) is not cached either.

### 2.4 Perl Memoize

**Module**: `Memoize` (standard Perl)

Several pure functions are memoized at the Perl level (in-process, per-request or per-process):

```perl
# In Bugzilla/Constants.pm:
use Memoize;
memoize('bz_locations');

# bz_locations() computes file system paths only once
```

Used for:
- `bz_locations()` — filesystem path computation
- Various configuration lookups that don't change during a request

---

## 3. Database Performance

### 3.1 Connection Management

**Module**: `DBIx::Connector`

`DBIx::Connector` manages database connections with:
- **Connection pooling**: Reuses existing connections
- **Automatic reconnection**: Detects and reconnects on lost connections
- **Ping-on-use**: Validates connection health before each use

```perl
has 'connector' => (is => 'lazy', handles => [qw(dbh)]);

sub _build_connector {
    my ($self) = @_;
    return DBIx::Connector->new(
        $self->dsn,
        $self->user,
        $self->pass,
        $self->attrs
    );
}
```

**Transaction isolation**: `REPEATABLE READ` ensures consistent reads within a transaction, preventing phantom reads during complex bug operations.

### 3.2 Key Database Indexes

The schema defines extensive indexing for all common query patterns:

**`bugs` table indexes:**
```sql
INDEX bugs_assigned_to_idx      (assigned_to)
INDEX bugs_creation_ts_idx      (creation_ts)
INDEX bugs_delta_ts_idx         (delta_ts)
INDEX bugs_bug_severity_idx     (bug_severity)
INDEX bugs_bug_status_idx       (bug_status)
INDEX bugs_op_sys_idx           (op_sys)
INDEX bugs_priority_idx         (priority)
INDEX bugs_product_id_idx       (product_id)
INDEX bugs_reporter_idx         (reporter)
INDEX bugs_version_idx          (version)
INDEX bugs_component_id_idx     (component_id)
INDEX bugs_resolution_idx       (resolution)
INDEX bugs_target_milestone_idx (target_milestone)
INDEX bugs_qa_contact_idx       (qa_contact)
```

**Full-text indexes** (`bugs_fulltext`):
```sql
FULLTEXT INDEX bugs_fulltext_short_desc_idx (short_desc)
FULLTEXT INDEX bugs_fulltext_comments_idx   (comments)
FULLTEXT INDEX bugs_fulltext_comments_noprivate_idx (comments_noprivate)
```

### 3.3 Lazy Loading

All Bugzilla domain objects use **lazy loading** for related data:

```perl
# Bug.pm - comments are loaded only when accessed
sub comments {
    my ($self) = @_;
    return $self->{comments} if exists $self->{comments};
    $self->{comments} = Bugzilla::Comment->match({ bug_id => $self->id });
    return $self->{comments};
}
```

This means retrieving `Bugzilla::Bug->new(12345)` executes only ONE query (the `SELECT * FROM bugs WHERE bug_id = 12345`). Comments, attachments, flags, and other related data are fetched only if accessed.

### 3.4 Bulk Operations

For bulk bug list loading, `Bugzilla::Object->new_from_list()` loads multiple objects with a single `SELECT ... WHERE id IN (...)` query rather than N separate queries.

```perl
# Efficient bulk load
my $bugs = Bugzilla::Bug->new_from_list(\@bug_ids);

# Internally generates:
# SELECT * FROM bugs WHERE bug_id IN (1, 2, 3, ...)
```

---

## 4. Asset Pipeline

### 4.1 CSS/JS Concatenation

**Constant**: `CONCATENATE_ASSETS = 1` (in `Constants.pm`)

When enabled, Bugzilla concatenates multiple CSS and JavaScript files into a single file per page load, reducing HTTP requests:

```
Normal:      page.css + global.css + bug.css = 3 requests
Concatenated: all combined into 1 request with cache headers
```

This is controlled by the `CONCATENATE_ASSETS` constant. Setting to `0` loads files individually (useful for debugging).

### 4.2 Browser Caching

The `.htaccess` file sets long-term cache headers for static assets:

```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css           "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png          "access plus 1 year"
    ExpiresByType image/gif          "access plus 1 year"
</IfModule>
```

Cache busting is done via URL-versioning when assets change.

---

## 5. mod_perl Performance

**Key advantage of mod_perl**: Apache child processes persist between requests, keeping Perl modules compiled in memory.

```
Without mod_perl (CGI):          With mod_perl:
Request 1: Load Perl → Execute  Request 1: Load Perl → Execute
Request 2: Load Perl → Execute  Request 2: [already compiled] → Execute
Request 3: Load Perl → Execute  Request 3: [already compiled] → Execute
```

**`Apache2::SizeLimit`**: Controls max process size to prevent runaway memory usage:
```perl
Apache2::SizeLimit->set_max_unshared_size(250_000);  # 250MB
Apache2::SizeLimit->set_max_requests_per_child(500);  # Recycle after 500 requests
```

### mod_perl Cleanup Handler

Between requests in mod_perl, Bugzilla must reset request-scoped state:

```perl
# mod_perl.pl registers this cleanup handler
sub cleanup_handler {
    Bugzilla::delete_request_cache();
}
```

This clears `request_cache` while keeping `process_cache` (e.g., loaded extensions) alive.

---

## 6. Search Performance

### 6.1 Boolean Chart Query Optimization

The search engine (`Bugzilla::Search`) generates SQL with careful attention to:
- **Security JOINs**: Always joining `bug_group_map` for group access filtering
- **Lazy JOINs**: Only JOINing additional tables when the query actually filters on those fields
- **DISTINCT**: Using `SELECT DISTINCT` to avoid duplicate results from multiple JOINs

### 6.2 Full-Text Search

Full-text search uses database-native FULLTEXT indexes (MySQL/MariaDB FULLTEXT):

```sql
SELECT bug_id FROM bugs_fulltext
WHERE MATCH(short_desc, comments) AGAINST('crash graphics' IN BOOLEAN MODE)
```

The `bugs_fulltext` table is maintained via triggers/application logic whenever comments are added/modified or the bug summary changes.

### 6.3 Quicksearch

`Bugzilla::Search::Quicksearch` provides a simplified search syntax:

```
crash                 → searches short_desc + comments for "crash"
product:Firefox       → product = Firefox
reporter:user@example → reporter email contains user@example
assignee:nobody       → assigned to nobody@mozilla.org
flag:review+          → has review+ flag set
pri:P1                → priority = P1
severity:blocker      → severity = blocker
[status]              → bug_status shortcut
```

This is translated into a standard boolean chart internally.

---

## 7. Reporting Performance

### 7.1 Pre-Aggregated Statistics

`collectstats.pl` runs daily via cron and records the count of bugs matching each saved series query:

```perl
# Stores one row per series per day:
INSERT INTO series_data (series_id, series_date, series_value)
VALUES (42, CURDATE(), <count from series query>)
```

This means chart rendering queries `series_data` (a small table with pre-aggregated counts) rather than running expensive queries over all bugs.

### 7.2 Duplicate Detection

`Bugzilla::Bug->possible_duplicates()` uses full-text search to find potential duplicates when submitting a new bug. It searches `bugs_fulltext` using the new bug's summary text, returning up to `MAX_POSSIBLE_DUPLICATES` results.

---

## 8. Performance Bottlenecks in the Legacy System

| Bottleneck | Description | Impact |
|---|---|---|
| **Perl CGI startup overhead** | Without mod_perl, every request reloads all Perl modules | Very high — ~0.5-2s per request |
| **N+1 queries** | Some views (bug list) make additional queries per row | High for large result sets |
| **No HTTP/2** | Old server config, no server push | Medium |
| **Synchronous email** | Without jobqueue, email blocks HTTP response | Medium-high |
| **No query result caching** | Search results not cached; same query re-runs each time | Medium |
| **Template compilation** | Templates compiled to Perl on each process startup | Low (compiled once per process) |
| **Large binary blobs** | Attachments stored in DB (`attach_data.thedata`) | Medium — bypasses OS file cache |
| **Binary in DB** | Attachments not stored on filesystem or CDN | Limits scalability |

---

## 9. Recommended Modern Performance Improvements

For a modern replacement system:

| Improvement | Technology | Expected Gain |
|---|---|---|
| **Connection pooling** | PgBouncer / RDS Proxy | Eliminates connection overhead |
| **Query result caching** | Redis with TTL | Eliminates repeated identical queries |
| **Attachment offloading** | AWS S3 / GCS / Azure Blob | Eliminates DB blob reads |
| **Read replicas** | PostgreSQL streaming replication | Scales read-heavy workloads |
| **Database indexing** | Partial indexes, covering indexes | Speeds filtered searches |
| **API response caching** | HTTP cache-control headers + CDN | Eliminates origin load |
| **Background everything** | Queue all emails, notifications | Sub-100ms HTTP responses |
| **Search indexing** | Elasticsearch / OpenSearch | Full-text search at scale |
| **Compiled assets** | Webpack/Vite bundle | Minimal frontend payload |
| **HTTP/2 + compression** | nginx with gzip/brotli | Faster asset delivery |
