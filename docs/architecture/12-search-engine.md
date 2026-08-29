# 12 — Search Engine

## 1. Overview

Mantis's search engine is one of its most powerful features and most complex components. It is implemented primarily in `Mantis/Search.pm` (~110k bytes, ~3562 lines) with supporting modules for specific search modes.

The engine translates a user's multi-field query into SQL, applying security filters, handling custom fields, and supporting Boolean logic with arbitrary nesting.

---

## 2. Search Modes

### 2.1 Simple Search (query.cgi basic mode)

The simplest search: filter by product, component, and status with a keyword match.

```
Product:   [Firefox ▼]
Component: [All ▼]
Status:    [Open bugs ▼]
[Search text]: "crash on startup"
[Search]
```

Translated to:
```sql
SELECT DISTINCT b.bug_id
FROM bugs b
JOIN bugs_fulltext bf ON b.bug_id = bf.bug_id
WHERE b.product_id IN (42)
  AND MATCH(bf.short_desc, bf.comments) AGAINST ('crash on startup' IN BOOLEAN MODE)
  AND b.bug_status IN ('UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS')
ORDER BY b.bug_id DESC
```

### 2.2 Advanced Boolean Chart Search

The full power of the search engine. Users construct arbitrarily complex queries.

**Structure:**
- Multiple **charts** (AND-ed together)
- Each chart has multiple **rows** (AND-ed together)
- Each row has multiple **columns** (OR-ed together)

```
Chart 1:
  Row 1: [Priority is P1] OR [Priority is P2]
  Row 2: [Assigned To contains developer@]

Chart 2:
  Row 1: [Status is CONFIRMED]

Result SQL:
WHERE ((priority = 'P1' OR priority = 'P2') AND assigned_to_login LIKE '%developer@%')
  AND (bug_status = 'CONFIRMED')
```

### 2.3 Quicksearch

**Location**: `Mantis/Search/Quicksearch.pm` (~21k bytes)

A power-user query language that gets converted to a standard boolean chart internally:

```
Syntax examples:
  crash                    → short_desc + comments contain "crash"
  ALL crash graphics       → ALL fields contain both
  product:Firefox          → product name is Firefox
  comp:Networking          → component name is Networking  
  reporter:user@example    → reporter email contains
  assignee:developer@      → assignee email contains
  cc:user@                 → cc list contains
  flag:review+             → has review+ flag
  flagtype:review          → has any review flag
  priority:P1              → priority is P1
  severity:blocker         → severity is blocker
  status:CONFIRMED         → bug status is CONFIRMED
  -status:RESOLVED         → NOT status RESOLVED (negation)
  version:trunk            → version is trunk
  keywords:regression      → has keyword "regression"
  bug#1234                 → specifically bug 1234
  alias:mybug              → alias is "mybug"
  changed:7d               → changed in last 7 days  
  created:2023-01-01       → created after date
  LIMIT 50                 → limit results to 50
```

**Translation logic:**
1. Parse the quicksearch string into tokens
2. For each token, determine if it has a field prefix (e.g., `product:`)
3. Map to appropriate field name and operator
4. Build a standard boolean chart
5. Fall through to the regular search engine

---

## 3. Boolean Chart Internals

### 3.1 Chart Parameters (URL Format)

Boolean charts are represented in URLs as:

```
field-N-M-O = field_name   (chart N, row M, column O)
type-N-M-O  = operator
value-N-M-O = value

# Example:
field-0-0-0 = priority      → Chart 0, Row 0, Col 0: Priority
type-0-0-0  = equals        →   operator: equals
value-0-0-0 = P1            →   value: P1

field-0-0-1 = priority      → Chart 0, Row 0, Col 1: (OR) Priority
type-0-0-1  = equals        →   operator: equals
value-0-0-1 = P2            →   value: P2

field-0-1-0 = bug_status    → Chart 0, Row 1: (AND) Status
type-0-1-0  = equals
value-0-1-0 = CONFIRMED
```

### 3.2 Search Clause Objects

**Location**: `Mantis/Search/Clause.pm`, `Mantis/Search/ClauseGroup.pm`, `Mantis/Search/Condition.pm`

```
ClauseGroup (AND of ClauseGroups and Clauses)
├── Clause (OR of Conditions)
│   ├── Condition(priority = 'P1')
│   └── Condition(priority = 'P2')
└── Clause (single Condition)
    └── Condition(bug_status = 'CONFIRMED')
```

Each `Condition` is eventually translated to SQL:
```sql
(bugs.priority = 'P1')
```

### 3.3 Field → SQL Operator Mapping

The search engine maps field+operator combinations to SQL:

| Operator | SQL Translation |
|---|---|
| `equals` | `= ?` |
| `notequals` | `!= ?` |
| `contains` | `LIKE '%?%'` |
| `notcontains` | `NOT LIKE '%?%'` |
| `substring` | Same as `contains` |
| `casesubstring` | `LIKE '%?%'` (case-sensitive) |
| `regexp` | `REGEXP ?` |
| `notregexp` | `NOT REGEXP ?` |
| `lessthan` | `< ?` |
| `greaterthan` | `> ?` |
| `changedbefore` | `< ?` on delta_ts |
| `changedafter` | `> ?` on delta_ts |
| `isempty` | `= ''` or `IS NULL` |
| `isnotempty` | `!= ''` AND `IS NOT NULL` |
| `anyexact` | `IN (?, ?, ?)` |
| `anywordssubstr` | `LIKE '%w1%' OR LIKE '%w2%'` |
| `allwordssubstr` | `LIKE '%w1%' AND LIKE '%w2%'` |
| `changedto` | Activity log search for change to value |
| `changedby` | Activity log search for change by user |

### 3.4 Special Field Handling

Many fields require special SQL generation beyond simple column comparisons:

**User fields** (assignee, reporter, cc):
```sql
-- CC requires joining the cc table:
JOIN cc ON bugs.bug_id = cc.bug_id
JOIN profiles cc_profile ON cc.who = cc_profile.userid
WHERE cc_profile.login_name LIKE '%user@example%'
```

**Keywords field**:
```sql
JOIN keywords ON bugs.bug_id = keywords.bug_id
JOIN keyworddefs ON keywords.keywordid = keyworddefs.id
WHERE keyworddefs.name = 'regression'
```

**Flags field**:
```sql
JOIN flags ON bugs.bug_id = flags.bug_id
JOIN flagtypes ON flags.type_id = flagtypes.id
WHERE flagtypes.name = 'review' AND flags.status = '+'
```

**Custom multi-select fields**:
```sql
JOIN bug_cf_os_list ON bugs.bug_id = bug_cf_os_list.bug_id
JOIN cf_os_list ON bug_cf_os_list.value_id = cf_os_list.id
WHERE cf_os_list.value = 'Linux'
```

**Change history operators** (changedto/changedby/changedbefore/changedafter):
```sql
JOIN bugs_activity ba ON bugs.bug_id = ba.bug_id
JOIN fielddefs fd ON ba.fieldid = fd.id
WHERE fd.name = 'priority' 
  AND ba.added = 'P1'
  AND ba.who = 42
```

---

## 4. Security Filtering in Search

Every search query has security filtering automatically applied:

```sql
-- The security JOIN (simplified):
SELECT DISTINCT b.bug_id
FROM bugs b
-- Security: restrict to visible groups
LEFT JOIN bug_group_map bgm ON b.bug_id = bgm.bug_id
LEFT JOIN user_group_map ugm 
    ON bgm.group_id = ugm.group_id 
    AND ugm.user_id = {current_user_id}
    AND ugm.isbless = 0
-- ... user search conditions ...
WHERE 
  -- Visibility: no restriction OR user is in the group
  (bgm.group_id IS NULL OR ugm.user_id IS NOT NULL)
  -- ... AND user's boolean chart conditions ...
```

For logged-out users: only bugs with no group restrictions are shown.

---

## 5. Saved Searches

**Location**: `Mantis/Search/Saved.pm`  
**DB Table**: `namedqueries`

### 5.1 Saving a Search

When a user saves a search:
```sql
INSERT INTO namedqueries (userid, name, query)
VALUES (42, 'My P1 Bugs', 'product=Firefox&priority=P1&bug_status=CONFIRMED&...')
```

The `query` field stores the full URL query string that represents the search.

### 5.2 Sharing Searches

Searches can be shared with a group:
```sql
INSERT INTO namedquery_group_map (namedquery_id, group_id)
VALUES (123, 5)
```

Shared searches appear in the footer nav of group members.

### 5.3 Footer Navigation

Users select which searches appear in their navigation footer:
```sql
INSERT INTO namedqueries_link_in_footer (namedquery_id, user_id)
VALUES (123, 42)
```

---

## 6. Recent Searches

**Location**: `Mantis/Search/Recent.pm`  
**DB Table**: Referenced from `profile_search`

Mantis automatically saves the last `SAVE_NUM_SEARCHES = 10` searches per user. These appear in the search page's "Recent Searches" section.

```perl
# When a search is executed:
Mantis::Search::Recent->create({
    user_id => $user->id,
    query   => $query_string,
    list_of_ids => \@result_ids,  # cached result set
});
```

---

## 7. Search Result Formats

`buglist.cgi` supports multiple output formats:

| Format | Content-Type | Description |
|---|---|---|
| `html` | text/html | Default web page with table |
| `csv` | text/csv | Comma-separated export |
| `xml` | text/xml | XML bug dump format |
| `atom` | application/atom+xml | Atom feed (RSS alternative) |
| `json` | application/json | JSON array of bugs |
| `rdf` | application/rdf+xml | RDF format |

### CSV Export Fields
The CSV export includes all selected columns plus additional metadata. Users can configure which columns appear via "Change Columns":

```
Default columns: bug_id, product, component, assigned_to, bug_status, resolution, short_desc, changeddate
```

Users can add: severity, priority, reporter, version, target_milestone, keywords, cc, flags, etc.

### Atom Feed Format

Atom feeds allow subscribing to a search result set in RSS readers:

```xml
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Mantis: P1 Firefox Bugs</title>
  <link href="https://mantis.example.com/buglist.cgi?..."/>
  <updated>2024-01-15T10:00:00Z</updated>
  
  <entry>
    <id>https://mantis.example.com/show_bug.cgi?id=12345</id>
    <title>[Bug 12345] Crash on startup with GPU acceleration</title>
    <link href="https://mantis.example.com/show_bug.cgi?id=12345"/>
    <updated>2024-01-15T09:45:00Z</updated>
    <author><name>developer@example.com</name></author>
    <summary>...</summary>
  </entry>
</feed>
```

---

## 8. Search Performance Analysis

### 8.1 Query Complexity

The search engine can generate very complex SQL:

```sql
-- A typical complex query might look like:
SELECT DISTINCT b.bug_id, b.delta_ts
FROM bugs b
INNER JOIN bugs_fulltext bf ON b.bug_id = bf.bug_id
LEFT JOIN cc cc1 ON b.bug_id = cc1.bug_id AND cc1.who = 42
LEFT JOIN bug_group_map bgm ON b.bug_id = bgm.bug_id
LEFT JOIN user_group_map ugm ON bgm.group_id = ugm.group_id AND ugm.user_id = 42
LEFT JOIN keywords kw ON b.bug_id = kw.bug_id
LEFT JOIN keyworddefs kd ON kw.keywordid = kd.id
LEFT JOIN flags f ON b.bug_id = f.bug_id
LEFT JOIN flagtypes ft ON f.type_id = ft.id
WHERE
  (bgm.group_id IS NULL OR ugm.user_id IS NOT NULL)
  AND MATCH(bf.short_desc) AGAINST ('crash' IN BOOLEAN MODE)
  AND b.priority IN ('P1', 'P2')
  AND (b.bug_status = 'CONFIRMED' OR b.bug_status = 'IN_PROGRESS')
  AND (kd.name = 'regression' OR kd.name = 'crash')
  AND (ft.name = 'review' AND f.status = '+')
ORDER BY b.delta_ts DESC
LIMIT 500
```

### 8.2 Common Performance Problems

1. **Full table scans on `longdescs`**: Searching comment text without full-text index
2. **Large IN clauses**: Many selected products/components
3. **Security JOIN overhead**: Always required even if user has full access
4. **Multi-select field joins**: Each multi-select field requires an additional JOIN
5. **`changedto`/`changedby` operators**: Require scanning `bugs_activity` which can be very large

### 8.3 Available Optimizations

- FULLTEXT indexes on `bugs_fulltext` for text searches
- Covering indexes on `bugs` for common filter combinations
- `DISTINCT` with careful index selection
- Query timeout limits (`CGI_URI_LIMIT` for GET queries)
- Search result pagination (LIMIT/OFFSET)
- Result set caching in `Search::Recent`

---

## 9. Duplicate Detection

**Location**: `Mantis::Bug::possible_duplicates()`

When a user submits a new bug, Mantis automatically searches for potential duplicates:

```perl
sub possible_duplicates {
    my ($class, $params) = @_;
    my $summary = $params->{summary};
    
    # Full-text search against existing open bugs
    my $query = {
        short_desc        => $summary,
        short_desc_type   => 'anywordssubstr',
        resolution        => '',     # Only open bugs
        product_id        => [$params->{product}->id],
    };
    
    my $search = Mantis::Search->new(fields => ['bug_id'], params => $query);
    my ($data) = $search->data;
    
    # Return up to MAX_POSSIBLE_DUPLICATES results
    return Mantis::Bug->new_from_list([
        map { $_->[0] } @{$data}[0..MAX_POSSIBLE_DUPLICATES-1]
    ]);
}
```

---

## 10. Search Plugin System (OpenSearch)

**Location**: `search_plugin.cgi`

Mantis generates an OpenSearch description document, allowing browsers to add Mantis as a built-in search engine:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Mantis</ShortName>
  <Description>Search Mantis bugs</Description>
  <Url type="text/html"
       template="https://mantis.example.com/buglist.cgi?quicksearch={searchTerms}"/>
</OpenSearchDescription>
```

With this, users can type `bz <TAB> <search terms>` in their browser's address bar.

---

## 11. Modern Search Recommendations

For the modernized system:

| Feature | Modern Approach |
|---|---|
| Full-text search | Meilisearch (typo-tolerant) or Elasticsearch |
| Field filtering | Faceted search with live counts |
| Boolean queries | GraphQL-style filter objects + query builder UI |
| Quicksearch | NLP parsing with fallback to structured filters |
| Saved searches | Named views (with subscription/sharing) |
| Search results | Infinite scroll + virtual list for performance |
| Export | Background job for large exports (CSV/Excel) |
| Atom feeds | WebSub (pub/sub push) for real-time feed updates |
| Search analytics | Track common queries to improve relevance |
| Suggestions | Autocomplete for all filterable fields |
| AI search | Semantic/vector similarity search for duplicate detection |
