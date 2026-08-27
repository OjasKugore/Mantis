# Implementation Rules & Best Practices Guide (v2 — Deadline Edition)
## Blueprint for Agents Building `implementation_plan.md` — Hard Deadline: Aug 30, 11:59 PM

> **Purpose**: This is the operating manual for an AI coding assistant and engineering team building a modern Bugzilla replacement against a **hard 72-hour deadline**. It replaces open-ended multi-week roadmaps with a tightly scoped, phase-locked, buildable engineering plan. Every deliverable below is selected because it is achievable within the deadline **AND** directly secures high marks on the 100-point evaluator rubric.

**Core Operating Rule**: Build strictly in phase order. Do not start Phase 2 until Phase 1 is functional end-to-end (create a bug, view in list, mutate status, verify audit history, run tests). Do not start Phase 3 until Phase 2's features pass all verification tests. If time runs out, the existing completed phases must be in a 100% demo-ready, error-free state.

---

## 1. Core Architectural Invariants (Never Break These)

1. **Stable Numeric Bug IDs**:
   * Use `id BIGINT GENERATED ALWAYS AS IDENTITY (CACHE 1)` as the primary key.
   * Bug identifiers in the UI and URLs must remain sequential integers (`Bug #101`, `/bugs/101`).
   * Never expose UUIDs or random hashes as the primary user-facing bug identifier.
   * *Note*: Term this "monotonic and collision-free" in plans (not "gapless" — rolled-back transactions can consume an ID, which matches real-world Bugzilla behavior).
2. **Append-Only Audit Trail (`bugs_activity`)**:
   * Every field mutation must append a row: `(bug_id, who, changed_at, field, old_value, new_value)`.
   * Never execute an `UPDATE` or `DELETE` on the `bugs_activity` table.
3. **Group-Based Visibility**:
   * Bugs can belong to a restricted security or product group.
   * Unauthorized users/API requests must never receive the bug, not even its ID or title, in list or search results.
4. **Three-State Flags (`?`, `+`, `-`)**:
   * Review and approval flags (`review?`, `needinfo?`) live in a dedicated `flags` table.
   * They must remain completely distinct from `bugs.status`.

---

## 2. Locked Technology Stack (No Either/Or — Move Fast)

| Layer | Technology Choice | Architectural Rationale for 72-Hour Scope |
|---|---|---|
| **Database** | **PostgreSQL 16** | Native relational ACID, recursive CTEs for DAGs, built-in Full-Text Search (`tsvector`/GIN). No separate search or vector database to configure. |
| **Backend** | **Node.js 20 + Fastify + TypeScript** | High throughput, sub-millisecond route overhead, clean schema validation via TypeBox/Zod, single language across stack. |
| **API Protocol**| **RESTful JSON only** | Single API surface. Skip GraphQL entirely (adds complexity with zero rubric gain at this scope). |
| **Frontend** | **Next.js 14 (App Router) + React + Tailwind CSS** | Server-side rendering, fast routing, CSS variables for instant zero-runtime dark/light mode switching. |
| **Graph Engine**| **`@xyflow/react` (React Flow) + `dagre`** | Synchronous, lightweight layout engine; zero Web Worker boilerplate needed for demo-scale graphs (<100 nodes). |
| **UI Menus** | **`cmdk` (shadcn Command)** | Sub-10ms fuzzy keyboard-first navigation for power-user wow factor. |
| **Kanban DND** | **`@dnd-kit/core`** | Minimal, modern drag-and-drop primitives for ticket status boards. |
| **Auth** | **Argon2id + HTTP-Only Signed Session Cookies** | Bulletproof, standard web security; avoids complex OAuth setup. |
| **Test Runner**| **Vitest (Unit) + Fastify `inject` / Supertest (Integration)** | Sub-second execution speed, zero external test harness overhead. |

> [!IMPORTANT]
> **No Redis, No BullMQ, No Meilisearch, No pgvector** in this scope. Nothing in this buildable plan requires an external background queue or separate search daemon. Removing these cuts 4 hours of infrastructure setup and eliminates deployment failure points.

---

## 3. Phased Implementation Plan (Build & Test Sequentially)

```
[ Phase 1: Baseline Core (Day 1) ] ──► [ Phase 2: Evaluator Moats (Day 2) ] ──► [ Phase 3: High-Value Polish (Day 3) ]
  • PostgreSQL DDL & Auth                • React Flow + Dagre Graph               • Cmd+K Command Palette
  • Bug CRUD & Server State Machine      • Critical Path Highlight (Red)          • Postgres tsvector Full-Text Search
  • Immutable `bugs_activity` Log        • CVSS v4.0 Vector Calculator            • Drag-and-Drop Kanban Board
  • Group-based Row Security Filters     • 90-Day Embargo Countdown               • Lightweight Live Polling/Broadcast
```

### Phase 1: Core Modernization Baseline (Mandatory — Day 1)
* **Goal**: Deliver a rock-solid, fully functioning bug tracking core replicating Bugzilla's foundational capabilities.
* **Deliverables**:
  1. PostgreSQL schema: `bugs`, `products`, `components`, `users`, `bugs_activity`, `flags`, `groups`, `bug_group_map`.
  2. Authentication: User registration, login, Argon2id hashing, secure session management.
  3. REST API (`/api/v1/bugs`): Paginated listing, create, retrieve by ID, and update.
  4. Server-Side State Machine: Enforces valid transitions (`UNCONFIRMED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `VERIFIED` $\rightarrow$ `CLOSED`). Invalid moves reject with HTTP 422.
  5. Transactional Audit Logging: Every field update writes to `bugs_activity` in the same database transaction.
  6. Group-Based Visibility Middleware: Filters unauthorized bugs out of list, get, and search queries.
  7. Next.js App UI: Responsive sidebar, filterable bug table, create bug modal, and bug detail page.

### Phase 2: Evaluator Moats & High-Impact Differentiators (Day 2)
* **Goal**: Deliver the two highest-scoring, self-contained features that wow evaluators without distributed systems complexity.
* **Deliverable 1: Interactive Dependency Graph**:
  * Relational table: `bug_dependencies (blocking_bug_id, blocked_bug_id)` with `CHECK (blocking_bug_id <> blocked_bug_id)`.
  * Server-side recursive CTE cycle check: Rejects circular dependency creation before insert with HTTP 422.
  * Frontend React Flow canvas with `dagre` hierarchical layout.
  * **Critical Path Method (CPM)**: Computes the longest unresolved dependency chain and renders it in high-contrast **pulsing red**.
  * Slide-over quick-edit drawer on node click.
* **Deliverable 2: CVSS v4.0 Calculator & Embargo Countdown**:
  * Interactive CVSS v4.0 calculator widget calculating Base, Threat, and Environmental scores against the official FIRST.org formula.
  * Generates canonical vector string (e.g. `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`) and numeric score (0.0–10.0).
  * Embargo metadata: `is_embargoed BOOLEAN`, `embargo_until TIMESTAMPTZ`.
  * Prominent **live countdown clock** rendered client-side from timestamp.
  * Enforces that embargoed security tickets are hidden from unprivileged users.

### Phase 3: High-Value Polish & The "95+ Score Levers" (Day 3)
* **Goal**: Maximize User Experience (15 pts), Technical Architecture (15 pts), and Innovation (20 pts) to push overall evaluation into the **95+ Championship Bracket**.
* **Order of Execution**:
  1. **Command Palette (`⌘K`)**: `cmdk` modal allowing keyboard navigation, instant ticket jump (`#104`), and zero-mouse actions (`assign:me`, `status:resolved`).
  2. **PostgreSQL Full-Text Search**: Generated `tsvector` column on `bugs(summary, description)` indexed with GIN. Fast search bar supporting word stems without external search daemons.
  3. **Kanban Status Board**: `@dnd-kit` multi-column board mapping to Bugzilla workflow columns, calling the Phase 1 transition endpoint on drag-drop.
  4. **1-Click "✨ AI Triage Assistant" Endpoint (The AI Shield)**:
     - 45-minute zero-infra endpoint (`POST /api/v1/bugs/:id/ai-triage`) calling `gpt-4o-mini` with a 2s timeout.
     - Distills bug thread into: (a) 2-sentence Root Cause Summary, (b) Suggested Priority & Component with rationale, (c) Action Items.
     - Silences evaluator "AI bias" without requiring complex vector infrastructure or background queues.
  5. **Interactive Swagger / OpenAPI 3.1 UI at `/docs`**:
     - Fastify `@fastify/swagger` + `@fastify/swagger-ui` mounted at `http://localhost:3001/docs`.
     - Provides an interactive, live API explorer with schemas and "Try It Out" buttons, proving enterprise architecture rigor.
  6. **"Linear Polish" Power Ergonomics (`j`/`k` list navigation)**:
     - In the bug table, pressing `j` moves down, `k` moves up, and `Enter` opens ticket. Pressing `?` displays shortcut cheat sheet.
  7. **Lightweight Live Updates**: 5-second polling or simple WebSocket broadcast refreshing ticket views on remote updates.

### Phase 4: Future Roadmap (Documented Only)
* Fully documented in architectural specs as Phase 4 future work: CRDT multiplayer with Yjs/y-redis, Code Navigation with Monaco/Git, AI vector triage via pgvector, multi-tenant XML migration, and full PWA offline mode. Listing them proves deep architectural forethought without burning implementation runway.

---

## 4. Mandatory Unit & Integration Testing Matrix

Every feature implemented across Phases 1–3 **must include automated tests**. Below is the required test catalog:

### Phase 1 Testing Suite

#### 1. Authentication & Security
* **Unit Tests (`test/unit/auth.test.ts`)**:
  - `Argon2id`: Verifies password hashing generates valid salt and matches plaintext on verification.
  - `Argon2id`: Verifies incorrect password fails verification.
  - `Session Token`: Verifies token signer creates valid signatures and rejects tampered tokens.
* **Integration Tests (`test/integration/auth.test.ts`)**:
  - `POST /api/v1/auth/signup`: Successfully creates user with hashed password; rejects duplicate email with HTTP 409.
  - `POST /api/v1/auth/login`: Issues HTTP-only session cookie on valid credentials; returns HTTP 401 on invalid credentials.

#### 2. Bug CRUD & State Machine
* **Unit Tests (`test/unit/state_machine.test.ts`)**:
  - Valid transitions: `UNCONFIRMED → CONFIRMED`, `CONFIRMED → IN_PROGRESS`, `IN_PROGRESS → RESOLVED`, `RESOLVED → VERIFIED`, `VERIFIED → CLOSED` all return `isValid = true`.
  - Invalid transitions: `UNCONFIRMED → CLOSED`, `RESOLVED → IN_PROGRESS` (without reopening), `CLOSED → CONFIRMED` all return `isValid = false` with transition violation reason.
* **Integration Tests (`test/integration/bugs.test.ts`)**:
  - `POST /api/v1/bugs`: Creates bug with sequential numeric ID (e.g. `101`, then `102`). Initial `bugs_activity` record created in same transaction.
  - `PATCH /api/v1/bugs/:id/status`:
    - Valid move: Updates status, writes diff record to `bugs_activity (field: 'status', old_value: 'CONFIRMED', new_value: 'IN_PROGRESS')`.
    - Invalid move: Returns HTTP 422 with `{ error: "INVALID_STATUS_TRANSITION" }`. Database remains untouched.
  - `GET /api/v1/bugs`: Returns paginated list; supports filtering by `product_id` and `status`.

#### 3. Group Visibility & Access Control
* **Integration Tests (`test/integration/visibility.test.ts`)**:
  - Create Bug #105 assigned to restricted group `security-team`.
  - Unauthenticated / Non-member request:
    - `GET /api/v1/bugs/105` returns HTTP 404 (does not leak bug existence).
    - `GET /api/v1/bugs` list excludes Bug #105 entirely.
  - Member of `security-team` request:
    - `GET /api/v1/bugs/105` returns full bug details.
    - `GET /api/v1/bugs` list includes Bug #105.

#### 4. Three-State Flags (`review?/+/-`)
* **Integration Tests (`test/integration/flags.test.ts`)**:
  - `POST /api/v1/bugs/:id/flags`: Request flag `review?` to target user.
  - `PATCH /api/v1/flags/:id`: Transition from `?` to `+` (granted) or `-` (denied).
  - Asserts flag status changes do not mutate `bugs.status`.

---

### Phase 2 Testing Suite

#### 1. Interactive Dependency Graph & Cycle Rejection
* **Unit Tests (`test/unit/graph_cpm.test.ts`)**:
  - **Critical Path Calculation**: Given a known DAG:
    - Path A: `101 (2h) → 102 (3h) → 104 (5h)` = 10h
    - Path B: `101 (2h) → 103 (1h) → 104 (5h)` = 8h
    - Asserts CPM engine returns `[101, 102, 104]` as Critical Path.
  - **Single Node / Disconnected DAG**: Handles zero-edge graphs gracefully without crashing.
* **Integration Tests (`test/integration/dependencies.test.ts`)**:
  - `POST /api/v1/bugs/:id/dependencies`:
    - Self-link: `POST /api/v1/bugs/101/dependencies { depends_on_id: 101 }` rejects with HTTP 400 (`CHECK` constraint).
    - Valid link: `101 blocks 102` inserts successfully.
    - Direct cycle: If `101 blocks 102`, attempting `102 blocks 101` returns HTTP 422 `{ error: "CYCLIC_DEPENDENCY_DETECTED" }`.
    - Indirect cycle: `101 → 102 → 103`. Attempting `103 blocks 101` returns HTTP 422. Database transaction rolls back.
  - `GET /api/v1/bugs/:id/graph`: Returns formatted nodes, edges, and `criticalPathIds: [...]`.

#### 2. CVSS v4.0 Calculator & Embargo Engine
* **Unit Tests (`test/unit/cvss4.test.ts`)**:
  - **FIRST.org Benchmark Vectors**:
    - Vector 1: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N` $\rightarrow$ Score: `9.3`, Severity: `CRITICAL`.
    - Vector 2: `CVSS:4.0/AV:L/AC:H/AT:P/PR:L/UI:P/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N` $\rightarrow$ Score: `1.8`, Severity: `LOW`.
    - Vector 3: Invalid vector string returns validation error.
  - **Embargo Timer Utility**:
    - Computes remaining days, hours, and minutes until target timestamp.
    - Flags `isExpired = true` when current time is past expiry.
* **Integration Tests (`test/integration/security_bugs.test.ts`)**:
  - `POST /api/v1/bugs` with `is_embargoed: true` and `embargo_until: NOW() + 90 days`:
    - Stores CVSS v4.0 vector string and numeric score.
    - Unauthenticated request to `/api/v1/bugs/:id` returns HTTP 404.
    - Security team request returns bug with embargo countdown payload.

---

### Phase 3 Testing Suite

#### 1. Command Palette (`⌘K`)
* **Unit Tests (`test/unit/command_palette.test.ts`)**:
  - Fuzzy matcher: Typing `res` matches action `status:resolved`.
  - Bug ID matcher: Typing `104` matches direct jump to `Bug #104`.

#### 2. PostgreSQL Full-Text Search
* **Integration Tests (`test/integration/search.test.ts`)**:
  - Insert Bug with summary: *"NullPointerException when parsing HTTP authorization headers"*.
  - `GET /api/v1/bugs/search?q=parse`: Matches bug (verifying word stemming `parsing → parse`).
  - `GET /api/v1/bugs/search?q=unrelated`: Returns empty array.
  - Security search check: Search query executed by unprivileged user never returns embargoed/group-restricted bugs matching keyword.

#### 3. Kanban Drag-and-Drop
* **Integration Tests (`test/integration/kanban.test.ts`)**:
  - `PATCH /api/v1/bugs/:id/status` triggered by board column drop:
    - Moving card from `CONFIRMED` to `IN_PROGRESS` returns HTTP 200 with updated status and audit record.
    - Illegal drag (e.g. `UNCONFIRMED` to `CLOSED`) returns HTTP 422; frontend rolls card back to original column.

#### 4. AI Triage Assistant & Swagger Documentation
* **Unit / Mock Tests (`test/unit/ai_triage.test.ts`)**:
  - Validates prompt assembly contains bug title, description, and comment corpus.
  - Verifies structured JSON response parsing (summary, suggested priority, action items).
  - Graceful fallback: If LLM service times out or API key is absent, returns clean `{ error: "AI_SERVICE_UNAVAILABLE", fallback: true }` without crashing the page.
* **Integration Tests (`test/integration/swagger.test.ts`)**:
  - `GET /docs`: Returns HTTP 200 with Swagger UI HTML and valid OpenAPI 3.1 JSON schema.

---

## 5. What Was Deliberately Cut, and Why

| Deliberate Cut | Technical & Strategic Rationale |
|---|---|
| **Yjs / y-redis CRDT Multiplayer** | Full crash recovery (recovering state after killing server mid-keystroke) requires hours of distributed systems testing. Replaced with simpler client-side CVSS v4.0 + Embargo Countdown with equal evaluator wow factor. |
| **Monaco AST Code Navigation** | Requires live Git OAuth, local repo cloning, syntax chunking, and token management. Too fragile to stand up reliably in 72h. |
| **pgvector / Semantic Vector Search** | Calling external embedding APIs in the loop introduces rate limits, API key costs, and latency. PostgreSQL built-in `tsvector` FTS delivers sub-20ms search with zero external infra. |
| **Meilisearch & Redis/BullMQ** | Eliminates 3 external daemon containers, saving hours of configuration and preventing deployment connection failures. |
| **GraphQL Alongside REST** | Avoids maintaining two duplicate API surfaces with zero additional rubric gain. |
| **Automated SLA Escalation Engine** | Event-driven cron/escalation ladders belong in Phase 4 enterprise hardening. |

---

## 6. Feature Specification Template (For Implementation)

When documenting or implementing any feature from Phases 1–3, adhere strictly to this format:

```markdown
### Feature X.X: [Feature Name]
1. Objective & Problem Solved — 1-2 sentences on the legacy gap addressed.
2. Data Model & Migrations — SQL DDL with types, PKs, FKs, and indexes.
3. Backend Endpoints & Payloads — Exact REST routes with JSON request/response.
4. Core Algorithmic Logic — Decision tree, state machine rules, or formulas.
5. Frontend Components — React component hierarchy and interaction model.
6. Automated Tests — Specific unit and integration test assertions.
```

---

## 7. Rubric Alignment Matrix (100-Point Authoritative Scorecard)

| Rubric Criterion | Weight | Deliverable Proving It in this 72-Hour Scope | Target Score |
|---|:---:|---|:---:|
| **Problem Understanding & Core Functionality** | **20 pts** | Sequential numeric Bug IDs, append-only `bugs_activity` audit trail, three-state flags (`review?`), and enforced server state machine (Phase 1). | **19 / 20** |
| **Innovation & Meaningful Differentiation** | **20 pts** | Interactive React Flow DAG with real-time pulsing red Critical Path; built-in CVSS v4.0 calculator & 90-day embargo countdown clock (Phase 2) + **1-Click AI Triage Assistant** (Phase 3). | **19 / 20** |
| **Performance & Reliability** | **20 pts** | Recursive CTE cycle rejection; server-enforced state machine rejecting illegal moves; 20+ automated tests + **1-Command Docker Compose (`docker compose up`)** (Phases 1–3). | **20 / 20** |
| **User Experience & Accessibility** | **15 pts** | Sub-10ms `⌘K` Command Palette, system-adaptive dark mode (CSS variables), drag-and-drop Kanban board, **`j`/`k` keyboard shortcuts + 30 seeded realistic bugs**. | **15 / 15** |
| **Technical Implementation & Architecture** | **15 pts** | Single clean TypeScript/Fastify runtime, PostgreSQL relational schema with recursive CTEs and FTS, **interactive Swagger UI at `/docs`**. | **15 / 15** |
| **Documentation & Engineering Rigor** | **10 pts** | Complete DDL schemas, comprehensive automated test suites, and explicit documentation explaining deliberate scope tradeoffs. | **10 / 10** |
| **TOTAL PROJECTED SCORE** | **100 pts** | **CHAMPIONSHIP / PODIUM BRACKET** | **98 / 100** |

---

## 8. 72-Hour Execution Countdown & Checkpoints

* **Checkpoint 1 (End of Day 1 — Aug 28, 11:59 PM)**:
  * [ ] PostgreSQL schema migrated and seeded with 30 realistic test bugs.
  * [ ] Auth working (signup/login/cookie).
  * [ ] Bug CRUD + status transition + `bugs_activity` log working.
  * [ ] Phase 1 test suite passing (100% green).
* **Checkpoint 2 (End of Day 2 — Aug 29, 11:59 PM)**:
  * [ ] Interactive Dependency Graph rendering nodes, edges, and pulsing red Critical Path.
  * [ ] Cycle detection CTE rejecting circular dependencies with HTTP 422.
  * [ ] CVSS v4.0 calculator computing scores against FIRST.org formulas.
  * [ ] Embargo countdown clock ticking on security tickets.
  * [ ] Phase 2 test suite passing (100% green).
* **Checkpoint 3 (Mid-Day 3 — Aug 30, 4:00 PM)**:
  * [ ] `⌘K` Command Palette working.
  * [ ] Postgres FTS search bar working.
  * [ ] Drag-and-drop Kanban board working.
  * [ ] 1-Click AI Triage Assistant endpoint working with fallback.
  * [ ] Fastify Swagger UI accessible at `/docs`.
  * [ ] `seed.ts` populating 30 realistic bugs with avatars and flags.
  * [ ] Phase 3 test suite passing.
* **Checkpoint 4 (Final Freeze — Aug 30, 8:00 PM to 11:59 PM)**:
  * [ ] **HARD FEATURE FREEZE**: No new features started.
  * [ ] Verify `docker compose up` starts Postgres, API, and Next.js cleanly with auto-seeding on fresh clone.
  * [ ] Run full test suite (`npm test`).
  * [ ] Execute manual end-to-end smoke test script.
  * [ ] Final git commit, clean README, push to repository.
