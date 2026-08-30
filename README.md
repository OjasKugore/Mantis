# 🦗 Mantis — Modern Defect, Vulnerability & Release Governance Platform

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.28-black?logo=fastify)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-124%2F124_Passing_100%25-brightgreen?logo=vitest)](https://vitest.dev/)
[![Gemini](https://img.shields.io/badge/AI_Triage-Gemini_2.0_Flash-orange?logo=google)](https://deepmind.google/technologies/gemini/)
[![Live Sandbox](https://img.shields.io/badge/Live_Sandbox-mantis--clonefest.vercel.app-purple?logo=vercel)](https://mantis-clonefest.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Mantis** is an enterprise-grade modernization of the defect tracking, vulnerability scoring, and release governance platform. Built with **Fastify 4**, **PostgreSQL 16**, and **Next.js 14**, it replaces 25-year-old legacy infrastructure with **5 unbeatable algorithmic and security moats**: an interactive CPM critical path engine, a FIRST.org CVSS v4.0 math calculator with live embargo countdowns, strict 404 zero-leakage group secrecy, formal FSM state transitions, and 1-Click Gemini 2.0 Flash AI triage.

---

## 📑 Table of Contents
1. [⚡ 60-Second Quick Start for Judges](#-60-second-quick-start-for-judges)
2. [👥 1-Click Evaluator Persona Accounts](#-1-click-evaluator-persona-accounts)
3. [🔄 End-to-End Defect Lifecycle Workflow](#-end-to-end-defect-lifecycle-workflow)
4. [🏆 The 5 Core Algorithmic & Security Moats](#-the-5-core-algorithmic--security-moats)
5. [💻 Modern Developer Ergonomics & Absorbed Features](#-modern-developer-ergonomics--absorbed-features)
6. [🐙 GitHub SCM Webhook & Live Traceability Demo](#-github-scm-webhook--live-traceability-demo)
7. [🏗️ System Architecture & Monorepo Structure](#️-system-architecture--monorepo-structure)
8. [📡 REST API & OpenAPI Swagger Explorer](#-rest-api--openapi-swagger-explorer)
9. [🧪 Master Test Suite (124/124 Tests Passing)](#-master-test-suite-124124-tests-passing)
10. [⚙️ Environment Variables & Deployment](#️-environment-variables--deployment)

---

## ⚡ 60-Second Quick Start for Judges

### 🌐 Option 1: Live Hosted Sandbox (Zero Setup)
Evaluate the fully interactive, hosted application immediately without installing anything:  
👉 **[https://mantis-clonefest.vercel.app](https://mantis-clonefest.vercel.app)**

---

### 💻 Option 2: Instant Test Verification (Pure Node.js — In-Memory Database)
Verify all 124 unit, algorithm, and integration tests in **under 4 seconds** with zero external database dependencies:
```bash
git clone https://github.com/OjasKugore/clonefest-2.git
cd clonefest-2
npm install
npm test
```
> **Runs all 124 tests across both `@mantis/api` and `@mantis/web` packages** using an integrated high-speed in-memory PostgreSQL engine (`pg-mem`).

---

### 🐳 Option 3: Local Full-Stack Run with Docker & PostgreSQL 16
```bash
# 1. Verify your environment and open ports
npm run preflight

# 2. Boot PostgreSQL 16, run migrations & seed 30 master test defects
docker compose up -d db
npm run migrate
npm run seed

# 3. Start the Next.js Frontend and Fastify API servers
npm run dev
```
- **Web Application**: [`http://localhost:3000`](http://localhost:3000)
- **Fastify API Server**: [`http://localhost:3001`](http://localhost:3001)
- **Interactive Swagger / OpenAPI Docs**: [`http://localhost:3001/docs`](http://localhost:3001/docs)

---

## 👥 1-Click Evaluator Persona Accounts

The login page (`/login`) includes **1-Click Fast Persona buttons** to instantly switch roles and test role-based access control, security isolation, and workflows without manual credential typing:

| Persona | Email | Role & Key Capabilities to Test |
|---|---|---|
| 👑 **System Admin** | `admin@mantis.local` | Platform administrator: team invite dispatch, group blessing, product management |
| 🛡️ **Carol (Security Lead)** | `carol@mozilla.com` | `security-team` member: access to 90-day embargoed zero-days, CVSS v4.0 scoring |
| 💻 **Alice (Core Developer)** | `alice@mozilla.com` | Engine developer: blocker triage, interactive CPM DAG visualizer |
| 🧪 **Bob (QA Lead)** | `bob@mozilla.com` | Verification engineer: bug confirmation, state transitions, flag reviews |
| ⚡ **Dave (Performance Eng)** | `dave@mozilla.com` | Systems engineer: sprint burndown, milestone readiness gauge, MTTR velocity |
| 🎯 **Eve (Triage Coordinator)** | `eve@mozilla.com` | Triage manager: duplicate detection, priority assignment, Gemini AI synthesis |

*All seed accounts use standard password:* `password123`

---

## 🔄 End-to-End Defect Lifecycle Workflow

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

## 🏆 The 5 Core Algorithmic & Security Moats

### 1. 🕸️ Interactive Dependency Graph & Critical Path Engine (CPM)
* **Algorithmic Foundation**: Implements **Kahn's Algorithm** for topological sorting combined with Dynamic Programming to compute the Earliest Finish Time (EFT) across defect dependency subgraphs.
* **Pulsing Bottleneck Identification**: Automatically discovers the longest sequential chain of unresolved blockers and renders them in **pulsing animated red stroke lines** (`#EF4444` `.critical-edge`), allowing engineering leads to see release blockers instantly.
* **Server-Side Recursive Cycle Rejection**: Employs recursive PostgreSQL Common Table Expressions (CTEs) before creating dependency edges. Any cyclic dependency (e.g. `Bug A -> Bug B -> Bug A`) is rejected with HTTP `422 CYCLIC_DEPENDENCY_DETECTED`.
* **Interactive React Flow Canvas**: Drag, zoom, and inspect dependencies with automatic Dagre hierarchical layouts and a slide-over details drawer on node click.

```
       [Bug #101: Necko Socket Engine (4h)]  <-- CRITICAL PATH (Pulsing Red)
                         │
                         ▼
        [Bug #102: Wayland Buffer Sync (3h)] <-- CRITICAL PATH (Pulsing Red)
                         │
                         ▼
       [Bug #106: SpiderMonkey JIT Bail (2.5h)] <-- CRITICAL PATH (Total: 9.5h)
```

---

### 2. 🛡️ FIRST.org CVSS v4.0 Math Engine & 90-Day Embargo
* **Official FIRST.org Vector Calculation**: Full implementation of the CVSS v4.0 specification computing discrete MacroVectors across 5 equivalent metric groups (`EQ1`–`EQ5`):
  * **EQ1**: Attack Vector (`AV`), Attack Complexity (`AC`), Attack Requirements (`AT`)
  * **EQ2**: Privileges Required (`PR`), User Interaction (`UI`)
  * **EQ3**: Vulnerable System Confidentiality (`VC`), Integrity (`VI`), Availability (`VA`)
  * **EQ4**: Subsequent System Confidentiality (`SC`), Integrity (`SI`), Availability (`SA`)
  * **EQ5**: Exploit Maturity (`E`)
* **Interactive Visual Calculator Modal**: Security leads can pick metric values with real-time vector string generation (e.g., `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`) and live animated 0.0–10.0 score arc.
* **Automated 90-Day Embargo Disclosure Banner**: Quarantining a defect defaults the disclosure embargo to `NOW() + INTERVAL '90 days'`, displaying a live ticking **`DD:HH:MM:SS` countdown timer banner**.

---

### 3. 🔒 Formal Finite State Machine & 404 Zero-Leakage Secrecy
* **Strict Server-Side State Validation**:
  ```
  UNCONFIRMED ──► CONFIRMED ──► IN_PROGRESS ──► RESOLVED ──► VERIFIED ──► CLOSED
                      ▲              │              │           │
                      └──────────────┴──────────────┴───────────┘ (Reopen)
  ```
* **Resolution Guard**: Enforces mandatory resolution codes (`FIXED`, `INVALID`, `WONTFIX`, `DUPLICATE`, `WORKSFORME`, `INCOMPLETE`) when moving to `RESOLVED`, and automatically clears resolution upon reopening.
* **Zero Data Leakage (404 Secrecy)**: Unauthorized requests for embargoed or restricted security defects return **HTTP 404 Not Found** (never 403 Forbidden). Attackers cannot enumerate bug IDs or detect the existence of zero-day vulnerabilities.
* **Immutable Append-Only Audit Trail**: Every field modification is permanently recorded in `bugs_activity` with who changed it, timestamp, old value, and new value. Rows are never mutated or deleted.

---

### 4. ✨ 1-Click AI Triage Assistant (Gemini 2.0 Flash)
* **Sub-2-Second Synthesis**: One click sends the defect description and up to 30 comment threads to **Gemini 2.0 Flash**.
* **Structured Triage JSON**: Outputs structured analysis including:
  1. 2-sentence root cause summary
  2. Suggested priority (`P1`–`P5`) with justification
  3. Suggested component routing
  4. Recommended engineering action items
* **Resilient Fallback Design**: Protected with a 2.5-second hard timeout and graceful fallback to ensure the UI never blocks.

---

### 5. 🚩 Three-State Review Flag Governance (`?`, `+`, `-`)
* **Independent Approval Pipeline**: Review, needinfo, and uplift flags (`review?`, `needinfo?`, `approval?`) are tracked independently of the defect's core status.
* **Targeted Requestees**: Flags can be requested from specific team members (e.g. `review?alice_dev`) or open to group queues.
* **Permissioned Grant Groups**: Transitioning flags to `+` (granted) or `-` (denied) validates user membership in authorized grant groups (e.g. Release Management or Core Reviewers).

---

## 💻 Modern Developer Ergonomics & Absorbed Features

| Feature | Technology | Value & Description |
|---|---|---|
| **`⌘K` Spotlight Command Palette** | `cmdk` | Instant fuzzy jump to bug numbers (`104`), status transitions (`status:resolved`), assigning to self (`assign:me`), and workspace navigation. |
| **Drag-and-Drop Kanban Board** | `@dnd-kit/core` | 6-column workflow board with priority indicators, assignee avatars, and **optimistic rollback** (card bounces back if FSM rejects transition). |
| **Stemmed Full-Text Search** | PostgreSQL `tsvector` + GIN | Sub-20ms stemmed search (e.g. searching `"parse"` matches `"parsing"` and `"parsed"`) with matching terms highlighted in `<mark>` tags. |
| **Live Typeahead Duplicate Prevention** | `pg_trgm` | Live trigram similarity check (> 0.28) surfacing duplicate candidates *before* submission, preventing clutter. |
| **GFM Markdown & Code Copy** | `react-markdown` + `rehype` | Dual-tab Write/Preview editor with syntax-highlighted code blocks and 1-click **Copy to Clipboard** buttons. |
| **Interactive @Mentions** | Regex + Avatar Typeahead | Type `@` to select users with instant inline badge rendering and notification bell alerts. |
| **Milestone Release Readiness** | Custom Risk Formula | Explainable **0–100% circular health gauge** mathematically penalizing open CPM blockers, CVSS criticals, and pending flags. |
| **Pure SQL MTTR & Velocity** | PostgreSQL Aggregations | Real-time Mean Time To Resolve metrics and sprint burndown velocity computed directly over `bugs_activity` diffs. |

---

## 🐙 GitHub SCM Webhook & Live Traceability Demo

Mantis includes an **HMAC-SHA256 verified GitHub webhook receiver** that automatically parses commit messages and pull requests to link commits and auto-resolve tickets.

### ⚡ 30-Second Live Webhook Test (For Judges)
You can verify live Git-to-Bugzilla traceability right now by pushing to the demo repository:

1. **Clone the demo repository**:
   ```bash
   git clone https://github.com/OjasKugore/mantis-webhook-demo.git
   cd mantis-webhook-demo
   ```
2. **Make an empty commit referencing any Mantis Bug ID**:
   ```bash
   # Reference Bug #1 (or any bug in your workspace)
   git commit --allow-empty -m "Fix memory leak in network pipeline (Fixes #1)"
   git push origin main
   ```
3. **Watch it update live**:
   - Open [`https://mantis-clonefest.vercel.app/bugs/1`](https://mantis-clonefest.vercel.app/bugs/1).
   - Click the **"SCM"** tab under the activity panel.
   - The commit hash, author name, timestamp, and GitHub diff link appear **instantly**, and the defect automatically transitions to **`RESOLVED (FIXED)`**.

### 📝 Supported Commit Syntax
| Commit Syntax | Example | Result in Mantis |
|---|---|---|
| `Fixes #<id>` | `git commit -m "Optimize query index (Fixes #4)"` | Links commit SHA & auto-resolves defect to `RESOLVED (FIXED)` |
| `Closes #<id>` | `git commit -m "Patch auth timeout (Closes #12)"` | Links commit SHA & auto-resolves defect to `RESOLVED (FIXED)` |
| `Resolves #<id>` | `git commit -m "Update CSP header rules (Resolves #7)"` | Links commit SHA & auto-resolves defect to `RESOLVED (FIXED)` |
| `Bug <id>` | `git commit -m "Bug 2: Wayland surface buffer sync"` | Links commit and author metadata to bug audit trail |

---

## 🏗️ System Architecture & Monorepo Structure

```
clonefest-2/
├── apps/
│   ├── api/                              # Fastify 4 + PostgreSQL 16 Backend (Port 3001)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── client.ts             # pg.Pool singleton connection manager
│   │   │   │   └── migrations/           # 001_initial.sql, 002_team_invites.sql, 003_onboarding.sql
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts               # Argon2id Session Cookie Auth Middleware
│   │   │   │   └── groupFilter.ts        # 404 Zero-Leakage Group Security Filter
│   │   │   ├── routes/
│   │   │   │   ├── bugs.ts               # Bug CRUD, /status, /duplicates (pg_trgm)
│   │   │   │   ├── dependencies.ts       # CPM Topological Sort & Recursive CTE Cycle Rejection
│   │   │   │   ├── security.ts           # FIRST.org CVSS v4.0 & 90-Day Embargo System
│   │   │   │   ├── aiTriage.ts           # Gemini 2.0 Flash Structured Thread Triage
│   │   │   │   ├── webhooks.ts           # HMAC-SHA256 GitHub SCM Auto-Close Handler
│   │   │   │   ├── analytics.ts          # Pure SQL MTTR & Sprint Velocity Aggregations
│   │   │   │   ├── comments.ts           # GFM Markdown Comments & Parent-Child Threads
│   │   │   │   ├── notifications.ts      # Unread Notification Queries & Mark-All-Read
│   │   │   │   ├── flags.ts              # Three-State Review Flags (? / + / -)
│   │   │   │   ├── search.ts             # GIN FTS tsvector Stemmed Search Engine
│   │   │   │   └── auth.ts               # Argon2id Signup, Login, Logout, /me
│   │   │   ├── services/
│   │   │   │   ├── cpm.ts                # Kahn's Algorithm & Earliest Finish Time (EFT)
│   │   │   │   ├── cvss4.ts              # FIRST.org MacroVector Math Engine (EQ1-EQ5)
│   │   │   │   ├── stateMachine.ts       # FSM Transition Rules & Resolution Validator
│   │   │   │   ├── aiTriage.ts           # Gemini 2.0 Flash SDK Integration
│   │   │   │   ├── webhookParser.ts      # Commit Message Issue Reference Extractor
│   │   │   │   ├── mentionParser.ts      # @mention Regex & Notification Dispatcher
│   │   │   │   └── audit.ts              # Immutable bugs_activity Appender
│   │   │   └── server.ts                 # Fastify Server & Swagger OpenAPI Gateway
│   │   └── test/                         # 19 Backend Test Suites (88 Unit & Integration Tests)
│   └── web/                              # Next.js 14 App Router Frontend (Port 3000)
│       ├── app/
│       │   ├── bugs/                     # Bug List (FTS), New Bug Form, Bug Detail ([id])
│       │   │   └── [id]/graph/           # React Flow Interactive CPM DAG Visualizer
│       │   ├── kanban/                   # Drag-and-Drop Kanban Board with FSM Rollback
│       │   ├── dashboard/                # Milestone Readiness Score & MTTR Analytics
│       │   ├── login/ & signup/          # 1-Click Fast Persona & Custom Auth Pages
│       │   ├── onboarding/ & invite/     # Team Creation & Priority Rank Management
│       │   └── settings/                 # Products & Team Administration
│       ├── components/
│       │   ├── DependencyGraph.tsx       # React Flow + Dagre + Pulsing Critical Path
│       │   ├── CvssModal.tsx             # Interactive CVSS v4.0 Score Arc Calculator
│       │   ├── EmbargoCountdown.tsx      # Live DD:HH:MM:SS Disclosure Banner
│       │   ├── CommandPalette.tsx        # cmdk ⌘K Spotlight Modal
│       │   ├── KanbanBoard.tsx           # @dnd-kit 6-Column Workflow Board
│       │   ├── CommentEditor.tsx         # Dual-tab Write/Preview Markdown with @mentions
│       │   ├── AiTriageCard.tsx          # Glassmorphic Gemini AI Summary Card
│       │   └── NotificationBell.tsx      # Notification Popover & Unread Count Badge
│       ├── lib/                          # Client DB Adaptors, In-Memory Engine & Session Tokens
│       └── test/                         # 12 Frontend Test Suites (36 Unit & Integration Tests)
├── docs/                                 # Clean Documentation Directory
│   ├── defect-lifecycle.md               # Complete FSM & Mermaid Workflow Spec
│   ├── features-and-moats.md             # In-Depth Algorithmic & Math Formulas Spec
│   └── webhook-integration.md            # GitHub SCM Webhook Setup & Live Demo Guide
├── packages/shared/                      # Shared TypeScript Interfaces, Enums & Models
├── scripts/preflight.mjs                 # Environment Health & Port Availability Checker
├── docker-compose.yml                    # PostgreSQL 16 Alpine Container Definition
└── README.md                             # Unified Platform Documentation
```

---

## 📡 REST API & OpenAPI Swagger Explorer

Mantis provides an interactive OpenAPI / Swagger 3.1 interface running at **`http://localhost:3001/docs`** with live schema definitions and "Try It Out" execution.

### Key REST Endpoints
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user credentials and issue signed HttpOnly session cookie |
| `POST` | `/api/v1/auth/quick-login` | 1-Click Fast Persona quick-login for evaluators |
| `GET` | `/api/v1/bugs` | Paginated defect query with status/priority filtering and group security |
| `POST` | `/api/v1/bugs` | Create a new defect with transactional initial activity logging |
| `GET` | `/api/v1/bugs/:id` | Fetch defect details with activity diffs (enforces 404 security secrecy) |
| `PATCH` | `/api/v1/bugs/:id/status` | Mutate status via server-side FSM (rejects invalid transitions with 422) |
| `GET` | `/api/v1/bugs/:id/graph` | Traverse dependency DAG, execute Kahn's CPM, and return critical path IDs |
| `POST` | `/api/v1/bugs/:id/dependencies` | Add blocker edge with recursive CTE cycle detection |
| `PATCH` | `/api/v1/bugs/:id/security` | Update CVSS v4.0 vector, score, and set 90-day embargo quarantine |
| `POST` | `/api/v1/bugs/:id/ai-triage` | Synthesize comment threads with Gemini 2.0 Flash into root causes |
| `POST` | `/api/v1/webhooks/github` | HMAC-verified GitHub push webhook receiver for auto-resolving defects |
| `GET` | `/api/v1/analytics/velocity` | Compute Mean Time To Resolve (MTTR) and resolution metrics over audit stream |

---

## 🧪 Master Test Suite (124/124 Tests Passing)

Mantis contains **31 test files with 124 named assertions** running under Vitest. All tests run in parallel and pass with a 100% green pass rate in ~4.1 seconds:

```bash
npm test
```

```
========================================================================
  PACKAGE               TEST SUITES   TESTS PASSING   EXECUTION TIME
========================================================================
  @mantis/api (Backend)     19             88            ~3.5s
  @mantis/web (Frontend)    12             36            ~0.6s
------------------------------------------------------------------------
  TOTAL                     31            124            ~4.1s (100% Green)
========================================================================
```

### Key Verification Assertions:
- ✅ **Cryptographic Security**: Argon2id password hashing, constant-time verification, SHA-256 session token hashing.
- ✅ **State Machine Rigor**: All 6 valid transitions succeed; illegal shortcuts and missing resolution codes return 422.
- ✅ **CPM Graph Engine**: Kahn's topological sort identifies longest duration path on diamond and multi-hop DAGs; circular dependencies rejected.
- ✅ **CVSS v4.0 Math Engine**: Benchmark test vectors match official FIRST.org lookup tables (e.g. Score `9.3 CRITICAL`, `1.8 LOW`, `8.7 HIGH`).
- ✅ **404 Group Secrecy**: Non-members requesting embargoed zero-days receive strict 404s without ID or summary leakage.
- ✅ **SCM Webhooks**: HMAC signature verification and `Fixes #1` commit auto-closing verified.

---

## ⚙️ Environment Variables & Deployment

### Configuration (`.env` / `.env.local`)
```env
# Database Connection (PostgreSQL 16)
DATABASE_URL=postgresql://bz:bz@localhost:5432/mantis

# Session Authentication
SESSION_SECRET=a_very_secure_random_string_of_at_least_32_characters

# AI Triage Engine (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub SCM Webhooks
GITHUB_WEBHOOK_SECRET=demo-secret

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📄 License

Mantis is open-source software licensed under the [MIT License](LICENSE).
