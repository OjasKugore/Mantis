# Mantis — Defect Lifecycle & Formal State Machine

> **Live Evaluation Sandbox:** [https://mantis-clonefest.vercel.app](https://mantis-clonefest.vercel.app)

This document specifies the complete defect lifecycle in Mantis: from the moment an engineer files a bug to permanent archival, covering state transition rules, resolution requirements, audit trail mechanics, and security isolation.

---

## 1. End-to-End Filing & Lifecycle Flow

```mermaid
flowchart TD
    classDef startEnd fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC;
    classDef client fill:#0F172A,stroke:#818CF8,stroke-width:1.5px,color:#F8FAFC;
    classDef server fill:#1E1B4B,stroke:#A855F7,stroke-width:1.5px,color:#F8FAFC;
    classDef database fill:#14532D,stroke:#4ADE80,stroke-width:1.5px,color:#F8FAFC;
    classDef moat fill:#701A75,stroke:#F472B6,stroke-width:1.5px,color:#F8FAFC;
    classDef decision fill:#312E81,stroke:#FBBF24,stroke-width:1.5px,color:#F8FAFC;

    subgraph S1 ["1. Client Filing & Duplicate Prevention (/bugs/new)"]
        START(["👤 Engineer starts filing defect"]):::startEnd
        INPUT["Enter Summary & Description"]:::client
        TRGM_QUERY["Debounced GET /api/v1/bugs/duplicates"]:::client
        CHECK_DUP{"pg_trgm Similarity > 0.28?"}:::decision
        WARN_CARD["⚠️ Display Candidate Duplicate Warning Card"]:::client
        USER_CONTINUE["Select Product & Component<br/>(Sets Priority, Severity, Est. Time)"]:::client
    end

    subgraph S2 ["2. Fastify API Gateway & Validation Engine"]
        SUBMIT["POST /api/v1/bugs"]:::server
        AUTH_CHECK{"Valid Session Token?"}:::decision
        AUTH_ERR["401 Unauthorized"]:::server
        ZOD_CHECK{"Zod Schema Validation<br/>& Active Product Guard"}:::decision
        VAL_ERR["400 Validation Error"]:::server
        OWNER_RESOLVE["Resolve Assignee<br/>(Fallback to Component default_owner_id)"]:::server
    end

    subgraph S3 ["3. Atomic Database Transaction (PostgreSQL 16)"]
        DB_TX["BEGIN Transaction"]:::database
        INSERT_BUG["INSERT INTO bugs<br/>• status = 'UNCONFIRMED'<br/>• resolution = ''<br/>• Auto-generates TSVECTOR"]:::database
        INSERT_AUDIT["INSERT INTO bugs_activity<br/>• field = 'status'<br/>• old_value = NULL<br/>• new_value = 'UNCONFIRMED'"]:::database
        DB_COMMIT["COMMIT Transaction<br/>(Returns Bug #ID)"]:::database
    end

    subgraph S4 ["4. Enterprise Governance & Algorithmic Moats"]
        DETAIL_PAGE["Redirect to Bug Detail (/bugs/:id)"]:::startEnd
        M_FSM["<b>Formal State Machine</b><br/>UNCONFIRMED ➔ CONFIRMED ➔ IN_PROGRESS<br/>➔ RESOLVED (requires resolution code)"]:::moat
        M_CPM["<b>CPM Critical Path DAG</b><br/>React Flow + Kahn's Topo Sort<br/>Recursive Cycle Detection (422)"]:::moat
        M_CVSS["<b>CVSS v4.0 & Embargo</b><br/>FIRST.org Vector Calc + 90-Day Timer<br/>404 Group Secrecy for Non-Members"]:::moat
        M_FLAGS["<b>Three-State Review Flags</b><br/>Enterprise Patch Governance<br/>(? ➔ + / -)"]:::moat
        M_AI["<b>1-Click AI Triage Assistant</b><br/>Gemini 2.0 Flash synthesizes<br/>30+ comments in < 2.5s"]:::moat
    end

    START --> INPUT
    INPUT --> TRGM_QUERY
    TRGM_QUERY --> CHECK_DUP
    CHECK_DUP -- Yes --> WARN_CARD
    CHECK_DUP -- No --> USER_CONTINUE
    WARN_CARD --> USER_CONTINUE
    USER_CONTINUE --> SUBMIT

    SUBMIT --> AUTH_CHECK
    AUTH_CHECK -- No --> AUTH_ERR
    AUTH_CHECK -- Yes --> ZOD_CHECK
    ZOD_CHECK -- Fail --> VAL_ERR
    ZOD_CHECK -- Pass --> OWNER_RESOLVE

    OWNER_RESOLVE --> DB_TX
    DB_TX --> INSERT_BUG
    INSERT_BUG --> INSERT_AUDIT
    INSERT_AUDIT --> DB_COMMIT

    DB_COMMIT --> DETAIL_PAGE

    DETAIL_PAGE -.-> M_FSM
    DETAIL_PAGE -.-> M_CPM
    DETAIL_PAGE -.-> M_CVSS
    DETAIL_PAGE -.-> M_FLAGS
    DETAIL_PAGE -.-> M_AI
```

---

## 2. Formal Finite State Machine (FSM)

### 2.1 State Transition Diagram

```
UNCONFIRMED ──► CONFIRMED ──► IN_PROGRESS ──► RESOLVED ──► VERIFIED ──► CLOSED
                    ▲              │              │            │
                    └──────────────┴──────────────┴────────────┘  (Reopen)
```

### 2.2 Permitted Transition Matrix

| Current Status | Permitted Target Statuses | Notes |
|---|---|---|
| `UNCONFIRMED` | `CONFIRMED`, `RESOLVED` | Initial state for all new defects |
| `CONFIRMED` | `IN_PROGRESS`, `RESOLVED` | Confirmed bugs awaiting assignment |
| `IN_PROGRESS` | `RESOLVED`, `CONFIRMED` | Active work; revert to `CONFIRMED` on unassignment |
| `RESOLVED` | `VERIFIED`, `CONFIRMED` | Resolution must be set; reopen clears resolution |
| `VERIFIED` | `CLOSED`, `CONFIRMED` | QA-verified fix; reopen if regression found |
| `CLOSED` | `CONFIRMED` | Permanent archival; reopen only to restart triage |

Any transition not listed above is rejected by the server with **HTTP 422 Unprocessable Entity**.

### 2.3 Resolution Guard

Transitioning any defect to `RESOLVED` **requires** one of the following mandatory resolution codes:

| Resolution Code | Meaning |
|---|---|
| `FIXED` | The defect has been fixed in the codebase |
| `INVALID` | The report does not describe a real defect |
| `WONTFIX` | A known issue accepted as out of scope |
| `DUPLICATE` | A duplicate of another existing report |
| `WORKSFORME` | Could not reproduce with provided steps |
| `INCOMPLETE` | Insufficient information to act upon |

Reopening a defect (transitioning back to `CONFIRMED`) **automatically clears** the resolution code field.

---

## 3. Immutable Audit Trail

Every field mutation — status changes, priority edits, CVSS vector updates, embargo toggles, assignee changes — is permanently recorded in the `bugs_activity` table:

```sql
CREATE TABLE bugs_activity (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id      BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    who_id      UUID NOT NULL REFERENCES users(id),
    field       VARCHAR(64) NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    comment     TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Rows are **never updated or deleted** — the table is append-only.
- Provides a complete, timestamped chain of custody for every defect.
- Supports SOC 2 and ISO 27001 audit compliance requirements.

---

## 4. 404 Zero-Leakage Secrecy

When an unauthorized user (or unauthenticated request) attempts to access a quarantined security defect:

- The server returns **HTTP `404 Not Found`** — never `403 Forbidden`.
- The response body contains no bug ID, summary, or any field from the restricted record.
- This prevents attackers from enumerating bug IDs or confirming the existence of an active zero-day vulnerability under 90-day disclosure embargo.

Security bugs are visible **only** to members of the designated `security-team` group, as verified against the session cookie on every request.

---

## 5. Duplicate Prevention (Pre-Submission)

Before an engineer submits a new bug, Mantis runs a background trigram similarity query:

```sql
SELECT id, summary, similarity(summary, $1) AS score
FROM bugs
WHERE similarity(summary, $1) > 0.28
ORDER BY score DESC
LIMIT 5;
```

If candidates exist, a warning card surfaces their IDs and summaries directly in the bug filing form — allowing the engineer to check and link the existing report instead of creating a duplicate.
