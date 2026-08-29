# 04 — API & Web Services

## 1. Overview

Mantis exposes three API protocols, all served from the same application:

| Protocol | Endpoint | Gateway File |
|---|---|---|
| **REST** | `/rest/*` | `rest.cgi` → `Mantis::WebService::Server::REST` |
| **JSON-RPC 2.0** | `/jsonrpc.cgi` | `jsonrpc.cgi` → `Mantis::WebService::Server::JSONRPC` |
| **XML-RPC** | `/xmlrpc.cgi` | `xmlrpc.cgi` → `Mantis::WebService::Server::XMLRPC` |

All three protocols share the same underlying `Mantis::WebService::*` modules, with only serialization/deserialization differing.

---

## 2. REST API

**Base URL**: `http://your-mantis.com/rest/`  
**Authentication**: Via `X-BUGZILLA-API-KEY` header, or `login`/`password` query params  
**Format**: JSON request/response bodies  
**Documentation**: https://mantis.readthedocs.org/en/5.0/api/

### 2.1 REST URL Structure

```
/rest/{resource}/{id?}/{sub-resource?}
GET    /rest/bug/12345           → Get bug
PUT    /rest/bug/12345           → Update bug
POST   /rest/bug                 → Create bug
GET    /rest/bug/12345/comment   → Get comments
POST   /rest/bug/12345/comment   → Add comment
GET    /rest/bug/12345/history   → Get change history
GET    /rest/bug/12345/attachment → Get attachments
POST   /rest/bug/12345/attachment → Add attachment
GET    /rest/user/12345          → Get user
PUT    /rest/user/12345          → Update user
GET    /rest/product             → List products
GET    /rest/product/12          → Get product
GET    /rest/group               → List groups
GET    /rest/flag_type           → List flag types
GET    /rest/field/bug           → List bug fields
GET    /rest/field/bug/status    → Get field details
GET    /rest/mantis/version    → Get Mantis version
```

### 2.2 Authentication Methods

```
# API Key (recommended)
GET /rest/bug/12345
X-BUGZILLA-API-KEY: your-api-key-here

# URL parameter (less secure, avoid)
GET /rest/bug/12345?api_key=your-api-key-here

# Login/password (basic, deprecated for automation)
GET /rest/bug/12345?login=user@example.com&password=secret
```

---

## 3. WebService Module Structure

**Location**: `Mantis/WebService/`

```
Mantis::WebService (base class)
├── Mantis::WebService::Bug           (bug CRUD, search, attachments, comments)
├── Mantis::WebService::Mantis      (system info, version, timezone)
├── Mantis::WebService::Classification (classification listing)
├── Mantis::WebService::Component     (component listing)
├── Mantis::WebService::Constants     (shared constants)
├── Mantis::WebService::FlagType      (flag type listing)
├── Mantis::WebService::Group         (group management)
├── Mantis::WebService::Product       (product listing/management)
├── Mantis::WebService::User          (user management, login)
└── Mantis::WebService::Util          (shared utilities)
```

---

## 4. Bug WebService (Mantis::WebService::Bug)

**File**: `Mantis/WebService/Bug.pm` (~121k bytes, 4693 lines)

### 4.1 Public Methods

| Method | HTTP (REST) | Description |
|---|---|---|
| `get` | `GET /rest/bug/{id}` | Get one or more bugs by ID or alias |
| `search` | `GET /rest/bug` | Search bugs by any field combination |
| `create` | `POST /rest/bug` | Create a new bug |
| `update` | `PUT /rest/bug/{id}` | Update an existing bug |
| `add_comment` | `POST /rest/bug/{id}/comment` | Add a comment to a bug |
| `comments` | `GET /rest/bug/{id}/comment` | Get all comments for a bug |
| `render_comment` | `POST /rest/bug/{id}/render_comment` | Render comment text to HTML |
| `history` | `GET /rest/bug/{id}/history` | Get complete change history |
| `attachments` | `GET /rest/bug/{id}/attachment` | Get attachments |
| `add_attachment` | `POST /rest/bug/{id}/attachment` | Upload an attachment |
| `update_attachment` | `PUT /rest/bug/{id}/attachment/{id}` | Update attachment metadata |
| `fields` | `GET /rest/field/bug` | List all available bug fields |
| `legal_values` | `GET /rest/field/bug/{field}` | Get valid values for a field |
| `possible_duplicates` | `GET /rest/bug/possible_duplicates` | Find potential duplicate bugs |
| `update_see_also` | `PUT /rest/bug/{id}/see_also` | Update external tracker links |
| `update_tags` | `PUT /rest/bug/{id}/tags` | Update bug tags |
| `search_comment_tags` | `GET /rest/bug/comment/tags` | Search comment tags |
| `update_comment_tags` | `PUT /rest/bug/comment/{id}/tags` | Update tags on a comment |

### 4.2 Bug Create / Update Payload

**Create (`POST /rest/bug`)**:
```json
{
    "product": "Firefox",
    "component": "Networking",
    "summary": "Example bug",
    "version": "113.0",
    "description": "Steps to reproduce...",
    "severity": "normal",
    "priority": "Normal",
    "op_sys": "Linux",
    "platform": "PC",
    "assigned_to": "developer@example.com",
    "cc": ["user1@example.com", "user2@example.com"],
    "keywords": ["regression", "crash"],
    "groups": ["security"],
    "blocks": [12345],
    "depends_on": [12340],
    "flags": [{"name": "needinfo", "status": "?", "requestee": "expert@example.com"}]
}
```

**Response**:
```json
{
    "id": 12346
}
```

**Update (`PUT /rest/bug/12346`)**:
```json
{
    "status": "RESOLVED",
    "resolution": "FIXED",
    "comment": {"body": "Fixed in commit abc123", "is_private": false},
    "work_time": 2.5
}
```

### 4.3 Search Parameters

`GET /rest/bug` accepts:

```
?product=Firefox               - Filter by product
&component=Networking          - Filter by component
&status=CONFIRMED              - Filter by status
&resolution=FIXED              - Filter by resolution
&priority=P1                   - Filter by priority
&severity=blocker              - Filter by severity
&assigned_to=user@example.com  - Filter by assignee
&reporter=user@example.com     - Filter by reporter
&cc=user@example.com           - Filter by CC
&keywords=regression           - Filter by keyword
&limit=50                      - Result limit
&offset=100                    - Pagination offset
&order=bug_id                  - Sort field
&include_fields=id,summary,status - Only return these fields
&exclude_fields=comments       - Exclude these fields
&creation_time=2023-01-01      - Created after date
&last_change_time=2023-06-01   - Changed after date
&quicksearch=crash+graphics    - Quicksearch expression
```

---

## 5. User WebService (Mantis::WebService::User)

### 5.1 Public Methods

| Method | HTTP (REST) | Description |
|---|---|---|
| `login` | `GET /rest/login` | Authenticate and get token |
| `logout` | `GET /rest/logout` | Invalidate current session |
| `valid_login` | `GET /rest/valid_login` | Check if login is still valid |
| `get` | `GET /rest/user/{id}` | Get user(s) by ID, name, or email |
| `create` | `POST /rest/user` | Create a new user |
| `update` | `PUT /rest/user/{id}` | Update a user |
| `offer_account_by_email` | `POST /rest/user/create` | Invite user by email |
| `whoami` | `GET /rest/whoami` | Get current user info |

### 5.2 User Object Response

```json
{
    "id": 42,
    "login": "developer@example.com",
    "real_name": "Jane Developer",
    "email": "developer@example.com",
    "can_login": true,
    "email_enabled": true,
    "groups": [
        {"id": 1, "name": "admin", "description": "Administrators"},
        {"id": 5, "name": "editbugs", "description": "Can edit all bugs"}
    ],
    "saved_searches": [...],
    "saved_reports": [...]
}
```

---

## 6. Product WebService (Mantis::WebService::Product)

### 6.1 Public Methods

| Method | HTTP (REST) | Description |
|---|---|---|
| `get` | `GET /rest/product/{id}` | Get product(s) |
| `get_accessible_products` | `GET /rest/product` | Get all accessible products |
| `get_selectable_products` | `GET /rest/product?type=selectable` | Get products user can file against |
| `get_enterable_products` | `GET /rest/product?type=enterable` | Get products user can enter bugs into |
| `create` | `POST /rest/product` | Create a product (admin) |
| `update` | `PUT /rest/product/{id}` | Update a product (admin) |

---

## 7. Authentication in the API Layer

### API Key Authentication

API keys are stored in `user_api_keys` table:
```sql
user_api_keys: id, user_id, api_key (hash), description, revoked, last_used, last_used_ip
```

The `Mantis::Auth::Login::APIKey` module:
1. Reads `X-BUGZILLA-API-KEY` header or `api_key` URL param
2. Looks up the key in the `user_api_keys` table (hashed comparison)
3. Updates `last_used` timestamp and IP
4. Returns the associated user

### Access Control in WebService

```perl
use constant READ_ONLY => qw(
    attachments  comments  fields  get  history  legal_values  search
);
```

- `READ_ONLY` methods do not require `editbugs` privilege
- All mutating methods (create, update, add_comment) require appropriate group membership
- Admin methods (create user, update product) require `admin` group membership
- The `PRIVILEGES_REQUIRED_*` constants control access levels:
  - `PRIVILEGES_REQUIRED_NONE = 0` — anyone can call
  - `PRIVILEGES_REQUIRED_REPORTER = 1` — bug reporter or above
  - `PRIVILEGES_REQUIRED_ASSIGNEE = 2` — assignee or above
  - `PRIVILEGES_REQUIRED_EMPOWERED = 3` — empowered user (editbugs group)

---

## 8. JSON-RPC Interface

**Endpoint**: `POST /jsonrpc.cgi`  
**Format**: JSON-RPC 2.0

```json
{
    "jsonrpc": "2.0",
    "method": "Bug.get",
    "params": {"ids": [12345], "include_fields": ["id", "summary", "status"]},
    "id": 1
}
```

Response:
```json
{
    "jsonrpc": "2.0",
    "result": {
        "bugs": [{
            "id": 12345,
            "summary": "Example bug",
            "status": "CONFIRMED"
        }]
    },
    "id": 1
}
```

Method names follow the pattern `{Module}.{method}` (e.g., `Bug.create`, `User.login`).

---

## 9. XML-RPC Interface

**Endpoint**: `POST /xmlrpc.cgi`

```xml
<?xml version="1.0"?>
<methodCall>
    <methodName>Bug.get</methodName>
    <params>
        <param>
            <value>
                <struct>
                    <member>
                        <name>ids</name>
                        <value><array><data>
                            <value><int>12345</int></value>
                        </data></array></value>
                    </member>
                </struct>
            </value>
        </param>
    </params>
</methodCall>
```

Implemented via `SOAP::Lite` and `XMLRPC::Lite`.

---

## 10. Error Handling

All APIs return structured errors:

**REST**:
```json
{
    "error": true,
    "code": 101,
    "message": "Bug #99999 does not exist."
}
```

**JSON-RPC**:
```json
{
    "jsonrpc": "2.0",
    "error": {
        "code": 101,
        "message": "Bug #99999 does not exist."
    },
    "id": 1
}
```

**Error codes** (from `Mantis::WebService::Constants`):
- 100: Invalid parameters
- 101: Object does not exist
- 102: Access denied
- 103: Not logged in
- 104: Account disabled
- 105: Authorization required

---

## 11. Type Coercion & Field Filtering

The API layer applies systematic type coercion:

- **Date fields**: ISO 8601 format (`YYYY-MM-DDThh:mm:ssZ`), specified in `DATE_FIELDS` constants per module
- **Base64 fields**: Binary data (like attachment content) transmitted as Base64, specified in `BASE64_FIELDS`
- **Field filtering**: `include_fields` and `exclude_fields` parameters strip the response to only desired fields, reducing payload size
- **Field name mapping**: Some internal field names differ from API names (e.g., `description`↔`summary` for attachments)

---

## 12. config.cgi — Static Configuration Endpoint

`config.cgi` returns a JSON/XML dump of all system configuration that client applications need to build UIs without round-trips:

```json
{
    "version": "5.2+",
    "maintainer": "admin@example.com",
    "timezone": "UTC",
    "products": [...],
    "components": {...},
    "versions": {...},
    "milestones": {...},
    "severities": ["blocker","critical","major","normal","minor","trivial","enhancement"],
    "priorities": ["Highest","High","Normal","Low","Lowest","---"],
    "op_sys": ["All","Windows","Mac OS","Linux","Other"],
    "platforms": ["All","PC","Macintosh","Other"],
    "statuses": ["UNCONFIRMED","CONFIRMED","IN_PROGRESS","RESOLVED","VERIFIED"],
    "resolutions": ["","FIXED","INVALID","WONTFIX","DUPLICATE","WORKSFORME"]
}
```
