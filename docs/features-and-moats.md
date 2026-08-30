# Mantis — Algorithmic Moats & Complete Feature Specification

> **Platform Architecture**: Fastify 4 + PostgreSQL 16 + Next.js 14 + TypeScript 5  
> **Live Evaluation Sandbox**: [https://mantis-clonefest.vercel.app](https://mantis-clonefest.vercel.app)
>
> This document provides the complete, authoritative technical specification for all live features, algorithmic engines, security isolation patterns, and developer ergonomics in Mantis.

---

## 📑 Feature Navigation
1. [🕸️ Interactive Dependency Graph & Critical Path Engine (CPM)](#1-️-interactive-dependency-graph--critical-path-engine-cpm)
2. [🛡️ FIRST.org CVSS v4.0 Vulnerability Math & 90-Day Embargo](#2-️-firstorg-cvss-v40-vulnerability-math--90-day-embargo)
3. [🔒 Formal Finite State Machine & 404 Zero-Leakage Secrecy](#3--formal-finite-state-machine--404-zero-leakage-secrecy)
4. [✨ 1-Click AI Triage Assistant (Gemini 2.0 Flash)](#4--1-click-ai-triage-assistant-gemini-20-flash)
5. [🚩 Three-State Review Flag Governance (? / + / -)](#5--three-state-review-flag-governance-----)
6. [🔍 Stemmed Full-Text Search & Live Trigram Duplicate Prevention](#6--stemmed-full-text-search--live-trigram-duplicate-prevention)
7. [💻 Drag-and-Drop Kanban Board with FSM Rollback](#7--drag-and-drop-kanban-board-with-fsm-rollback)
8. [⌨️ ⌘K Command Palette & Keyboard Ergonomics](#8-️-k-command-palette--keyboard-ergonomics)
9. [📝 Rich-Text GFM Markdown & @Mentions Collaboration](#9--rich-text-gfm-markdown--mentions-collaboration)
10. [📊 Milestone Release Readiness & Pure SQL MTTR Analytics](#10--milestone-release-readiness--pure-sql-mttr-analytics)
11. [🐙 Real-Time GitHub SCM Webhook Automation](#11--real-time-github-scm-webhook-automation)
12. [🏢 Enterprise Workspace, Product & Team Administration](#12--enterprise-workspace-product--team-administration)

---

## 1. 🕸️ Interactive Dependency Graph & Critical Path Engine (CPM)

Mantis replaces legacy static Graphviz image maps with a real-time, interactive Directed Acyclic Graph (DAG) canvas powered by **React Flow** and **Dagre**.

```
       [Bug #101: Necko Socket Engine (4h)]  <-- CRITICAL PATH (Pulsing Red)
                         │
                         ▼
        [Bug #102: Wayland Buffer Sync (3h)] <-- CRITICAL PATH (Pulsing Red)
                         │
                         ▼
       [Bug #106: SpiderMonkey JIT Bail (2.5h)] <-- CRITICAL PATH (Total: 9.5h)
```

### 1.1 Algorithmic Implementation (Kahn's Topological Sort & Dynamic Programming)
- **Topological Sorting**: Evaluates the dependency DAG using Kahn's algorithm to resolve task order.
- **Earliest Finish Time (EFT) Dynamic Programming**: Computes the cumulative path duration across all blocker branches using task time estimates (`estimated_time`).
- **Critical Path Discovery**: Identifies the longest sequential dependency chain delaying release and marks node IDs into `criticalPathIds`.
- **Pulsing Visual Representation**: Critical path edges are dynamically rendered with pulsing high-contrast animated red stroke lines (`.critical-edge` in `#EF4444`).

### 1.2 Recursive CTE Cycle Detection & Prevention
Before adding a dependency edge (`blocking_bug_id` $\rightarrow$ `blocked_bug_id`), the database transaction executes a recursive Common Table Expression (CTE) to check for circular paths:

```sql
WITH RECURSIVE check_cycle AS (
    SELECT blocking_bug_id, blocked_bug_id 
    FROM bug_dependencies 
    WHERE blocking_bug_id = $blocked_id
  UNION ALL
    SELECT d.blocking_bug_id, d.blocked_bug_id 
    FROM bug_dependencies d 
    JOIN check_cycle c ON d.blocking_bug_id = c.blocked_bug_id
)
SELECT 1 FROM check_cycle WHERE blocked_bug_id = $blocking_id LIMIT 1;
```
If a cycle is detected, the transaction aborts and returns HTTP `422 CYCLIC_DEPENDENCY_DETECTED`.

---

## 2. 🛡️ FIRST.org CVSS v4.0 Vulnerability Math & 90-Day Embargo

Mantis provides a full mathematical implementation of the official FIRST.org Common Vulnerability Scoring System (CVSS) version 4.0.

### 2.1 Discrete MacroVector Math Engine
Computes 5 distinct MacroVectors ($EQ1$ through $EQ5$) across metric dimensions:
- **EQ1 (Exploitability)**: Attack Vector (`AV`), Attack Complexity (`AC`), Attack Requirements (`AT`)
- **EQ2 (Privileges & Interaction)**: Privileges Required (`PR`), User Interaction (`UI`)
- **EQ3 (Vulnerable System Impact)**: Confidentiality (`VC`), Integrity (`VI`), Availability (`VA`)
- **EQ4 (Subsequent System Impact)**: Confidentiality (`SC`), Integrity (`SI`), Availability (`SA`)
- **EQ5 (Exploit Maturity)**: Exploit Maturity (`E`)

The engine calculates numeric scores ($0.0–10.0$) and maps them to severity tiers:
- `0.0`: **NONE**
- `0.1 – 3.9`: **LOW**
- `4.0 – 6.9`: **MEDIUM**
- `7.0 – 8.9`: **HIGH**
- `9.0 – 10.0`: **CRITICAL**

### 2.2 Interactive Metric Modal & 90-Day Embargo Banner
- **Live Vector Generator**: Interactive modal lets security analysts toggle metrics (e.g. `AV:N`, `AC:L`, `PR:N`, `UI:N`, `VC:H`, `VI:H`, `VA:H`) with real-time vector string output.
- **Automated 90-Day Embargo Disclosure Banner**: Toggling a bug to "Embargoed" sets `embargo_until = NOW() + INTERVAL '90 days'` and locks access to the `security-team` group. The detail page displays a live ticking **`DD:HH:MM:SS` countdown timer banner**.

---

## 3. 🔒 Formal Finite State Machine & 404 Zero-Leakage Secrecy

### 3.1 Strict State Transition Rules
Mantis enforces a formal finite state machine (FSM) preventing invalid lifecycle shortcuts:

```
UNCONFIRMED ──► CONFIRMED ──► IN_PROGRESS ──► RESOLVED ──► VERIFIED ──► CLOSED
                    ▲              │              │           │
                    └──────────────┴──────────────┴───────────┘ (Reopen)
```

| Current Status | Permitted Target Statuses |
|---|---|
| `UNCONFIRMED` | `CONFIRMED`, `RESOLVED` |
| `CONFIRMED` | `IN_PROGRESS`, `RESOLVED` |
| `IN_PROGRESS` | `RESOLVED`, `CONFIRMED` *(reopen/unassign)* |
| `RESOLVED` | `VERIFIED`, `CONFIRMED` *(reopen)* |
| `VERIFIED` | `CLOSED`, `CONFIRMED` *(reopen)* |
| `CLOSED` | `CONFIRMED` *(reopen)* |

- **Resolution Guard**: Transitioning to `RESOLVED` mandates an explicit resolution code (`FIXED`, `INVALID`, `WONTFIX`, `DUPLICATE`, `WORKSFORME`, `INCOMPLETE`). Reopening a defect automatically clears the resolution.

### 3.2 404 Zero-Leakage Group Secrecy
When an unauthorized user attempts to access an embargoed security defect:
- The server returns **HTTP 404 Not Found** (never 403 Forbidden).
- Prevents attackers from enumerating bug IDs or confirming the existence of quarantined zero-day vulnerabilities.

### 3.3 Immutable Append-Only Audit Trail
Every field change (status, priority, assignee, CVSS score, embargo timestamp) is permanently recorded in `bugs_activity`:
- `(bug_id, who_id, field, old_value, new_value, changed_at, comment)`
- Rows are never updated or deleted, providing complete compliance tracking.

---

## 4. ✨ 1-Click AI Triage Assistant (Gemini 2.0 Flash)

Integrated with Google DeepMind's **Gemini 2.0 Flash**, Mantis distills long, messy comment threads into structured triage summaries in < 2 seconds.

### 4.1 Structured Synthesis Output
Sends the defect summary, description, and up to 30 comment threads to Gemini 2.0 Flash, returning:
1. **2-Sentence Root Cause Summary**: Core diagnosis of the underlying defect.
2. **Suggested Priority (`P1`–`P5`)**: Mathematical priority recommendation with rationale.
3. **Suggested Component**: Accurate subsystem routing (e.g. `JS Engine`, `Networking`).
4. **Actionable Next Steps**: Concrete instructions for engineers assigned to the bug.

### 4.2 High Availability & Fallback Protection
Protected with a **2.5-second hard timeout** using `AbortController` to guarantee that external AI latency never degrades or blocks the user interface.

---

## 5. 🚩 Three-State Review Flag Governance (`?`, `+`, `-`)

Mantis separates code review, patch sign-off, and information requests from ticket status.

- **Three Distinct States**:
  - `?`: Request pending (e.g. `review?`, `needinfo?`, `approval?`)
  - `+`: Request granted / patch approved
  - `-`: Request denied / changes requested
- **Targeted Requestees**: Requests can be assigned to specific engineers (e.g. `review?alice_dev`) or open to reviewer pools.
- **Grant Group Authorization**: Granting (`+`) or denying (`-`) flags verifies that the actor belongs to the authorized group (e.g. `release-managers` or `security-team`).

---

## 6. 🔍 Stemmed Full-Text Search & Live Trigram Duplicate Prevention

### 6.1 PostgreSQL Full-Text Search (`tsvector` + GIN)
- **Automatic FTS Generation**: PostgreSQL automatically maintains a `search_vector` column generated from `to_tsvector('english', summary || ' ' || description)`.
- **English Stemming**: Searching `"parse"` matches `"parsing"`, `"parsed"`, and `"parser"`.
- **Relevance Highlight Tags**: Results return matching query tokens highlighted in `<mark>` tags.

### 6.2 Proactive Typeahead Duplicate Detection (`pg_trgm`)
- As an engineer types a summary on `/bugs/new`, a debounced background query executes trigram similarity matching:
  ```sql
  SELECT id, summary, similarity(summary, $1) AS score 
  FROM bugs 
  WHERE similarity(summary, $1) > 0.28 
  ORDER BY score DESC LIMIT 5;
  ```
- If candidate duplicates exist, an alert card surfaces potential duplicate bug IDs *before* the engineer clicks Submit.

---

## 7. 💻 Drag-and-Drop Kanban Board with FSM Rollback

The `/kanban` board provides agile workflow visualization with strict state machine integrity:

- **6 Status Columns**: `UNCONFIRMED`, `CONFIRMED`, `IN_PROGRESS`, `RESOLVED`, `VERIFIED`, `CLOSED`.
- **Draggable Bug Cards**: Rendered with priority dots, severity tags, CVSS badges, and assignee avatars.
- **Optimistic UI with Automatic Rollback**: Dragging a card to a column immediately updates the UI; if the server state machine rejects the transition (e.g. dragging `CONFIRMED` $\rightarrow$ `CLOSED` without resolution), the card **automatically bounces back to its original column** and displays an explanatory error toast.

---

## 8. ⌨️ ⌘K Command Palette & Keyboard Ergonomics

Mantis provides sub-10ms keyboard navigation for power users:

- **`⌘K` / `Ctrl+K` Spotlight Bar**: Accessible anywhere on the platform.
- **Instant Numeric Jump**: Typing `104` or `#104` navigates directly to `/bugs/104`.
- **Quick Status Actions**: Typing `status:resolved` or `status:confirmed` opens transition dialogs.
- **Fast Navigation**: Instant jump to `/kanban`, `/bugs/new`, `/dashboard`, or `/settings`.

---

## 9. 📝 Rich-Text GFM Markdown & @Mentions Collaboration

- **GitHub-Flavored Markdown (GFM)**: Comment editor supports dual-tab **Write / Preview** modes, bullet lists, bold/italic, and tables.
- **Syntax Highlighting & Code Copy**: Formatted code blocks (` ```typescript `, ` ```sql `, etc.) render with syntax highlighting and a 1-click **Copy to Clipboard** button.
- **Interactive @Mentions Autocomplete**: Typing `@` in any comment box opens an avatar typeahead menu. Mentioned users receive in-app notification bell alerts.

---

## 10. 📊 Milestone Release Readiness & Pure SQL MTTR Analytics

### 10.1 0–100% Release Readiness Score
An explainable circular health gauge that scores release risk for any target milestone:
$$\text{Readiness} = \max(0, 100 - 15 \times N_{\text{CPM}} - 20 \times N_{\text{CVSS\_Crit}} - 10 \times N_{\text{CVSS\_High}} - 5 \times N_{\text{Pending\_Flags}} - 8 \times N_{\text{P1\_Open}})$$
- Displays an interactive breakdown listing the exact defect IDs blocking the release.

### 10.2 Pure SQL MTTR & Velocity Analytics
- Computes **Mean Time To Resolve (MTTR)** (mean and median days) aggregated by product.
- Tracks 14-day and 30-day resolution velocity trends over the immutable `bugs_activity` audit stream.

---

## 11. 🐙 Real-Time GitHub SCM Webhook Automation

Mantis bridges source code management directly to issue tracking:

- **Cryptographic Security**: Validates incoming payload signatures using HMAC-SHA256 (`x-hub-signature-256`) and timing-safe equality checks.
- **Commit Message Parsing**: Extracts issue keywords (`Fixes #1`, `Closes #2`, `Resolves #3`, `Bug 4`).
- **Automatic Resolution**: Pushing a commit with `Fixes #1` to the default branch automatically transitions Bug #1 to `RESOLVED (FIXED)` and records the commit SHA, author, and diff link in the audit history.
- **Dedicated SCM Tab**: Displays linked commits and pull requests directly on the defect detail page.

---

## 12. 🏢 Enterprise Workspace, Product & Team Administration

Mantis provides complete self-service administration for engineering organizations to scale products, components, and teams:

### 12.1 Product & Subsystem Hierarchy (`/settings/products`)
- **Product Lifecycle Governance**: Administrators can create new products (e.g. `Gecko Core`, `Thunderbird`, `SpiderMonkey`), configure default milestones, and toggle active/archived states.
- **Granular Component Routing**: Each product supports granular sub-components (e.g. `Necko / Network`, `Layout / Reflow`, `Wasm JIT Compiler`) with designated default assignees. Newly filed defects in a component automatically default to the component lead.

### 12.2 Secure Team Invitations & Role Provisioning (`/settings/team`)
- **Time-Limited Tokenized Invites**: Admins can generate secure, cryptographically random invitation tokens with optional email scoping.
- **Automated Role & Group Binding**: Invites can be pre-configured with specific permissions (`dev-team`, `qa-team`, `security-team`, or `Administrator`). When accepted via `/invite?token=...`, the user is immediately provisioned into the appropriate groups.
- **Priority Ranking & Account Governance**: Admins can adjust engineer triage priority ranks (e.g. `Rank 1` for core triage leads), grant/revoke security clearance, or toggle account status (`Enabled` / `Disabled`).

### 12.3 Seamless Onboarding Engine (`/onboarding`)
- **Zero-Friction Team Discovery**: New signups are automatically matched against pending domain invitations upon account creation.
- **Workspace Bootstrapping**: Allows teams without an invite to initialize their own workspace with sensible product defaults, component hierarchies, and triage queues in seconds.

