# BugzillaRevamp — Complete Capabilities & Feature Guide

> **BugzillaRevamp** is a modernized, enterprise-grade defect tracking, vulnerability scoring, and release governance platform. It completely replaces legacy Perl Bugzilla with a high-performance Next.js 14, Node.js Fastify, and PostgreSQL 16 stack.

---

## 1. Do I need Demo Bugs or Can Users Enter Their Own?

* **Users can create, edit, and manage whatever bugs they want!**
* The platform is a **fully functional, live database application**. Any user can sign up, log in, create real bugs, upload stack traces, assign teammates, change statuses, and file security vulnerabilities.
* The "demo bugs" (created by `npm run seed`) are **only initial sample data** to populate the platform so that dependency graphs, charts, and Kanban boards look realistic upon initial launch. You can delete them, edit them, or add completely new bugs at any time through the web interface.

---

## 2. What Is "Swagger UI" and Do I Need It?

* **Swagger UI is NOT the user interface of your website.**
* Swagger UI is just an automatic backend documentation page (`/docs`) used by API developers to test raw HTTP routes.
* **End users will NEVER see or need Swagger UI.** Users will interact entirely with the modern, dark-mode Next.js web application at `http://localhost:3000`.

---

## 3. Complete List of Finished Website Capabilities

```
                                 BUGZILLAREVAMP
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                                                                         │
   │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
   │  │   Core Tracker   │  │    Moat Engine   │  │ Collaboration & Git   │  │
   │  │ • Bug CRUD & FSM │  │ • Critical Path  │  │ • Markdown & Mentions │  │
   │  │ • Audit Trail    │  │ • CVSS 4.0 Math  │  │ • GitHub Webhooks     │  │
   │  │ • 404 Secrecy    │  │ • 90-Day Embargo │  │ • Notifications       │  │
   │  └──────────────────┘  └──────────────────┘  └───────────────────────┘  │
   │                                                                         │
   │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
   │  │ Search & Dups    │  │   UI & Boards    │  │  Analytics & AI       │  │
   │  │ • GIN FTS Vector │  │ • ⌘K Command Bar │  │ • AI Triage (Gemini)  │  │
   │  │ • Live Typeahead │  │ • Kanban DnD     │  │ • Milestone Readiness │  │
   │  │ • <mark> Stems   │  │ • Single-Key J/K │  │ • SQL MTTR Velocity   │  │
   │  └──────────────────┘  └──────────────────┘  └───────────────────────┘  │
   │                                                                         │
   └─────────────────────────────────────────────────────────────────────────┘
```

---

### A. Core Bug Lifecycle & State Machine
1. **Interactive Bug Creation Form (`/bugs/new`)**:
   - Custom summaries, multi-line descriptions, product/component cascading selectors, versioning, target milestones, priority (`P1`–`P5`), severity, and estimated resolution hours.
2. **Strict Server-Side State Machine (FSM)**:
   - Enforces valid lifecycle transitions: `UNCONFIRMED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `VERIFIED` $\rightarrow$ `CLOSED`.
   - Rejects illegal shortcuts (e.g. `UNCONFIRMED` $\rightarrow$ `CLOSED`) with user-friendly error feedback.
   - **Resolution Guard**: Enforces mandatory resolution codes (`FIXED`, `INVALID`, `WONTFIX`, `DUPLICATE`, `WORKSFORME`, `INCOMPLETE`) when resolving a bug, and automatically clears resolution upon reopening.
3. **Immutable, Append-Only Audit Trail**:
   - Every single field change (status, priority, assignee, embargo, CVSS score) is permanently recorded with who changed it, timestamp, old value, and new value.
   - Visible in the dedicated **Activity Tab** on the bug detail page.

---

### B. Interactive Dependency Graph & Critical Path Method (CPM)
1. **Interactive Node-Link Visual DAG (`/bugs/:id/graph`)**:
   - Built with React Flow and automatic Dagre hierarchy layout.
   - Displays all upstream blockers and downstream blocked bugs.
   - Clicking any graph node opens an instant slide-over panel with bug summary, status, and direct link.
2. **Pulsing Critical Path Highlighting**:
   - Automatically computes Earliest Finish Time (EFT) using Kahn's topological sort.
   - Identifies the bottleneck path and renders it in **pulsing red animated stroke lines** (`.critical-edge`), showing engineering leads the exact sequence delaying release.
3. **Recursive Cycle Prevention**:
   - Real-time cycle detection blocks users from creating circular dependencies (e.g. Bug A blocks Bug B blocks Bug A), displaying a clear warning toast.

---

### C. FIRST.org CVSS v4.0 Vulnerability Engine & Embargo Security
1. **Interactive CVSS v4.0 Calculator Modal**:
   - Allows security teams to configure FIRST.org metrics (Attack Vector, Attack Complexity, Privileges Required, User Interaction, System Impacts).
   - Real-time zero-network score computation and live animated severity arc (None, Low, Medium, High, Critical).
2. **Automated 90-Day Embargo Disclosure Banner**:
   - Setting a bug to "Embargoed" defaults the disclosure date to 90 days out and locks the bug to the `security-team` group.
   - Shows a live ticking **`DD:HH:MM:SS` countdown timer banner** on the bug detail page.
3. **Strict 404 Group Secrecy**:
   - Unauthorized users trying to access embargoed or restricted security bugs receive an HTTP **404 Not Found** (never 403 Forbidden), guaranteeing that the existence of zero-day vulnerabilities is completely concealed.

---

### D. Intelligent Search & Proactive Duplicate Prevention
1. **Fast Stemmed Full-Text Search (`/bugs?q=...`)**:
   - PostgreSQL `tsvector` search delivering sub-20ms queries with English stemming (e.g., searching `"parse"` matches `"parsing"` and `"parsed"`).
   - Ranked by relevance with matching terms wrapped in `<mark>` highlight tags.
2. **Live Typeahead Duplicate Prevention**:
   - As an engineer types a summary on the bug creation form, a background trigram similarity engine (`pg_trgm`) checks existing bugs.
   - Displays an alert card with potential duplicate matches (similarity > 0.28) *before* submission, preventing duplicate clutter.

---

### E. Modern UX, Drag-and-Drop Kanban & Keyboard Shortcuts
1. **Drag-and-Drop Kanban Board (`/kanban`)**:
   - 6-column board with draggable bug cards showing priority dots, badges, and assignee avatars.
   - **Optimistic UI with Rollback**: Dragging a card to a column immediately moves it; if the server state machine rejects the transition, the card automatically bounces back to its original column with an explanatory toast.
2. **Command Palette (`⌘K` / `Ctrl+K`)**:
   - Fast spotlight modal accessible anywhere on the site.
   - Direct jump to bug numbers (typing `104` navigates to `/bugs/104`), status transitions (`status:resolved`), assigning to self (`assign:me`), and quick navigation.
3. **Single-Key Keyboard Triage Inbox**:
   - Standup triage without touching the mouse:
     - `J` / `K`: Move selection up/down in bug lists
     - `Enter`: Open selected bug
     - `/`: Focus search bar
     - `A`: Assign bug to me
     - `R`: Open resolve dialog
     - `?`: Open keyboard shortcut cheatsheet modal
4. **Theme Support**:
   - Sleek dark mode by default with instant toggle to light mode, persisted in local storage.

---

### F. 1-Click AI Triage Assistant (Gemini 2.0 Flash)
1. **AI Synthesis Card (`✨ AI Triage`)**:
   - A single click sends the bug description and up to 30 comment threads to **Gemini 2.0 Flash**.
   - Generates a structured analysis in < 2 seconds:
     - 2-sentence root cause summary
     - Suggested priority (`P1`–`P5`)
     - Suggested component
     - Confidence reason & recommended next steps
2. **Resilient Fallback**:
   - If the external LLM is unreachable or times out (hard 2.5s cutoff), the UI cleanly shows a fallback status without crashing or blocking the user.

---

### G. Rich-Text Collaboration, @Mentions & Notifications
1. **GitHub-Flavored Markdown in Comments**:
   - Dual-tab **Write / Preview** editor.
   - Markdown toolbar (Bold, Italic, Code, Code Block, Link, Lists).
   - Syntax-highlighted code blocks with a 1-click **Copy to Clipboard** button.
   - Automatic sanitization protecting against XSS attacks.
2. **Interactive @Mentions Autocomplete**:
   - Typing `@` inside comment boxes pops up an avatar + username selector.
   - Mentioning a user automatically registers `comment_mentions` and sends an in-app notification.
3. **In-App Notification Center**:
   - Header notification bell with unread badge count.
   - Popover list of recent mentions and status change alerts with 1-click "Mark All as Read".

---

### H. Git & GitHub SCM Integration (Real Automation)
1. **HMAC-Verified GitHub Webhook Endpoint (`/api/v1/webhooks/github`)**:
   - Secure cryptographic signature validation (`timingSafeEqual` SHA-256).
2. **Auto-Closing Bugs on Commit / PR Merge**:
   - Pushing a commit with `Fixes #104` or merging a Pull Request with `Closes #104` automatically moves Bug #104 to `RESOLVED (FIXED)` and records the commit SHA in the audit trail.
3. **Commits & PRs Tab on Bug Detail**:
   - Dedicated tabs listing all linked GitHub commits and pull requests with links to GitHub, commit authors, timestamps, and merged badges.

---

### I. Engineering Analytics & Milestone Release Readiness
1. **0–100% Release Readiness Gauge (`/milestones/:id/readiness`)**:
   - An animated circular gauge that scores release health based on actual risk factors:
     - Deducts points for open CPM critical path bugs (-15 pts)
     - Deducts points for open CVSS Critical (-20 pts) and High (-10 pts) vulnerabilities
     - Deducts points for pending blocking flags (-5 pts)
     - Deducts points for unresolved P1 defects (-8 pts)
   - Includes an accordion breakdown showing exactly which bugs are blocking the release.
2. **Engineering Velocity & MTTR Dashboard (`/analytics/velocity`)**:
   - Computes Mean Time To Resolve (**MTTR**: average & median days) aggregated by product.
   - Tracks 30-day velocity trends and high-priority resolution counts.

---

### J. `bz-monitor` CLI Tool (`apps/cli/`)
* **Terminal Test Crash Interception**: Running `bz-monitor exec -- npm test` passively intercepts stack traces from compiler/test failures, strips ANSI escape sequences, deduplicates identical crashes, and lets developers stage or push bug reports straight from their terminal into the web database.
* **Git-Style Terminal State Sync**: Commands like `bz-monitor status`, `bz-monitor pull`, `bz-monitor log`, and `bz-monitor resolve` bring Bugzilla state directly to developers' command lines.

---

### Summary Checklist of User Experience

| User Action | Where on Website | Result |
|---|---|---|
| **Sign Up / Log In** | `/login`, `/signup` | Secure Argon2id password hash + HttpOnly session cookie |
| **File a New Defect** | `/bugs/new` | Full form + live duplicate suggestions alert |
| **View & Filter Bugs** | `/bugs` | Stemmed search bar, status/priority filters, `j`/`k` shortcuts |
| **Inspect Dependency DAG** | `/bugs/:id/graph` | React Flow visual graph with pulsing critical path |
| **Score Security Bug** | `/bugs/:id` $\rightarrow$ CVSS Modal | FIRST.org metric picker + live score arc |
| **Drag Status on Board** | `/kanban` | Smooth drag-and-drop with state machine rules |
| **1-Click AI Triage** | `/bugs/:id` $\rightarrow$ AI Card | 2-second Gemini summary of 50-comment threads |
| **Write Formatted Comment** | `/bugs/:id` | Markdown preview, code block copy button, `@username` popover |
| **Push GitHub Commit** | Terminal $\rightarrow$ GitHub | Bug auto-resolves and links commit SHA in bug tab |
| **Check Milestone Health** | Executive Dashboard | 0–100% circular release readiness gauge |
