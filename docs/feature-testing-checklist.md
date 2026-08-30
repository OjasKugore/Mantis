
# Mantis — Feature Verification & QA Testing Checklist

> **Evaluation Version**: Mantis v3.0.0 Enterprise Release  
> **Target Audience**: Hackathon Judges, QA Evaluators, and Core Contributors  
> **Live Demo Sandbox**: [https://mantis-clonefest.vercel.app](https://mantis-clonefest.vercel.app)

---

## 👥 Evaluator Personas & Role Matrix

Test each workflow with the appropriate persona to verify Role-Based Access Control (RBAC) and group security boundaries:

| Persona | Role | Email | Permissions & Group Membership |
|---|---|---|---|
| **Admin** | System Administrator | `admin@mantis.local` | Full workspace access, user administration, flag definitions, security group member |
| **Alice** | Senior Developer | `alice@mozilla.com` | Standard bug filing, code commits, status transitions, flag requester/granter |
| **Bob** | QA Engineer | `bob@mozilla.com` | Defect verification, duplicate resolution, Kanban triage |
| **Carol** | Security Lead | `carol@mozilla.com` | `security` group member, CVSS v4.0 vector author, 90-day embargo manager |
| **Dave** | Performance Eng | `dave@mozilla.com` | Benchmark logging, dependency graph and CPM critical path analyst |
| **Eve** | Triage Coordinator | `eve@mozilla.com` | Gemini AI triage dispatcher, keyword classification, milestone scoping |
| **Anonymous** | Public / Unauthenticated | *None* | Read-only public issues; **strict 404 on embargoed security defects** |

---

## 1. 🔐 Authentication & Session Security

- [ ] **1-Click Persona Quick-Login**: Navigate to `/login` $\rightarrow$ Click any persona badge (e.g. `Carol — Security Lead`) $\rightarrow$ Instant redirect to `/dashboard` with signed session cookie.
- [ ] **Custom Credentials Signup**: Navigate to `/signup` $\rightarrow$ Enter display name, unique email, and password $\rightarrow$ Validates Argon2id hashing and auto-logs in.
- [ ] **Duplicate Email Rejection**: Attempt to sign up with `alice@mozilla.com` $\rightarrow$ UI displays descriptive validation error without stack trace.
- [ ] **Session Destruction**: Click profile avatar in top right $\rightarrow$ Select `Log Out` $\rightarrow$ Session cookie deleted, redirected to landing page `/`.

---

## 2. 🐛 Core Defect Lifecycle & Finite State Machine (FSM)

- [ ] **Defect Filing**: Navigate to `/bugs/new` $\rightarrow$ Enter summary, description, select Product `Gecko Core` and Component `Necko / Network` $\rightarrow$ Submit $\rightarrow$ Generates sequential numeric ID (e.g. `#101`) with initial `UNCONFIRMED` or `CONFIRMED` status.
- [ ] **Valid FSM Traversal**: Open bug `#101` $\rightarrow$ Transition `UNCONFIRMED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ State badge updates instantly, activity log appends timestamped diff.
- [ ] **Illegal Transition Rejection**: Attempt direct transition from `IN_PROGRESS` $\rightarrow$ `CLOSED` without resolution $\rightarrow$ Server returns HTTP `422 INVALID_TRANSITION` $\rightarrow$ UI displays rollback toast notification.
- [ ] **Mandatory Resolution Code**: Transition `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ Select resolution code `FIXED` $\rightarrow$ Status updates successfully with resolution badge.
- [ ] **Reopening Defect**: From `RESOLVED` $\rightarrow$ Select `REOPENED` $\rightarrow$ Resolution code clears, defect returns to active queue.

---

## 3. 🚩 Three-State Review Flag Governance (`?`, `+`, `-`)

- [ ] **Flag Request (`?`)**: On bug detail page $\rightarrow$ Open Flags tab $\rightarrow$ Set `review` flag to `?` and assign requestee `Alice` $\rightarrow$ Flag badge renders amber `?`, notification sent to Alice.
- [ ] **Flag Grant (`+`)**: Switch persona to `Alice` $\rightarrow$ Open bug $\rightarrow$ Change `review` flag to `+` $\rightarrow$ Flag badge renders green `+`, clearance recorded in audit log.
- [ ] **Flag Denial (`-`)**: Change flag to `-` $\rightarrow$ Flag badge renders red `-`, blocking downstream release clearance.

---

## 4. 🕸️ Interactive Dependency Graph & Critical Path Method (CPM)

- [ ] **Dependency Traversal**: Open bug `#101` $\rightarrow$ Navigate to `Graph View` (`/bugs/101/graph`) $\rightarrow$ Interactive React Flow DAG canvas renders with nodes and blocker edges.
- [ ] **Critical Path Discovery**: Add dependencies (`#101` $\rightarrow$ `#102` $\rightarrow$ `#106`) with task estimates $\rightarrow$ Longest sequential blocking chain pulses with high-contrast red stroke (`#EF4444`).
- [ ] **Cycle Detection**: Attempt to add blocker edge creating a loop (`#106` $\rightarrow$ `#101`) $\rightarrow$ Recursive CTE catches circular dependency $\rightarrow$ Rejects with HTTP `422 CYCLIC_DEPENDENCY_DETECTED`.
- [ ] **Terminal CLI Graph**: In terminal, execute `mantis dep graph 101` $\rightarrow$ Renders formatted ASCII dependency tree highlighting critical path nodes.

---

## 5. 🛡️ FIRST.org CVSS v4.0 Vulnerability Scoring & 90-Day Embargo

- [ ] **CVSS v4.0 Modal**: Open bug detail $\rightarrow$ Click `Open CVSS Calculator` $\rightarrow$ Select Attack Vector (`AV:N`), Attack Complexity (`AC:L`), Vulnerable System Impact (`VC:H/VI:H/VA:H`) $\rightarrow$ Live vector string `CVSS:4.0/...` updates and computes score `9.3 CRITICAL`.
- [ ] **Score Persistence**: Save CVSS score $\rightarrow$ Badge renders severity pill on bug header and queue table.
- [ ] **Embargo Activation**: Check `Embargo Vulnerability` and set 90-day window $\rightarrow$ Live countdown banner displays `DD:HH:MM:SS` ticker.
- [ ] **404 Zero-Leakage Secrecy**: Log in as `Bob` (non-security group) or browse anonymously $\rightarrow$ Attempt to navigate to embargoed bug URL $\rightarrow$ Server returns strict `404 Not Found` (never `403 Forbidden`) to prevent vulnerability enumeration.

---

## 6. 📊 Release Readiness Score & Analytics

- [ ] **Milestone Readiness Gauge**: Navigate to `/dashboard` $\rightarrow$ Open `Readiness` tab $\rightarrow$ Select milestone `128.0` $\rightarrow$ Computed 0–100 score displays with green/yellow/red ring gauge.
- [ ] **Risk Factor Breakdown**: Inspect penalty breakdown table $\rightarrow$ Verifies deductions for open CPM critical path bugs, pending blocking flags (`?`), and critical CVSS vulnerabilities.
- [ ] **Burndown & MTTR Velocity**: Open `Analytics` tab $\rightarrow$ Interactive Recharts graphs render sprint burndown curve and Mean Time to Resolve (MTTR).
- [ ] **CLI Readiness Audit**: Run `mantis metrics readiness 128.0` in terminal $\rightarrow$ Outputs color-coded release audit summary.

---

## 7. 💻 Kanban Board & Drag-and-Drop Workflow

- [ ] **Kanban Board View**: Navigate to `/dashboard` $\rightarrow$ Toggle view mode to `Kanban` (or visit `/kanban`) $\rightarrow$ 6 workflow columns render with defect cards.
- [ ] **Optimistic Drag-and-Drop**: Drag card from `CONFIRMED` to `IN_PROGRESS` $\rightarrow$ Card snaps smoothly to target column, API updates status in background.
- [ ] **FSM Rollback on Invalid Drop**: Attempt to drag card from `UNCONFIRMED` directly to `RESOLVED` $\rightarrow$ FSM rejects transition $\rightarrow$ Card springs back to source column with error toast.

---

## 8. ✨ AI Bug Triage Assistant (Gemini 2.0 Flash)

- [ ] **1-Click AI Triage**: On bug detail page $\rightarrow$ Click `✨ AI Triage Assistant` $\rightarrow$ Synthesizes summary, predicts component, priority, and root cause with confidence rationale.
- [ ] **Graceful Fallback**: If offline or API key absent $\rightarrow$ Deterministic heuristic engine generates structured triage output without crash.
- [ ] **CLI AI Triage**: In terminal, run `mantis triage 101` $\rightarrow$ Terminal displays formatted AI root cause analysis and recommended action items.

---

## 9. 🏷️ Keywords & Classification System

- [ ] **Keyword Tagging**: On bug detail sidebar $\rightarrow$ Add keyword tags (e.g. `regression`, `crash`, `sec-audit`, `perf`) $\rightarrow$ Tags appear as styled badges.
- [ ] **Keyword Search Filtering**: Click keyword badge $\rightarrow$ Navigates to search queue pre-filtered by selected keyword.

---

## 10. 👥 CC / Watcher Notification List

- [ ] **Add to CC**: On bug detail page $\rightarrow$ Click `+ Watch Bug` $\rightarrow$ Current user added to CC list avatar row.
- [ ] **CC Notification**: Edit bug or post comment $\rightarrow$ All CC'd users receive notification in live notification bell.
- [ ] **Remove from CC**: Click `Unwatch` $\rightarrow$ Removed from notification subscriber list.

---

## 11. Saved Views (Named Queries)

- [ ] **Preset Filter Chips**: On dashboard $\rightarrow$ Click preset chips (e.g. `P1 Blockers`, `Security Embargoed`, `Needs Triage`) $\rightarrow$ Instantly applies filter criteria.
- [ ] **Save Custom Query**: Configure custom filter combination $\rightarrow$ Click `Save View` $\rightarrow$ Enter view name $\rightarrow$ Persisted to `named_queries` table and available across sessions.
- [ ] **Delete Saved View**: Click `✕` on custom saved chip $\rightarrow$ Removes query from database.

---

## 12. ⬇️ Data Portability & CSV Export

- [ ] **Queue Export**: On dashboard bug queue $\rightarrow$ Click `⬇ Export CSV` $\rightarrow$ Downloads `mantis-bugs.csv` matching current filter criteria with all standard fields (ID, Summary, Status, Priority, Severity, Component, Reporter, CVSS).

---

## 13. 🐙 GitHub SCM Webhook & Traceability

- [ ] **HMAC-Verified Push Webhook**: Post payload to `/api/v1/webhooks/github` with valid `X-Hub-Signature-256` and commit message `Fixes #101: Correct socket leak` $\rightarrow$ Bug `#101` auto-transitions to `RESOLVED / FIXED`.
- [ ] **Commits Tab**: Bug detail page $\rightarrow$ Open `Commits` tab $\rightarrow$ Displays commit SHA, author, message, and link to GitHub repository.
- [ ] **Invalid Signature Rejection**: Send webhook with malformed signature $\rightarrow$ HTTP `401 UNAUTHORIZED` rejected with constant-time comparison.

---

## 14. ⌨️ Keyboard Shortcuts & Command Palette

- [ ] **Spotlight Palette**: Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) $\rightarrow$ Command palette modal opens $\rightarrow$ Type bug ID or title $\rightarrow$ Instant navigation.
- [ ] **List Traversal**: In bug queue, press `j` (next) and `k` (previous) $\rightarrow$ Active row focus moves $\rightarrow$ Press `Enter` to open defect.
- [ ] **Shortcut Cheat Sheet**: Press `?` $\rightarrow$ Displays keyboard shortcut modal overlay.

---

---

## 15. 🏢 Workspace, Product & Team Administration

- [ ] **Product & Workspace Creation**: Log in as `Admin` $\rightarrow$ Navigate to `/settings/products` $\rightarrow$ Click `+ New Product` $\rightarrow$ Enter product name (e.g. `SpiderMonkey Next`), description, and default milestone `130.0` $\rightarrow$ Submit $\rightarrow$ New product appears in defect creation dropdowns across the workspace.
- [ ] **Component Hierarchy & Default Owners**: Under the new product $\rightarrow$ Click `+ Add Component` $\rightarrow$ Create component (e.g. `Wasm JIT Compiler`) with default assignee `Alice` $\rightarrow$ Verified: filing bugs in this component auto-assigns Alice.
- [ ] **Team Invite Generation**: Navigate to `/settings/team` $\rightarrow$ Click `+ Invite Team Member` $\rightarrow$ Enter optional email, toggle `Administrator` or select initial groups (`dev-team`, `qa-team`, `security-team`) $\rightarrow$ Click `Generate Invite Link` $\rightarrow$ Generates secure time-limited token URL (`/invite?token=...`).
- [ ] **Invite Acceptance Flow**: Open the generated invite link in an incognito window $\rightarrow$ Displays the invite landing page showing inviter name, role, and assigned permissions $\rightarrow$ Click `Accept & Sign Up` $\rightarrow$ Completes onboarding and binds user to the workspace with assigned roles.
- [ ] **Member Role & Priority Management**: On `/settings/team` $\rightarrow$ Update a member's priority ranking (e.g. `Rank 1` for core triage leads), grant/revoke security group access, or toggle account status (`Enabled` / `Disabled`).
- [ ] **Workspace Onboarding Experience**: Sign up as a new user without an invite $\rightarrow$ Redirected to `/onboarding` $\rightarrow$ Auto-detects pending domain invites or allows creating a custom workspace with default products and triage configurations.

---

## 16. 🧪 Automated Test Verification

Execute all unit and integration test suites locally:

```bash
# Run complete test suite across monorepo packages
npm test
```

Expected Output:
```
========================================================================
  PACKAGE               TEST SUITES   TESTS PASSING   EXECUTION TIME
========================================================================
  @mantis/api (Backend)     19             88            ~3.4s
  @mantis/web (Frontend)    12             36            ~0.6s
------------------------------------------------------------------------
  TOTAL                     31            124            ~4.1s (100% Green)
========================================================================
```
