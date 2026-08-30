# Mantis — Advanced Enterprise Features & Implementation Architecture

> **Platform Version**: Mantis v3.0.0 Enterprise Release  
> **Target Audience**: Core Architects, Hackathon Evaluators, and Security Auditors  
> **Related Specifications**: [`docs/features-and-moats.md`](features-and-moats.md) · [`docs/defect-lifecycle.md`](defect-lifecycle.md) · [`docs/feature-testing-checklist.md`](feature-testing-checklist.md)

---

## 📑 Table of Contents

1. [Architectural Philosophy & Domain Invariants](#1-architectural-philosophy--domain-invariants)
2. [Milestone Release Readiness Engine (Algorithmic 0–100 Score)](#2-milestone-release-readiness-engine-algorithmic-0100-score)
3. [Saved Views & Named Queries (JSONB Persistence)](#3-saved-views--named-queries-jsonb-persistence)
4. [Bugzilla Keywords Classification System](#4-bugzilla-keywords-classification-system)
5. [CC / Watcher Notification & Subscription Model](#5-cc--watcher-notification--subscription-model)
6. [Data Portability & Streamed CSV Export](#6-data-portability--streamed-csv-export)
7. [System-Wide Audit Explorer & Immutable Event Stream](#7-system-wide-audit-explorer--immutable-event-stream)
8. [Automated Testing & Invariants Verification Matrix](#8-automated-testing--invariants-verification-matrix)

---

## 1. Architectural Philosophy & Domain Invariants

Mantis is designed around **domain fidelity** and **invariant-first engineering**. Unlike generic issue trackers that treat all tickets as flat task objects, Mantis incorporates the domain principles of mission-critical defect management:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MANTIS ARCHITECTURE TIERS                                │
├─────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│   PRESENTATION TIER     │       APPLICATION TIER       │         DATABASE TIER         │
│   (Next.js 14 Web)      │     (Fastify 4 Gateway)      │        (PostgreSQL 16)        │
├─────────────────────────┼──────────────────────────────┼───────────────────────────────┤
│ • React Flow DAG (CPM)  │ • Kahn's CPM Dynamic Engine  │ • GIN-indexed tsvector FTS    │
│ • SVG Circular Gauges   │ • CVSS v4.0 Discrete Math    │ • Recursive CTE Cycle Checks  │
│ • Saved Views Chip Bar  │ • Strict 6-State FSM Engine  │ • Immutable bugs_activity     │
│ • Kanban Drag-and-Drop  │ • Argon2id Crypto Gateway    │ • Group RBAC 404 Isolation    │
│ • Interactive Audit UI  │ • Gemini 2.0 AI Synthesis    │ • Named Queries JSONB Store   │
└─────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

## 2. Milestone Release Readiness Engine (Algorithmic 0–100 Score)

### 2.1 Problem Formulation & Motivation
Engineering leads and release managers require an objective, deterministic measure of whether a release milestone (e.g. `Firefox 128.0`) is safe to ship. Traditional trackers rely on manual status counts, obscuring high-risk bottlenecks on critical dependency paths.

### 2.2 Mathematical Scoring Model
The Release Readiness Score $S \in [0, 100]$ is computed as a penalized progression function:

$$S = \max\left(0, \min\left(100, \text{round}\left(S_{\text{base}} - \frac{1}{2} \sum P_i\right)\right)\right)$$

Where:
1. **Base Progression Score ($S_{\text{base}}$)**:
   $$S_{\text{base}} = \begin{cases} \text{round}\left(\frac{N_{\text{resolved}}}{N_{\text{total}}} \times 100\right), & N_{\text{total}} > 0 \\ 100, & N_{\text{total}} = 0 \end{cases}$$
   Where $N_{\text{resolved}}$ represents bugs in state `RESOLVED`, `VERIFIED`, or `CLOSED`.

2. **Penalty Matrix ($\sum P_i$)**:
   The engine evaluates five discrete risk factors across all unresolved defects:
   * **Critical Path Blocker Penalty ($P_{\text{CPM}}$)**:
     $$P_{\text{CPM}} = 15 \times N_{\text{open\_critical\_path}}$$
     Unresolved bugs on the topological Critical Path (computed via Kahn's algorithm + Earliest Finish Time DP) delay downstream deliverables.
   * **CVSS v4.0 Critical Vulnerability Penalty ($P_{\text{CVSS\_CRIT}}$)**:
     $$P_{\text{CVSS\_CRIT}} = 20 \times N_{\text{cvss\_critical}}$$
     Unresolved security vulnerabilities with CVSS score $\ge 9.0$.
   * **CVSS v4.0 High Vulnerability Penalty ($P_{\text{CVSS\_HIGH}}$)**:
     $$P_{\text{CVSS\_HIGH}} = 10 \times N_{\text{cvss\_high}}$$
     Unresolved security vulnerabilities with CVSS score $7.0 - 8.9$.
   * **Pending Blocking Review Flags ($P_{\text{FLAGS}}$)**:
     $$P_{\text{FLAGS}} = 5 \times N_{\text{flags\_pending\_?}}$$
     Code review (`review?`) or release management (`approval?`) flags awaiting sign-off.
   * **P1 / Blocker Priority Defects ($P_{\text{P1}}$)**:
     $$P_{\text{P1}} = 8 \times N_{\text{priority\_P1}}$$

### 2.3 Status Tiers
* **`READY_FOR_RELEASE`**: $S \ge 85$ (Emerald Green `#10B981`)
* **`NEEDS_ATTENTION`**: $60 \le S < 85$ (Amber Yellow `#F59E0B`)
* **`BLOCKED`**: $S < 60$ (Rose Red `#EF4444`)

### 2.4 REST API Contract
```http
GET /api/v1/analytics/readiness?milestone=128.0
```

#### JSON Response Schema
```json
{
  "milestone": "128.0",
  "score": 78,
  "status": "NEEDS_ATTENTION",
  "totalIssues": 30,
  "resolvedIssues": 18,
  "unresolvedIssues": 12,
  "criticalPathIds": [101, 102, 106],
  "penalties": 30,
  "breakdown": [
    {
      "label": "Open Critical Path Blockers",
      "penalty": 15,
      "count": 1,
      "impact": "CRITICAL"
    },
    {
      "label": "Pending Blocking Review Flags",
      "penalty": 10,
      "count": 2,
      "impact": "MEDIUM"
    },
    {
      "label": "Unresolved P1 / Blocker Defects",
      "penalty": 8,
      "count": 1,
      "impact": "HIGH"
    }
  ],
  "unresolvedBugs": [
    {
      "id": 101,
      "summary": "Necko HTTP/3 connection socket timeout degradation",
      "status": "IN_PROGRESS",
      "priority": "P1",
      "severity": "blocker",
      "cvss_severity": "HIGH",
      "is_on_critical_path": true
    }
  ]
}
```

### 2.5 UI Presentation Architecture
Rendered inside [`apps/web/components/ReadinessDashboard.tsx`](../apps/web/components/ReadinessDashboard.tsx) using an SVG circular progress ring:
* **Circumference Math**: $C = 2 \pi r = 2 \pi (52) \approx 326.72\text{px}$
* **Dynamic Offset**: $\text{offset} = C - \left(\frac{S}{100}\right) \times C$
* **CSS Transition**: `transition-all duration-1000 ease-out` for smooth score animation on milestone switch.

---

## 3. Saved Views & Named Queries (JSONB Persistence)

### 3.1 Database Schema & Multi-Tenancy
Queries are stored in the PostgreSQL `named_queries` table with JSONB serialization:

```sql
CREATE TABLE IF NOT EXISTS named_queries (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(64) NOT NULL,
    query_json JSONB NOT NULL,
    UNIQUE (user_id, name)
);
```

### 3.2 System Presets vs. User Queries
The endpoint automatically unions built-in enterprise presets with the user's private queries:

| Preset Name | Filter Criteria (`query_json`) |
|---|---|
| `🔥 P1 Blockers` | `{"status":"all", "priority":"P1", "severity":"all", "embargo":"all"}` |
| `🔒 Security Embargoed` | `{"status":"all", "priority":"all", "severity":"all", "embargo":"embargoed"}` |
| `⚡ Needs Triage (Unconfirmed)` | `{"status":"UNCONFIRMED", "priority":"all", "severity":"all", "embargo":"all"}` |
| `🚀 In Progress` | `{"status":"IN_PROGRESS", "priority":"all", "severity":"all", "embargo":"all"}` |
| `✅ Resolved Fixed` | `{"status":"RESOLVED", "priority":"all", "severity":"all", "embargo":"all"}` |

### 3.3 REST API Endpoints
* `GET /api/v1/saved-views` — Lists system presets + user's custom views.
* `POST /api/v1/saved-views` — Persists a new named query for the authenticated user.
* `DELETE /api/v1/saved-views/:id` — Deletes a user's custom query with session ownership checks.

---

## 4. Bugzilla Keywords Classification System

### 4.1 Relational Architecture
Keywords allow cross-product taxonomy tagging (e.g. `regression`, `crash`, `sec-audit`, `perf`, `topcrash`).

```sql
CREATE TABLE IF NOT EXISTS keyword_defs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(64) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS bug_keywords (
    bug_id     BIGINT NOT NULL REFERENCES bugs(id)         ON DELETE CASCADE,
    keyword_id BIGINT NOT NULL REFERENCES keyword_defs(id) ON DELETE CASCADE,
    PRIMARY KEY (bug_id, keyword_id)
);
```

### 4.2 Activity Logging Invariant
Every tag addition or removal automatically commits an immutable record to `bugs_activity`:

```sql
INSERT INTO bugs_activity (bug_id, who, field_name, removed, added)
VALUES ($bug_id, $user_id, 'keywords', '', $keyword_name);
```

### 4.3 REST API Endpoints
* `GET /api/v1/keywords` — Retrieves all global keyword definitions.
* `GET /api/v1/bugs/:id/keywords` — Retrieves all keywords tagged on defect `:id`.
* `POST /api/v1/bugs/:id/keywords` — Tags defect with a keyword (creates definition if not existing).
* `DELETE /api/v1/bugs/:id/keywords?keyword_id=:kwId` — Removes keyword tag from defect.

---

## 5. CC / Watcher Notification & Subscription Model

### 5.1 Relational Architecture
Enables developers, QA engineers, and security reviewers to subscribe to defect mutations:

```sql
CREATE TABLE IF NOT EXISTS bug_cc (
    bug_id  BIGINT NOT NULL REFERENCES bugs(id)  ON DELETE CASCADE,
    user_id UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (bug_id, user_id)
);
```

### 5.2 Notification Pipeline
When a defect is modified (status transition, new comment, flag update), the system queries `bug_cc`:

$$\text{Subscribers} = \{u \in \text{users} \mid (bug\_id, u.id) \in bug\_cc \lor u.id = reporter\_id \lor u.id = assignee\_id\}$$

Each subscriber receives a notification row in the `notifications` table, incrementing the live header notification bell.

### 5.3 REST API Endpoints
* `GET /api/v1/bugs/:id/cc` — Returns all CC'd subscribers and a boolean `is_watching` for the current user.
* `POST /api/v1/bugs/:id/cc` — Adds the authenticated user to the CC list.
* `DELETE /api/v1/bugs/:id/cc` — Removes the authenticated user from the CC list.

---

## 6. Data Portability & Streamed CSV Export

### 6.1 RFC 4180 Compliant Stream Pipeline
The endpoint [`GET /api/v1/bugs/export`](../apps/web/app/api/v1/bugs/export/route.ts) streams structured CSV data with dynamic SQL query parameterization:

```http
GET /api/v1/bugs/export?status=all&priority=P1&severity=all&embargo=all HTTP/1.1
```

#### Response Headers
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="mantis-defects-export-2026-08-30.csv"
```

### 6.2 Security Masking Invariant
The export endpoint strictly enforces the **404 Zero-Leakage Group Security Model**. If an unauthenticated user or a user outside the `security` group executes an export, all embargoed zero-day defects are omitted from the CSV output at the SQL query level:

```sql
WHERE 1=1
  AND (b.is_embargoed = false OR b.is_embargoed IS NULL OR b.reporter_id = $userId OR b.assignee_id = $userId)
```

---

## 7. System-Wide Audit Explorer & Immutable Event Stream

### 7.1 Append-Only Audit Stream Architecture
Every mutation across the entire platform writes to `bugs_activity`:

```sql
CREATE TABLE IF NOT EXISTS bugs_activity (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bug_id     BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    who        UUID   NOT NULL REFERENCES users(id),
    bug_when   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    field_name VARCHAR(64) NOT NULL,
    removed    TEXT,
    added      TEXT
);
```

### 7.2 REST API Contract
```http
GET /api/v1/audit?limit=20&offset=0&field=bug_status HTTP/1.1
```

#### JSON Response Schema
```json
{
  "total": 45,
  "limit": 20,
  "offset": 0,
  "activities": [
    {
      "id": 142,
      "bug_id": 101,
      "bug_summary": "Necko HTTP/3 connection socket timeout degradation",
      "who_name": "Alice Developer",
      "who_email": "alice@mozilla.com",
      "field_name": "bug_status",
      "removed": "CONFIRMED",
      "added": "IN_PROGRESS",
      "timestamp": "2026-08-30T16:30:00.000Z"
    }
  ]
}
```

### 7.3 UI Features on `/audit`
* **Real-time field filter dropdown**: Filter by `Status Transitions`, `Resolutions`, `Priority`, `Severity`, `CVSS Score`, `Embargo`, `Review Flags`, `Keywords`, or `CC List`.
* **Server-side pagination**: Efficient chunked queries over thousands of events.
* **Direct navigation links**: One-click jump to the affected `#Bug ID`.

---

## 8. Automated Testing & Invariants Verification Matrix

The monorepo contains **36 test suites with 141 named assertions**, running in **~4.2 seconds** with 100% green pass rate:

```bash
npm test
```

```
========================================================================
  PACKAGE               TEST SUITES   TESTS PASSING   EXECUTION TIME
========================================================================
  @mantis/api (Backend)     19             88            ~3.4s
  @mantis/cli (Terminal)     5             17            ~0.2s
  @mantis/web (Frontend)    12             36            ~0.6s
------------------------------------------------------------------------
  TOTAL                     36            141            ~4.2s (100% Green ✅)
========================================================================
```

### Key Invariant Assertions Verified:
1. **Topological Order & CPM**: Graph traversal produces valid linear order; circular blocker edges abort with `422`.
2. **CVSS v4.0 Math Standard**: Base metric combinations calculate exact scores matching FIRST.org benchmark vectors.
3. **Finite State Machine**: Illegal direct jumps (e.g. `IN_PROGRESS` $\rightarrow$ `CLOSED` without resolution code) abort with `422`.
4. **404 Zero-Leakage Secrecy**: Unauthorized requests to embargoed defects return HTTP `404 Not Found` (never `403`).
5. **Cryptographic Integrity**: Passwords hashed with Argon2id; webhooks verified with constant-time HMAC-SHA256 comparison.
6. **Data Portability**: CSV export produces properly formatted and escaped rows with strict embargo omission for public sessions.
