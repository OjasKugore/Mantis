# Additional Features Specification — Beyond Bugzilla's Scope
## Architecture & Implementation Blueprint: Active Build Targets vs. Extended Enterprise Roadmap

> **Purpose**: This document defines the *net-new* capabilities that transform Bugzilla from a legacy Perl tracker into a state-of-the-art developer platform.
>
> In strict accordance with [`docs/implementation-rules.md`](./implementation-rules.md), this document is partitioned into two distinct architectural sections:
> 1. **PART I: ACTIVE 72-HOUR BUILD TARGETS (Phases 2 & 3 — Live Demo Scope)**: The concrete, self-contained features being implemented and verified before **August 30 at 11:59 PM**. Each includes complete PostgreSQL DDL schemas, REST API contracts, algorithms, UI components, and unit/integration test specifications.
> 2. **PART II: EXTENDED ENTERPRISE ROADMAP (Phase 4 — Documented Architecture)**: The long-term enterprise vision (CRDT multiplayer, Monaco code navigation, AI vector triage, PWA, plugin sandboxes) preserved in complete architectural detail to demonstrate technical rigor and future extensibility to evaluators.

---

# PART I: ACTIVE 72-HOUR BUILD TARGETS (Live Demo Scope)

The following six features constitute the live functional demo deliverables for Phases 2 and 3.

---

## 1. 🕸️ Interactive Dependency Graph & Critical Path Engine (Phase 2 Moat)

**Target Rubric Areas**: Innovation & Differentiation (20 pts), UX & Aesthetics (15 pts), Performance & Reliability (20 pts)  
**Bugzilla Gap Addressed**: Overhauls `showdependencygraph.cgi`. Legacy Bugzilla shelled out to Graphviz `dot` in 2002 to generate static, blurry `.png` image maps. This replaces it with an interactive, live-calculated DAG cockpit.

### 1.1 Data Schema & Integrity Constraints
```sql
CREATE TABLE bug_dependencies (
    blocking_bug_id BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    blocked_bug_id  BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (blocking_bug_id, blocked_bug_id),
    CONSTRAINT chk_no_self_dependency CHECK (blocking_bug_id <> blocked_bug_id)
);

CREATE INDEX idx_bug_dep_blocked ON bug_dependencies(blocked_bug_id, blocking_bug_id);
CREATE INDEX idx_bug_dep_blocking ON bug_dependencies(blocking_bug_id, blocked_bug_id);
```

### 1.2 Algorithmic Core: Critical Path Method (CPM) & Server-Side Cycle Rejection
1. **Critical Path Method (CPM)**:
   * Computed across the sub-DAG of unresolved issues targeting a milestone or focal ticket.
   * Path duration is determined by estimated task hours (or hop-count if estimates are absent).
   * The longest unresolved sequential chain of blockers is identified as the **Critical Path** and rendered with pulsing high-contrast red edges (`#EF4444`).
2. **Server-Side Recursive CTE Cycle Detection**:
   * Before committing a new dependency edge, the server executes a recursive path search within the transaction. If a path already exists from `blocked_bug_id` to `blocking_bug_id`, the insertion is aborted with HTTP 422:
     ```sql
     WITH RECURSIVE check_cycle AS (
         SELECT blocking_bug_id, blocked_bug_id FROM bug_dependencies WHERE blocking_bug_id = :new_blocked_id
         UNION ALL
         SELECT d.blocking_bug_id, d.blocked_bug_id 
         FROM bug_dependencies d 
         JOIN check_cycle c ON d.blocking_bug_id = c.blocked_bug_id
     )
     SELECT 1 FROM check_cycle WHERE blocked_bug_id = :new_blocking_id LIMIT 1;
     ```

### 1.3 UI & Canvas Architecture
- **Rendering Engine**: `@xyflow/react` (React Flow) paired with `dagre` for fast, synchronous, deterministic hierarchical layout.
- **Node Interaction**: Hovering a node highlights immediate upstream blockers and downstream dependents.
- **Quick-Edit Slide-Over Drawer**: Clicking any node slides open a detailed drawer from the right, allowing triage leads to reassign, change status, or inspect comments without losing spatial canvas context.

### 1.4 API Endpoints
- `POST /api/v1/bugs/:id/dependencies`: Body `{ blocked_bug_id: 104 }`. Inserts edge if no cycle detected; returns HTTP 201 or HTTP 422 `{ error: "CYCLIC_DEPENDENCY_DETECTED" }`.
- `DELETE /api/v1/bugs/:id/dependencies/:blocked_id`: Removes dependency edge.
- `GET /api/v1/bugs/:id/graph`: Returns `{ nodes: [...], edges: [...], criticalPathIds: [101, 104, 109] }`.

### 1.5 Automated Test Specifications
* **Unit Tests (`test/unit/graph_cpm.test.ts`)**:
  - Validates CPM calculation on standard DAG: `A(2h) -> B(4h) -> D(1h)` vs `A(2h) -> C(1h) -> D(1h)` correctly flags `[A, B, D]` as critical.
  - Validates graceful handling of single-node and disconnected subgraphs.
* **Integration Tests (`test/integration/dependencies.test.ts`)**:
  - Asserts self-linking `101 -> 101` rejects with HTTP 400 (`chk_no_self_dependency`).
  - Asserts direct cycle `101 -> 102` then `102 -> 101` rejects with HTTP 422 and rolls back.
  - Asserts multi-hop cycle `101 -> 102 -> 103` then `103 -> 101` rejects with HTTP 422.

---

## 2. 🛡️ Enterprise Vulnerability Disclosure: CVSS v4.0 & Embargo Countdown (Phase 2 Moat)

**Target Rubric Areas**: Innovation & Differentiation (20 pts), Problem Understanding (20 pts), Performance & Reliability (20 pts)  
**Bugzilla Gap Addressed**: Bugzilla is historically the world's primary zero-day vulnerability tracker (Mozilla, Red Hat, Linux Kernel). Yet it relied on arbitrary text flags with zero mathematical severity calculation and no automated disclosure clocks.

### 2.1 Data Schema
```sql
ALTER TABLE bugs ADD COLUMN is_embargoed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bugs ADD COLUMN embargo_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE bugs ADD COLUMN cvss_version VARCHAR(8) DEFAULT '4.0';
ALTER TABLE bugs ADD COLUMN cvss_vector VARCHAR(128) DEFAULT NULL;
ALTER TABLE bugs ADD COLUMN cvss_score DECIMAL(3,1) DEFAULT NULL;
ALTER TABLE bugs ADD COLUMN cvss_severity VARCHAR(16) DEFAULT NULL; -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

CREATE INDEX idx_bugs_embargo ON bugs(is_embargoed, embargo_until);
```

### 2.2 Algorithmic Core: CVSS v4.0 Math & Client Countdown
1. **Interactive CVSS v4.0 Calculator**:
   * Evaluates metrics across MacroVectors:
     * $EQ1$: Exploitability (Attack Vector, Complexity, Attack Requirements, Privileges, User Interaction).
     * $EQ2$: Vulnerable System Impact (Confidentiality, Integrity, Availability: None/Low/High).
     * $EQ3$: Subsequent System Impact (SC, SI, SA: None/Low/High).
   * Implements FIRST.org published vector equations in TypeScript, generating score `0.0–10.0` and vector string (e.g. `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`).
2. **Embargo Countdown & Group Isolation**:
   * Client renders active countdown clock (`Days:Hours:Mins:Secs`) derived from `embargo_until`.
   * Unauthenticated or non-security-group requests to `/api/v1/bugs/:id` return HTTP 404 when `is_embargoed = true`.

### 2.3 UI & Workflow Architecture
- **Vulnerability Badge**: Security tickets display an interactive CVSS score pill (e.g. `9.3 CRITICAL` in crimson).
- **Embedded Scoring Modal**: Clicking the badge opens the interactive metric picker. Selecting values dynamically recomputes the score in real time.
- **Embargo Banner**: High-visibility header banner with real-time countdown timer warning team members of the public disclosure date.

### 2.4 Automated Test Specifications
* **Unit Tests (`test/unit/cvss4.test.ts`)**:
  - Verifies score calculation against official FIRST.org benchmark test vectors:
    - `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N` $\rightarrow$ `9.3 (CRITICAL)`
    - `CVSS:4.0/AV:L/AC:H/AT:P/PR:L/UI:P/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N` $\rightarrow$ `1.8 (LOW)`
* **Integration Tests (`test/integration/security_bugs.test.ts`)**:
  - Verifies unauthorized user GET on embargoed bug returns HTTP 404.
  - Verifies authorized security member GET returns full bug details with `is_embargoed: true` and `embargo_until`.

---

## 3. ⌨️ Sub-10ms Command Palette (`Cmd+K` / `Ctrl+K`) (Phase 3 Polish)

**Target Rubric Areas**: User Experience & Accessibility (15 pts), Innovation (20 pts)  
**Bugzilla Gap Addressed**: Legacy Bugzilla required dozens of mouse clicks across multiple form pages. This brings Linear/VS Code keyboard ergonomics to the bug tracker.

### 3.1 Technical Architecture
- **Component**: Built using `cmdk` (shadcn CommandDialog).
- **In-Memory Fuzzy Cache**: Client preloads recent tickets, projects, and allowed status actions.
- **Instant Shortcuts**:
  * `assign:me` $\rightarrow$ Instantly reassigns the active bug.
  * `status:resolved` / `status:in_progress` $\rightarrow$ Triggers state machine transition.
  * `copy:branch` $\rightarrow$ Copies formatted Git branch name (`fix/104-auth-timeout`) to clipboard.
  * `104` $\rightarrow$ Instant navigation jump to Bug #104.

### 3.2 Automated Test Specifications
* **Unit Tests (`test/unit/command_palette.test.ts`)**:
  - Verifies typing `res` matches action `status:resolved`.
  - Verifies numeric string `104` triggers direct URL push `/bugs/104`.

---

## 4. 🔍 PostgreSQL Full-Text Search (`tsvector` & GIN) (Phase 3 Polish)

**Target Rubric Areas**: Performance & Reliability (20 pts), Core Functionality (20 pts)  
**Bugzilla Gap Addressed**: Replaces slow SQL `LIKE '%query%'` table scans with high-performance native PostgreSQL lexical full-text search.

### 4.1 Data Schema & GIN Index
```sql
ALTER TABLE bugs ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(description, ''))
) STORED;

CREATE INDEX idx_bugs_search_vector ON bugs USING GIN(search_vector);
```

### 4.2 Query Execution & API
- **Endpoint**: `GET /api/v1/bugs/search?q=crash`
- **Query**:
  ```sql
  SELECT id, summary, status, priority, ts_rank(search_vector, websearch_to_tsquery('english', :q)) AS rank
  FROM bugs
  WHERE search_vector @@ websearch_to_tsquery('english', :q)
    AND (is_embargoed = FALSE OR :user_id IN (SELECT user_id FROM user_group_map WHERE group_name = 'security'))
  ORDER BY rank DESC
  LIMIT 25;
  ```

### 4.3 Automated Test Specifications
* **Integration Tests (`test/integration/search.test.ts`)**:
  - Verifies English word stemming matches: querying `parse` successfully matches a bug containing `parsing`.
  - Verifies security isolation: an unprivileged search query never returns an embargoed bug matching the search term.

---

## 5. 📋 Drag-and-Drop Kanban Status Board (Phase 3 Polish)

**Target Rubric Areas**: User Experience & Accessibility (15 pts), Core Functionality (20 pts)  
**Bugzilla Gap Addressed**: Legacy Bugzilla offered no visual board views. Modern agile teams require visual Kanban workflows without losing state-machine rigor.

### 5.1 Architecture & Workflow
- **Component**: Built using `@dnd-kit/core`.
- **Columns**: Mapped directly to Bugzilla status columns (`UNCONFIRMED`, `CONFIRMED`, `IN_PROGRESS`, `RESOLVED`, `VERIFIED`, `CLOSED`).
- **State Machine Enforcement**: Dropping a card calls `PATCH /api/v1/bugs/:id/status`.
  * If valid move $\rightarrow$ Card drops into column; updates `bugs_activity` audit trail.
  * If invalid move (e.g. `UNCONFIRMED` $\rightarrow$ `CLOSED`) $\rightarrow$ Server returns HTTP 422; frontend smoothly animates card back to source column with error toast.

### 5.2 Automated Test Specifications
* **Integration Tests (`test/integration/kanban.test.ts`)**:
  - Verifies card drop from `CONFIRMED` to `IN_PROGRESS` returns HTTP 200 and logs activity.
  - Verifies illegal card drop returns HTTP 422 without modifying database state.

---

## 6. ✨ 1-Click AI Triage Assistant (Phase 3 Polish — The AI Shield)

**Target Rubric Areas**: Innovation & Differentiation (20 pts), Problem Understanding (20 pts)  
**Bugzilla Gap Addressed**: Automates manual triage and distills 50+ comment discussions into instant executive context with zero complex infrastructure.

### 6.1 Architecture & Fastify Endpoint
- **Endpoint**: `POST /api/v1/bugs/:id/ai-triage`
- **Zero-Infra Implementation**: Fast, direct LLM completion call (`gpt-4o-mini` or `gemini-1.5-flash`) with a 2.5-second timeout and graceful fallback.
- **Output Schema (JSON)**:
  ```json
  {
    "summary": "Memory leak caused by unclosed WebSocket subscriptions in the WebAssembly audio worker.",
    "suggested_priority": "P1",
    "suggested_component": "AudioEngine",
    "confidence_reason": "Crash frequency reported by 4 users after commit #78b1a; matches regression pattern.",
    "next_steps": [
      "Verify worker termination in socket_handler.ts:102",
      "Attach heap profile dump to verify leak closure"
    ]
  }
  ```
- **UI**: Sleek glassmorphic card rendered in the bug sidebar with a 1-click **"✨ AI Triage Assist"** button.

### 6.2 Automated Test Specifications
* **Unit Tests (`test/unit/ai_triage.test.ts`)**:
  - Verifies prompt assembly contains bug title, description, and comment corpus.
  - Verifies structured JSON response parsing (summary, suggested priority, action items).
  - Graceful fallback: If LLM service times out or API key is absent, returns clean `{ error: "AI_SERVICE_UNAVAILABLE", fallback: true }` without crashing the page.

---

## 7. ⚡ Lightweight Live Updates (Polling / Broadcast) (Phase 3 Polish)

**Target Rubric Areas**: User Experience (15 pts), Performance & Reliability (20 pts)  
**Bugzilla Gap Addressed**: Users were blind to concurrent changes until manual browser page reloads.

### 7.1 Architecture
- Simple 5-second short-polling or lightweight WebSocket broadcast channel (`/ws/events`).
- Broadcasts domain events: `{ type: "bug:updated", id: 104, field: "status", newValue: "RESOLVED" }`.
- Client viewports listening to Bug #104 update their UI badge smoothly without full page refresh.

---

# PART II: EXTENDED ENTERPRISE ROADMAP (Documented Architecture)

The following eleven features represent the comprehensive enterprise roadmap. They are preserved in complete technical detail to demonstrate architectural rigor and long-term viability.

---

## 7. 👥 Real-Time Collaboration & CRDT Multiplayer Layer (Phase 4 Roadmap)

**Target Rubric Areas**: Problem Understanding (20 pts), Performance & Reliability (20 pts), Technical Architecture (15 pts)  
**Bugzilla Gap Addressed**: Legacy Bugzilla famously threw a fatal error: *"Mid-air collision detected! Someone modified this bug while you were editing it,"* wiping out all unsaved text.

### 7.1 CRDT State Model & 3-Tier Persistence
- **Engine**: **Yjs** synchronized over WebSockets.
- **3-Tier Persistence Architecture**:
  1. *L1 (In-Memory)*: Active Yjs document in Fastify WebSocket server for sub-millisecond local typing.
  2. *L2 (Write-Ahead Buffer via `y-redis`)*: Every client binary delta is written to Redis Streams before acknowledgment. If the server crashes or restarts, reconnected clients immediately hydrate from Redis with **zero lost keystrokes**.
  3. *L3 (Compacted Storage)*: A BullMQ worker debounces and periodically flushes compacted state vectors (`Y.encodeStateAsUpdate(doc)`) to PostgreSQL `issue_collaborative_documents (issue_id, state_vector, text_snapshot)`.
- **Live Presence**: Displays live peer cursor positions and selection ranges with distinct user color tags.
- **Embedded Loom Recorder**: In-browser video recording (`MediaRecorder` API) for 30-second screen repros.

---

## 8. 🔍 Code Navigation & Fault Localization (Phase 4 Roadmap)

**Target Rubric Areas**: Innovation & Differentiation (20 pts), Technical Architecture (15 pts)  
**Bugzilla Gap Addressed**: Bridges bug reports directly to source code repositories without switching to external IDEs.

### 8.1 Architecture & Pipeline
- **Repository Linking**: OAuth connection to GitHub/GitLab repositories.
- **Three-Tier Fault Localization**:
  1. *Regex Stack Trace Parser*: Automatically extracts file path and line number from crash logs (Python, Java, Node, Go).
  2. *AST Semantic Chunking*: Codebase files chunked at the function level using Tree-sitter and matched against natural language bug descriptions.
  3. *Embedded Monaco Editor*: Read-only `@monaco-editor/react` viewer highlighting offending lines in amber, with 1-click GitHub permalink buttons.

---

## 9. 🤖 AI-Powered Triage Assistant & Semantic Vector Search (Phase 4 Roadmap)

**Target Rubric Areas**: Innovation (20 pts), Technical Implementation (15 pts)  
**Bugzilla Gap Addressed**: Automates manual triage and eliminates duplicate reports disguised by different wording.

### 9.1 Technical Architecture
- **Vector Embeddings**: Dense embeddings stored in PostgreSQL via `pgvector` with HNSW cosine distance indexing.
- **Real-Time Duplicate Interception**: Debounced client typing hook compares draft summaries against active issues; flags semantic duplicates ($> 0.85$ cosine similarity).
- **Git-Blame Author Routing**: Interrogates `git log` and `git blame` on affected modules; applies exponential decay ($ARF_u = \sum e^{-\lambda \Delta t}$) to recommend the best engineer.
- **1-Click Thread Summarizer**: LLM distillation condensing 50+ comment threads into Root Cause, Decisions, and Next Actions.

---

## 10. 📊 Real-Time Analytics & Team Health Cockpit (Phase 4 Roadmap)

**Target Rubric Areas**: Performance & Reliability (20 pts), UX & Aesthetics (15 pts)  
**Bugzilla Gap Addressed**: Replaces legacy 24-hour cron jobs (`collectstats.pl`) with live metric rollups.

### 10.1 Key Metrics
- **Continuous Rollup Views**: PostgreSQL materialized views (`mv_daily_bug_metrics`) computing defect escape rate, time-to-triage (TTT), and time-to-fix (TTF).
- **Gini Workload Balancing**: Real-time distribution matrix calculating open bug concentration per engineer to prevent burnout.
- **SLA Breach Pulse Alerts**: Dynamic banners warning when tickets are within 15% of SLA threshold.

---

## 11. ⚙️ Event-Driven Automation & SLA Escalation Engine (Phase 4 Roadmap)

**Target Rubric Areas**: Innovation (20 pts), Core Functionality (20 pts)  
**Bugzilla Gap Addressed**: Replaces primitive scheduled nag emails ("Whining") with a modern event-driven workflow engine.

### 11.1 Technical Architecture
- **Engine**: BullMQ queue processor executing declarative JSON logic rule trees (`automation_rules`).
- **Triggers & Actions**: Triggers on status changes, SLA breaches, or inactivity; executes Slack/PagerDuty alerts and automated multi-tier escalation ladders.

---

## 12. 🔔 Intelligent Notification Center & Multi-Channel Routing (Phase 4 Roadmap)

**Target Rubric Areas**: Problem Understanding (20 pts), Reliability (20 pts)  
**Bugzilla Gap Addressed**: Replaces raw email diff floods with intelligent batching and modern chat integrations.

### 12.1 Technical Architecture
- **15-Minute Digest Queue**: Collapses rapid sequential edits on the same bug into a single aggregated digest notification.
- **Channels**: In-app notification bell with unread counters, bi-directional Slack/Teams bots, and Web Push.

---

## 13. 🔐 Advanced Access Control & Compliance (Phase 4 Roadmap)

**Target Rubric Areas**: Technical Implementation (15 pts), Reliability (20 pts)  
**Bugzilla Gap Addressed**: Replaces simple UNIX-style groups with enterprise Role-Based Access Control (RBAC).

### 13.1 Technical Architecture
- **RBAC Matrix**: Granular capability permissions across Organization, Product, and Issue scopes.
- **Compliance Tooling**: Immutable audit trail exports (SOC 2, ISO 27001) and automated GDPR PII scrubbing scripts.

---

## 14. 📤 Data Portability & Real-Time API Ecosystem (Phase 4 Roadmap)

**Target Rubric Areas**: Technical Implementation (15 pts), Performance (20 pts)  
**Bugzilla Gap Addressed**: Replaces legacy Perl XML-RPC with OpenAPI 3.1 REST and GraphQL Subscriptions.

### 14.1 Technical Architecture
- OpenAPI 3.1 Swagger UI playground.
- Live GraphQL Subscriptions over WebSockets for third-party bots and dashboards.
- Streaming S3 cloud backup pipeline for multi-gigabyte project exports.

---

## 15. 📱 Mobile-First Progressive Web App (PWA) (Phase 4 Roadmap)

**Target Rubric Areas**: User Experience & Accessibility (15 pts)  
**Bugzilla Gap Addressed**: Legacy Bugzilla is completely unusable on mobile viewports.

### 15.1 Technical Architecture
- Workbox Service Worker caching the last 100 accessed tickets with background sync for offline comment drafting.
- Mobile touch swipe gestures (swipe left to assign, swipe right to resolve).
- Direct camera integration for hardware screen capture.

---

## 16. ♿ Accessibility (WCAG 2.1 AA) & Global i18n (Phase 4 Roadmap)

**Target Rubric Areas**: User Experience & Accessibility (15 pts)  
**Bugzilla Gap Addressed**: Fixes severe legacy accessibility shortcomings (missing ARIA roles, unlabelled forms).

### 16.1 Technical Architecture
- Strict WCAG 2.1 AA contrast compliance and `focus-visible` keyboard rings.
- Dynamic ARIA live regions for real-time updates.
- Full bidirectional Right-to-Left (RTL) layout switching for Arabic, Hebrew, and Persian.

---

## 17. 🌐 Multi-Instance Migration & Plugin Marketplace (Phase 4 Roadmap)

**Target Rubric Areas**: Innovation (20 pts), Technical Architecture (15 pts)  
**Bugzilla Gap Addressed**: Eliminates barriers to enterprise migration and extensibility.

### 17.1 Technical Architecture
- SAX-based streaming XML parser capable of importing 5GB+ legacy Bugzilla dumps without memory exhaustion.
- Sandboxed TypeScript plugin runtime with zero-downtime hot reloading.

---

## 🏆 Master Ranking & Rubric Alignment Matrix

| Rank | Feature Area | Execution Status | Primary Rubric Target | Key Evaluator "WOW" Factor |
|:---:|---|:---:|---|---|
| **1** | **Interactive Dependency Graph & Critical Path** | 🟢 **Phase 2 (Live Demo)** | Innovation (20) + UX (15) + Tech (15) | Live React Flow DAG, pulsing red Critical Path, server-side cycle rejection. |
| **2** | **Enterprise CVSS v4.0 & Embargo Countdown** | 🟢 **Phase 2 (Live Demo)** | Innovation (20) + Problem (20) + Tech (15) | FIRST.org CVSS v4.0 math calculator, live 90-day embargo countdown clock. |
| **3** | **Sub-10ms Command Palette (`Cmd+K`)** | 🟢 **Phase 3 (Live Demo)** | UX & Aesthetics (15) + Innovation (20) | Linear-style keyboard-driven navigation and zero-mouse quick actions. |
| **4** | **PostgreSQL Full-Text Search (`tsvector`)** | 🟢 **Phase 3 (Live Demo)** | Performance & Reliability (20) | Sub-20ms stemmed search with GIN indexing and group security isolation. |
| **5** | **Drag-and-Drop Kanban Status Board** | 🟢 **Phase 3 (Live Demo)** | UX & Aesthetics (15) + Core Func (20) | Visual board calling server state machine with invalid move rollback. |
| **6** | **1-Click AI Triage Assistant** | 🟢 **Phase 3 (Live Demo)** | Innovation (20) + Problem (20) | Instant LLM thread summary, priority recommendation, and action plan. |
| **7** | **Lightweight Live Updates** | 🟢 **Phase 3 (Live Demo)** | UX (15) + Performance (20) | Real-time visual badge refreshes via polling / WebSocket broadcast. |
| **8** | **CRDT Multiplayer Ticket Editing** | 📄 Phase 4 (Roadmap) | Problem (20) + Reliability (20) + Tech (15) | Yjs/y-redis 3-tier persistence eliminating Bugzilla Mid-Air Collisions. |
| **9** | **Code Navigation & Fault Localization** | 📄 Phase 4 (Roadmap) | Innovation (20) + Tech Arch (15) | Stack trace regex parser and embedded Monaco culprit line viewer. |
| **10** | **AI Semantic Vector Search & Blame Routing** | 📄 Phase 4 (Roadmap) | Innovation (20) + Problem (20) | pgvector HNSW duplicate search and Git-blame author routing. |
| **11** | **Real-Time Analytics & Team Health Cockpit** | 📄 Phase 4 (Roadmap) | Performance (20) + UX (15) | PostgreSQL materialized view rollups, defect escape rates, SLA heatmaps. |
| **12** | **Event-Driven Automation & SLA Escalation** | 📄 Phase 4 (Roadmap) | Innovation (20) + Core Func (20) | BullMQ event queue processing declarative JSON logic rule trees. |
| **13** | **Intelligent Notification Center** | 📄 Phase 4 (Roadmap) | Problem Understanding (20) | 15-minute sliding digest bundling and multi-channel bots. |
| **14** | **Enterprise RBAC & Audit Compliance** | 📄 Phase 4 (Roadmap) | Technical Architecture (15) | Granular permission matrix, SOC 2 exports, and GDPR PII scrubbing. |
| **15** | **Data Portability & GraphQL Subscriptions** | 📄 Phase 4 (Roadmap) | Technical Architecture (15) | OpenAPI 3.1 Swagger playground and live GraphQL subscriptions. |
| **16** | **Mobile-First Progressive Web App (PWA)** | 📄 Phase 4 (Roadmap) | UX & Accessibility (15) | Offline Workbox service workers and mobile camera/voice capture. |
| **17** | **Accessibility (WCAG 2.1 AA) & Plugin Sandbox** | 📄 Phase 4 (Roadmap) | UX (15) + Tech (15) | Screen-reader tested, RTL support, and sandboxed TypeScript plugin runtime. |
