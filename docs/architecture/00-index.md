# BugZilla Architecture Documentation — Master Index

> **Purpose**: This documentation suite deconstructs the legacy Bugzilla reference repository to serve as a blueprint for building a **modern, secure, and user-friendly** bug-tracking platform. Each document is structured to inform both the re-architecture and feature roadmap of the replacement system.

---

## Evaluation Rubric Reference

| Criterion | Weight | Key Areas Covered |
|---|---|---|
| Problem Understanding & Core Functionality | 20 pts | `01-overview.md`, `03-domain-model.md` |
| Innovation & Meaningful Differentiation | 20 pts | `09-modernization-roadmap.md` |
| Technical Implementation & Architecture | 15 pts | `02-system-architecture.md`, `05-database-schema.md` |
| User Experience & Accessibility | 15 pts | `07-frontend-ux.md` |
| Performance & Reliability | 20 pts | `06-performance-caching.md`, `08-background-jobs.md` |
| Documentation & Explanation | 10 pts | This entire suite |

---

## Document Index

| # | File | Size | Description |
|---|---|---|---|
| 00 | [`00-index.md`](./00-index.md) | 3 KB | **This file** — master index and navigation |
| 01 | [`01-overview.md`](./01-overview.md) | 8 KB | System overview, problem statement, core workflows |
| 02 | [`02-system-architecture.md`](./02-system-architecture.md) | 21 KB | Full layered architecture, component interactions |
| 03 | [`03-domain-model.md`](./03-domain-model.md) | 17 KB | Core domain objects: Bug, User, Product, Flag, etc. |
| 04 | [`04-api-and-webservices.md`](./04-api-and-webservices.md) | 12 KB | REST, JSON-RPC, XML-RPC APIs |
| 05 | [`05-database-schema.md`](./05-database-schema.md) | 26 KB | Complete database schema with all tables |
| 06 | [`06-performance-caching.md`](./06-performance-caching.md) | 12 KB | Caching, memcached, performance optimizations |
| 07 | [`07-frontend-ux.md`](./07-frontend-ux.md) | 18 KB | Frontend, templates, JS, UX patterns |
| 08 | [`08-background-jobs.md`](./08-background-jobs.md) | 12 KB | Async jobs, email, whining, stats collection |
| 09 | [`09-modernization-roadmap.md`](./09-modernization-roadmap.md) | 19 KB | Feature gaps, modern stack recommendations |
| 10 | [`10-security-model.md`](./10-security-model.md) | 11 KB | Auth, groups, permissions, CSRF, security hardening |
| 11 | [`11-extension-system.md`](./11-extension-system.md) | 14 KB | Plugin/extension architecture and hooks |
| 12 | [`12-search-engine.md`](./12-search-engine.md) | 14 KB | Boolean search, quicksearch, saved queries |

**Total**: ~187 KB of architecture documentation

---

## How to Use This Documentation

1. **Start with `01-overview.md`** to understand the problem domain and core developer workflows.
2. **Read `02-system-architecture.md`** to understand the layered architecture before diving into details.
3. **Use `03-domain-model.md` and `05-database-schema.md`** as reference when designing the new data model.
4. **Consult `09-modernization-roadmap.md`** for specific, actionable suggestions to build the modern replacement.
5. Use the remaining files as deep-dive references for specific subsystems.

---

## Key Insights Summary

### What Bugzilla Gets Right (Preserve)
- Stable numeric bug IDs as primary reference
- Complete immutable field-level change history
- Fine-grained per-event, per-role email subscription model
- Flag-based approval/review workflow with requestee targeting
- Saved/shared named queries as team views
- Duplicate detection and dependency tracking
- Group-based bug visibility with per-product configuration
- Extensible via hooks without modifying core

### What Bugzilla Gets Wrong (Improve)
- CGI-per-action routing (no centralized router)
- Server-side rendered only (no reactivity)
- No in-app notifications (email only)
- No real-time collaboration (must refresh)
- No Markdown in comments (plain text only)
- No mobile/responsive design
- Attachments stored as database BLOBs (not S3)
- No AI assistance for triage or duplicate detection
- Complex installation (Apache + mod_perl + CPAN)
- Limited analytics (pre-aggregated, not real-time)
