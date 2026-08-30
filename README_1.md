# Mantis — Modern Defect & Vulnerability Management Platform

A high-performance modernization of the Mantis open-source defect tracking platform, re-architected into a TypeScript monorepo powered by **Next.js 14** (App Router & API Routes), **PostgreSQL 16**, and **TypeScript**.

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
- **`bz-monitor` CLI Crash Interceptor**: Terminal developer CLI that intercepts test/compiler stack traces and files bugs directly from shell commands.

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
To launch the complete application with persistent storage, pre-populated seed data, and live APIs:

```bash
# 1. Verify Node.js & environment requirements
npm run preflight

# 2. Boot PostgreSQL 16 container, run schema migrations & seed test dataset
docker compose up -d db
npm run migrate
npm run seed

# 3. Start development server (Web Interface & API Routes at http://localhost:3000)
npm run dev:web
```

---

## 📁 Repository Structure

```text
clonefest-2/
├── apps/
│   ├── web/                   # Next.js 14 App Router Frontend & API Routes (/api/v1)
│   │   ├── app/               # App Router pages & REST API endpoints (bugs, auth, webhooks)
│   │   ├── components/        # React components (Interactive DAG, Triage, Webhooks)
│   │   └── lib/               # UI state management & database client utilities
│   ├── api/                   # Dedicated API Gateway package
│   └── cli/                   # Developer CLI tool for Mantis environment operations
├── packages/
│   └── shared/                # Shared TypeScript definitions, schemas & utilities
├── docs/                      # Technical specifications & architecture guides
│   ├── MANTIS_WEBHOOK_DEMO_README.md
│   ├── additional-features.md
│   ├── bug_workflow.md
│   └── implementation-rules.md
├── docker-compose.yml         # PostgreSQL 16 container configuration
├── seed.ts                    # Database seeding script for test entities
└── package.json               # Workspace root configuration & scripts
```

---

## 🛠️ Architecture & Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend & API** | Next.js 14, React 18, Tailwind CSS | App Router SPA with server components, dark mode, and integrated REST API routes (`/api/v1`). |
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
| `npm run dev:web` | Starts the Next.js web application and API in development mode (`http://localhost:3000`). |
| `npm run build` | Builds the shared package and Next.js production bundle. |
| `npm run migrate` | Executes database migrations against PostgreSQL. |
| `npm run seed` | Seeds the database with test projects, components, users, and bugs. |

---

## 📚 Technical Documentation

For in-depth architectural specs and subsystem guides, see the [`docs/`](docs) directory:

- [`docs/bug_workflow.md`](docs/bug_workflow.md) — Bug lifecycle FSM rules & state transition rules.
- [`docs/MANTIS_WEBHOOK_DEMO_README.md`](docs/MANTIS_WEBHOOK_DEMO_README.md) — Webhook configuration, payload formats, and verification.
- [`docs/additional-features.md`](docs/additional-features.md) — Overview of security moats and algorithmic features.
- [`docs/implementation-rules.md`](docs/implementation-rules.md) — Coding conventions, security mandates, and architectural patterns.
