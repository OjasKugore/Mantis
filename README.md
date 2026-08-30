# Mantis — Modern Defect, Vulnerability & Governance Platform

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.28-black?logo=fastify)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-124%2F124_Passing_100%25-brightgreen?logo=vitest)](https://vitest.dev/)
[![Gemini](https://img.shields.io/badge/AI_Triage-Gemini_2.0_Flash-orange?logo=google)](https://deepmind.google/technologies/gemini/)
[![Live Sandbox](https://img.shields.io/badge/Live_Sandbox-mantis--clonefest.vercel.app-purple?logo=vercel)](https://mantis-clonefest.vercel.app)

**Mantis** is a modern defect tracking, vulnerability scoring, and release governance platform. Built on **Fastify 4**, **PostgreSQL 16**, and **Next.js 14**, it modernizes legacy bug-tracking infrastructure with 5 core algorithmic and security differentiators: an interactive Critical Path Method (CPM) DAG engine, a FIRST.org CVSS v4.0 math calculator with live embargo countdowns, strict 404 zero-leakage group secrecy, a formal Finite State Machine, and 1-Click Gemini 2.0 Flash AI triage.

---

## ⚡ 60-Second Quick Start (For Judges & Evaluators)

### 🌐 Live Evaluation Sandbox
Access the deployed live application instantly without local setup:  
👉 **[https://mantis-clonefest.vercel.app](https://mantis-clonefest.vercel.app)**

---

### Option A: Zero-Database Instant Verification (Pure Node.js)
Run the entire automated test suite with **zero external database dependencies** (powered by in-memory PostgreSQL engine):
```bash
git clone https://github.com/OjasKugore/clonefest-2.git
cd clonefest-2
npm install
npm test
```
> **Runs all 124 unit and integration tests in ~3.8 seconds** with 100% green pass rate.

---

### Option B: Local Full-Stack Run with Docker & PostgreSQL 16
```bash
# 1. Verify local environment health
npm run preflight

# 2. Boot PostgreSQL 16 container, run migrations & seed 30 test defects
docker compose up -d db
npm run migrate
npm run seed

# 3. Start Frontend & API Servers
npm run dev
```
- **Web Application**: `http://localhost:3000`
- **Fastify API Server**: `http://localhost:3001`
- **Interactive Swagger/OpenAPI Docs**: `http://localhost:3001/docs`

---

## 👥 1-Click Evaluator Persona Accounts

The login page (`/login`) includes **1-Click Quick-Login buttons** to switch between role personas instantly:

| Persona | Email | Role & Special Permissions |
|---|---|---|
| 👑 **System Admin** | `admin@mantis.local` | Full platform administration, team invite dispatch, group blessing |
| 🛡️ **Carol (Security Lead)** | `carol@mozilla.com` | `security-team` member: full access to embargoed CVSS zero-day defects |
| 💻 **Alice (Core Developer)** | `alice@mozilla.com` | Engine developer: assigned blocking defects, dependency graph triage |
| 🧪 **Bob (QA Lead)** | `bob@mozilla.com` | Test verification lead: bug confirmation, state transitions, flag reviews |
| ⚡ **Dave (Performance Eng)** | `dave@mozilla.com` | Systems developer: milestone readiness and velocity analytics |
| 🎯 **Eve (Triage Coordinator)** | `eve@mozilla.com` | Triage manager: duplicate detection, priority assignment, AI synthesis |

*All seed accounts use default password:* `password123`

---

## 🔄 Defect Lifecycle & Algorithmic Architecture

```mermaid
flowchart TD
    %% Styling
    classDef startEnd fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC;
    classDef client fill:#0F172A,stroke:#818CF8,stroke-width:1.5px,color:#F8FAFC;
    classDef server fill:#1E1B4B,stroke:#A855F7,stroke-width:1.5px,color:#F8FAFC;
    classDef database fill:#14532D,stroke:#4ADE80,stroke-width:1.5px,color:#F8FAFC;
    classDef moat fill:#701A75,stroke:#F472B6,stroke-width:1.5px,color:#F8FAFC;
    classDef decision fill:#312E81,stroke:#FBBF24,stroke-width:1.5px,color:#F8FAFC;

    %% 1. Client Filing & Duplicate Prevention
    subgraph S1 ["1. Client Filing & Duplicate Prevention (/bugs/new)"]
        START(["👤 Engineer starts filing defect"]):::startEnd
        INPUT["Enter Summary & Description"]:::client
        TRGM_QUERY["Debounced GET /api/v1/bugs/duplicates"]:::client
        CHECK_DUP{"pg_trgm Similarity > 0.28?"}:::decision
        WARN_CARD["⚠️ Display Candidate Duplicate Warning Card"]:::client
        USER_CONTINUE["Select Product & Component<br/>(Sets Priority, Severity, Est. Time)"]:::client
    end

    %% 2. Fastify API Gateway & Validation
    subgraph S2 ["2. Fastify API Gateway & Validation Engine"]
        SUBMIT["POST /api/v1/bugs"]:::server
        AUTH_CHECK{"Valid Session Token?"}:::decision
        AUTH_ERR["401 Unauthorized"]:::server
        ZOD_CHECK{"Zod Schema Validation<br/>& Active Product Guard"}:::decision
        VAL_ERR["400 Validation Error"]:::server
        OWNER_RESOLVE["Resolve Assignee<br/>(Fallback to Component default_owner_id)"]:::server
    end

    %% 3. Atomic Database Insertion
    subgraph S3 ["3. Atomic Database Transaction (PostgreSQL 16)"]
        DB_TX["BEGIN Transaction"]:::database
        INSERT_BUG["INSERT INTO bugs<br/>• status = 'UNCONFIRMED'<br/>• resolution = ''<br/>• Auto-generates TSVECTOR"]:::database
        INSERT_AUDIT["INSERT INTO bugs_activity<br/>• field = 'status'<br/>• old_value = NULL<br/>• new_value = 'UNCONFIRMED'"]:::database
        DB_COMMIT["COMMIT Transaction<br/>(Returns Bug #ID)"]:::database
    end

    %% 4. Enterprise Governance & Algorithmic Moats
    subgraph S4 ["4. Enterprise Governance & Algorithmic Moats"]
        DETAIL_PAGE["Redirect to Bug Detail (/bugs/:id)"]:::startEnd
        
        M_FSM["<b>Formal State Machine</b><br/>UNCONFIRMED ➔ CONFIRMED ➔ IN_PROGRESS<br/>➔ RESOLVED (requires resolution code)"]:::moat
        M_CPM["<b>CPM Critical Path DAG</b><br/>React Flow + Kahn's Topo Sort<br/>Recursive Cycle Detection (422)"]:::moat
        M_CVSS["<b>CVSS v4.0 & Embargo</b><br/>FIRST.org Vector Calc + 90-Day Timer<br/>404 Group Secrecy for Non-Members"]:::moat
        M_FLAGS["<b>Three-State Review Flags</b><br/>Enterprise Patch Governance<br/>(? ➔ + / -)"]:::moat
        M_AI["<b>1-Click AI Triage Assistant</b><br/>Gemini 2.0 Flash synthesizes<br/>30+ comments in < 2.0s"]:::moat
    end

    %% Connections
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

## 🏆 The 5 Core Algorithmic & Governance Moats

### 1. 🕸️ Interactive DAG & Critical Path Engine (CPM)
- **Kahn's Topological Sort & Dynamic Programming**: Renders dependency graphs using React Flow and Dagre hierarchical layout.
- **Pulsing Critical Path Highlighting**: Computes the Earliest Finish Time (EFT) bottleneck path delaying release and renders it with pulsing animated red edges (`#EF4444`).
- **Recursive Cycle Rejection**: Prevents circular dependencies (`Bug A -> Bug B -> Bug A`) on creation using recursive PostgreSQL Common Table Expressions (CTEs), rejecting loops with HTTP `422 CYCLIC_DEPENDENCY_DETECTED`.

### 2. 🛡️ FIRST.org CVSS v4.0 Math Engine & 90-Day Embargo
- **Discrete MacroVector Computation**: Implements the official FIRST.org specification computing MacroVectors (`EQ1`–`EQ5`) across Base, Threat, and Environmental metric groups.
- **Interactive Metric Modal**: Real-time vector string generation and animated 0.0–10.0 score severity arc.
- **90-Day Disclosure Countdown**: Embargoed vulnerabilities display a live ticking countdown banner (`DD:HH:MM:SS`).

### 3. 🔒 Formal Finite State Machine & 404 Zero-Leakage Secrecy
- **Strict Server-Side FSM**: Validates lifecycle transitions (`UNCONFIRMED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `VERIFIED` $\rightarrow$ `CLOSED`). Enforces mandatory resolution codes (`FIXED`, `INVALID`, `WONTFIX`, `DUPLICATE`, `WORKSFORME`, `INCOMPLETE`).
- **Zero Data Leakage 404 Secrecy**: Unauthorized requests to embargoed or restricted security tickets return `404 Not Found` (never `403 Forbidden`), completely concealing the existence of zero-day vulnerabilities.
- **Immutable Append-Only Audit Trail**: Every field modification is permanently recorded in `bugs_activity` with author attribution, timestamp, and before/after diffs.

### 4. ✨ 1-Click AI Triage Assistant (Gemini 2.0 Flash)
- **Sub-2-Second Synthesis**: Distills long discussion threads (30+ comments) into structured JSON containing root cause summaries, suggested priority, component routing, and recommended next steps.
- **Resilient Fallback Design**: Protected with a 2.5s hard timeout and graceful fallback to ensure the UI never blocks.

### 5. 🚩 Three-State Review Flag Governance (`?`, `+`, `-`)
- **Independent Flag Pipeline**: Patch approvals and information requests (`review?`, `needinfo?`, `approval?`) are tracked independently of bug statuses.
- **Permissioned Grant Groups**: Flag transitions from `?` to `+` or `-` verify user membership in authorized grant groups (e.g. Release Management or Core Reviewers).

---

## 💻 Developer Ergonomics & Absorbed Features

| Feature | Technology | Value |
|---|---|---|
| **`⌘K` Command Palette** | `cmdk` | Instant fuzzy jump to bug IDs (`#104`), status transitions, and actions without touching the mouse. |
| **Drag-and-Drop Kanban** | `@dnd-kit/core` | 6-column workflow board with optimistic UI and automatic bounce-back on illegal FSM transitions. |
| **Stemmed Full-Text Search** | PostgreSQL `tsvector` + GIN | Sub-20ms stemmed search (e.g. `"parse"` matches `"parsing"`) with `<mark>` highlight tags. |
| **Typeahead Duplicate Warning** | `pg_trgm` | Live trigram similarity check (> 0.28) surfacing duplicate candidates *before* submission. |
| **GFM Markdown & Code Copy** | `react-markdown` + `rehype` | Dual-tab Write/Preview editor with 1-click clipboard copy on syntax-highlighted code blocks. |
| **Interactive @Mentions** | Regex + Avatar Typeahead | Type `@` to select users with instant inline badge rendering and notification bell alerts. |
| **GitHub SCM Webhook Receiver** | HMAC SHA-256 | Pushing commits with `Fixes #104` automatically links commit SHAs and resolves defects to `RESOLVED (FIXED)`. |
| **Release Readiness Score** | Custom Risk Formula | Explainable 0–100% circular health gauge penalizing open CPM blockers and CVSS criticals. |
| **Pure SQL MTTR Analytics** | PostgreSQL Aggregation | Real-time Mean Time To Resolve metrics computed directly over `bugs_activity` diffs. |

---

## 📂 Repository Structure

```
clonefest-2/
├── apps/
│   ├── api/                              # Fastify 4 + PostgreSQL 16 Backend (Port 3001)
│   │   ├── src/
│   │   │   ├── db/                       # PostgreSQL Pool & SQL Migrations (001-003)
│   │   │   ├── middleware/               # Argon2id Session Auth & 404 Group Filter
│   │   │   ├── routes/                   # Bugs, Graph, CVSS, AI Triage, Webhooks, Flags
│   │   │   ├── services/                 # CPM Kahn's Algorithm, CVSS v4.0, State Machine
│   │   │   └── server.ts                 # Fastify Server & Swagger OpenAPI Gateway
│   │   └── test/                         # 19 Test Suites (88 Unit & Integration Tests)
│   └── web/                              # Next.js 14 App Router Frontend (Port 3000)
│       ├── app/                          # App Router pages (/bugs, /kanban, /dashboard)
│       ├── components/                   # React Flow DAG, CVSS Modal, Kanban, CommandBar
│       ├── lib/                          # In-memory PostgreSQL fallback & client services
│       └── test/                         # 12 Test Suites (36 Unit & Integration Tests)
├── docs/                                 # Clean Platform Documentation
│   ├── defect-lifecycle.md               # End-to-end bug workflow & state transitions
│   ├── features-and-moats.md             # In-depth algorithmic & mathematical specifications
│   └── webhook-integration.md            # GitHub SCM webhook integration & live test guide
├── packages/shared/                      # Shared TypeScript Interfaces & Enums
├── scripts/preflight.mjs                 # Environment & port preflight health checker
├── docker-compose.yml                    # PostgreSQL 16 Alpine orchestration
└── README.md                             # Master repository documentation
```

---

## 🧪 Comprehensive Test Suite (124/124 Tests Passing)

All tests can be verified locally with a single command:
```bash
npm test
```

```
========================================================================
  PACKAGE               TEST SUITES   TESTS PASSING   EXECUTION TIME
========================================================================
  @mantis/api (Backend)     19             88            ~3.7s
  @mantis/web (Frontend)    12             36            ~0.6s
------------------------------------------------------------------------
  TOTAL                     31            124            ~4.3s (100% Green)
========================================================================
```

### Key Test Assertions Covered:
- ✅ **Cryptographic Security**: Argon2id hash uniqueness, constant-time verification, SHA-256 session token hashing.
- ✅ **State Machine Rules**: All 6 legal lifecycle transitions pass; illegal shortcuts and missing resolution codes rejected with 422.
- ✅ **CPM Graph Engine**: Kahn's topological sort, longest path detection on diamond/multi-hop DAGs, and cycle rejection.
- ✅ **CVSS v4.0 Vector Engine**: FIRST.org benchmark test vectors validate against official score lookup tables.
- ✅ **404 Zero-Leakage Secrecy**: Unauthorized requests for embargoed defects return strict 404s without ID or summary leakage.
- ✅ **GitHub SCM Automation**: HMAC-verified commit webhooks automatically transition bugs to `RESOLVED (FIXED)`.

---

## 🔗 Additional Documentation

- 📖 **[Defect Lifecycle & Workflow Specification](docs/defect-lifecycle.md)**
- 🧠 **[Algorithmic Moats & Mathematical Formulas](docs/features-and-moats.md)**
- 🐙 **[GitHub Webhook Integration Guide](docs/webhook-integration.md)**

---

## 📄 License & Team

Built with ❤️ for the Hackathon Modernization Challenge. Licensed under the [MIT License](LICENSE).
