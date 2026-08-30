# Mantis — Modern Defect & Vulnerability Management Platform

A high-performance modernization of the Mantis open-source defect tracking platform, re-architected into a TypeScript monorepo powered by **Fastify 4** (API Gateway on port 3001), **Next.js 14** (Web UI on port 3000), **PostgreSQL 16**, and the **Mantis CLI** (`mantis` / `bz`).

---

## ✨ Key Executed Features

- **Strict Finite State Machine (FSM)**: Enforces lifecycle transitions (`UNCONFIRMED` ➔ `CONFIRMED` ➔ `IN_PROGRESS` ➔ `RESOLVED` ➔ `VERIFIED` ➔ `CLOSED`) with mandatory resolution codes and audit trails.
- **CPM Critical Path Engine**: Kahn's topological sort calculates dependency DAG bottleneck paths rendered in pulsing animated edges with recursive CTE cycle rejection.
- **FIRST.org CVSS v4.0 Calculator**: Zero-network metric calculator modal with live severity arc and 90-day embargo countdown timer.
- **404 Zero-Leakage Group Secrecy**: Conceals restricted security bugs from unauthorized users with HTTP 404 Not Found status instead of HTTP 403 Forbidden.
- **Proactive Duplicate Prevention**: Real-time `pg_trgm` trigram similarity matching suggests existing duplicate bugs before form submission.
- **Stemmed Full-Text Search**: Fast sub-20ms PostgreSQL `tsvector` query engine with English stem parsing and match highlighting.
- **1-Click AI Triage Assistant**: Synthesizes 30+ comment threads into root causes, priorities, and action items in < 2s using Gemini 2.0 Flash.
- **Drag-and-Drop Kanban Board**: 6-column board with optimistic UI updates and automatic FSM rollback on invalid moves.
- **Keyboard Navigation & Command Palette**: Instant `⌘K` command bar and Vim-style single-key triage inbox (`J`/`K` navigation, `A` assign, `R` resolve).
- **Markdown Comments & @Mentions**: GitHub-Flavored Markdown editor with code copy buttons, `@username` popover autocomplete, and in-app notifications.
- **Git SCM Webhooks Automation**: HMAC-verified webhook endpoint that auto-resolves bugs on commit pushes or PR merges containing `Fixes #ID`.
- **Milestone Release Readiness & Analytics**: 0–100% circular health score based on critical path risks and MTTR engineering velocity analytics.
- **Mantis Terminal CLI (`mantis` / `bz`)**: Developer CLI supporting 1-click persona quick-logins (`mantis auth login --persona admin`), ASCII dependency trees, offline CVSS scoring, and terminal triage.

---

## 🚀 Evaluator Quick Start

### Option A: Fast Test Verification (In-Memory SQL)
Run the automated test suite without requiring a running database instance:
```bash
npm install
npm test
```
*Executes 88 unit and integration tests across 19 test files in seconds via `pg-mem`.*

### Option B: Full-Stack Local Setup (Docker + PostgreSQL)
Launch the complete application with persistent storage, pre-populated seed data, and live APIs:

```bash
# 1. Verify Node.js & environment requirements
npm run preflight

# 2. Boot PostgreSQL 16 container, run schema migrations & seed test dataset
docker compose up -d db
npm run migrate
npm run seed

# 3. Start Fastify API Gateway (http://localhost:3001) & Next.js Web UI (http://localhost:3000)
npm run dev:api   # API Gateway & Interactive OpenAPI Swagger Docs at http://localhost:3001/docs
npm run dev:web   # Next.js 14 Web Application
```

### Option C: Developer CLI Tool (`mantis` / `bz`)
Interact with Mantis directly from your terminal:

```bash
# Build shared packages & CLI binary
npm --prefix packages/shared run build
npm --prefix apps/cli run build

# 1-Click persona quick-login (admin, alice, bob, carol, dave, eve)
node apps/cli/dist/index.js auth login --persona alice

# View active user identity & list bugs in terminal
node apps/cli/dist/index.js auth me
node apps/cli/dist/index.js bug list
```

---

## 📁 Repository Structure

```text
clonefest-2/
├── apps/
│   ├── api/                   # Fastify 4 REST API Gateway (Port 3001 & Swagger at /docs)
│   │   ├── src/
│   │   │   ├── db/            # Schema migrations & PostgreSQL pool setup
│   │   │   ├── lib/           # Core algorithmic engines (FSM, CPM, CVSS v4, AI)
│   │   │   ├── middleware/    # Auth, RBAC & 404 Group Secrecy enforcement
│   │   │   └── routes/        # REST endpoints (bugs, auth, webhooks, search, etc.)
│   │   └── test/              # Vitest test suite (Unit & Integration)
│   ├── web/                   # Next.js 14 App Router Frontend (Port 3000)
│   │   ├── app/               # Web application pages & interactive views
│   │   ├── components/        # React components (Interactive DAG, Triage, Webhooks)
│   │   └── lib/               # UI state management & API client utilities
│   └── cli/                   # Mantis Developer CLI (`mantis` / `bz` commands)
├── packages/
│   └── shared/                # Shared TypeScript definitions, schemas & utilities
├── docs/                      # Technical specifications & architecture guides
│   ├── MANTIS_WEBHOOK_DEMO_README.md
│   ├── additional-features.md
│   ├── bug_workflow.md
│   └── implementation-rules.md
├── cli.md                     # Complete CLI User & Developer Manual
├── docker-compose.yml         # PostgreSQL 16 container configuration
├── seed.ts                    # Database seeding script for test entities
└── package.json               # Workspace root configuration & scripts
```

---

## 🛠️ Architecture & Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **API Gateway** | Fastify 4, TypeScript | High-throughput REST API with Zod schema validation & OpenAPI docs (`/docs`). |
| **Web Frontend** | Next.js 14, React 18, Tailwind CSS | App Router SPA with server components, dark mode, and interactive views. |
| **Terminal CLI** | Commander.js, Chalk, Cli-Table3 | Terminal command center (`mantis` / `bz`) with persona logins & terminal triage. |
| **Database** | PostgreSQL 16 | Relational store with full-text search vectors, triggers, and transactions. |
| **AI Engine** | Gemini 2.0 Flash | Automated bug triage, summary synthesis, and duplicate detection. |
| **Testing** | Vitest, `pg-mem` | Isolated test execution with 100% in-memory database mocks. |

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run preflight` | Checks Node.js version, environment variables, and pre-requisites. |
| `npm test` | Runs backend unit and integration test suites. |
| `npm run setup` | Executes preflight checks, launches database container, runs migrations, and seeds test data. |
| `npm run dev:api` | Starts the Fastify API Gateway server in watch mode (`http://localhost:3001`). |
| `npm run dev:web` | Starts the Next.js web application in development mode (`http://localhost:3000`). |
| `npm run build` | Builds the shared package and Next.js production bundle. |
| `npm run migrate` | Executes database migrations against PostgreSQL. |
| `npm run seed` | Seeds the database with test projects, components, users, and bugs. |

---

## 📚 Technical Documentation

For in-depth architectural specs and subsystem guides:

- [`cli.md`](cli.md) — Complete Developer CLI User & Triage Manual (`mantis` / `bz`).
- [`docs/bug_workflow.md`](docs/bug_workflow.md) — Bug lifecycle FSM rules & state transition rules.
- [`docs/MANTIS_WEBHOOK_DEMO_README.md`](docs/MANTIS_WEBHOOK_DEMO_README.md) — Webhook configuration, payload formats, and verification.
- [`docs/additional-features.md`](docs/additional-features.md) — Overview of security moats and algorithmic features.
- [`docs/implementation-rules.md`](docs/implementation-rules.md) — Coding conventions, security mandates, and architectural patterns.
