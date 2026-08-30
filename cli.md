# Mantis CLI (`mantis` / `bz`) — Developer & Triage Manual

Welcome to the **Mantis CLI** — the keyboard-first terminal command center for the Mantis bug tracking platform (*"Stealthy monitoring, precise triage"*).

Built for high-velocity engineering workflows: instantaneous bug triage, critical-path dependency trees (CPM), offline CVSS v4.0 calculator, Gemini AI synthesis, and release readiness audits.

---

## 1. Installation & Environment Setup

### Prerequisites
1. **Node.js**: v20.x or higher
2. **Repository Dependencies**: Run `npm install` from the workspace root.
3. **Mantis Server**: Next.js Web/API running on port 3000 (`http://localhost:3000`) or dedicated API on port 3001.

### Build & Link
```bash
# Compile shared packages & CLI binary
npm --prefix packages/shared run build
npm --prefix apps/cli run build

# Link globally for terminal-wide `mantis` & `bz` commands
cd apps/cli
npm link
cd ../..
```

*Note: You can use `mantis` or `bz` interchangeably.*

---

## 2. Quickstart & Authentication

### 1-Click Persona Quick-Login

Instantly switch active evaluation personas:

| Persona | Role | Email | Command |
|---|---|---|---|
| `admin` | System Administrator | `admin@mantis.local` | `mantis auth login --persona admin` |
| `alice` | Senior Developer | `alice@mozilla.com` | `mantis auth login --persona alice` |
| `bob` | QA Engineer | `bob@mozilla.com` | `mantis auth login --persona bob` |
| `carol` | Security Lead | `carol@mozilla.com` | `mantis auth login --persona carol` |
| `dave` | Performance Eng | `dave@mozilla.com` | `mantis auth login --persona dave` |
| `eve` | Triage Coordinator | `eve@mozilla.com` | `mantis auth login --persona eve` |

```bash
# Log in as Alice (Dev Lead)
mantis auth login --persona alice

# Verify active session identity & permissions
mantis auth me
```

---

## 3. Command Reference

### 🐛 Bug Management (`mantis bug` / `mantis ls`)

#### List & Filter Bugs
```bash
# List all active bugs with formatted color table
mantis bug list

# Filter by status and priority
mantis bug list --status CONFIRMED --priority P1

# Output raw JSON stream
mantis bug list --json
```

#### Inspect Detailed Bug Dossier
```bash
mantis bug view 1
```

#### File a New Bug
```bash
mantis bug create \
  --summary "WebSocket reconnection fails on network drop" \
  --description "1. Connect WS\n2. Disable network\n3. Re-enable network\n4. Connection hangs" \
  --product-id 1 \
  --component-id 1 \
  --priority P2 \
  --severity major
```

#### Update Bug Status & Lifecycle
```bash
# Transition to IN_PROGRESS
mantis bug status 1 IN_PROGRESS

# Resolve as FIXED
mantis bug status 1 RESOLVED --resolution FIXED
```

---

### 💬 Discussion & Comments (`mantis comment`)

#### View Comment Thread
```bash
mantis comment list 1
```

#### Add Comment (Direct argument or piped stream)
```bash
# Direct text comment
mantis comment add 1 "Verified fix on Firefox 128.0 build."

# Pipe stdout/markdown file into comment
cat release_notes.md | mantis comment add 1
```

---

### 📊 CPM Critical Path & Dependency Tree (`mantis graph` / `mantis dep`)

#### Render ASCII Dependency Tree with Critical Path Analysis
```bash
mantis graph 1
```

#### Add / Remove Dependency Link
```bash
# Bug 1 blocks Bug 2
mantis dep add 1 2

# Remove dependency edge
mantis dep remove 1 2
```

---

### 🔒 Security Governance & CVSS v4.0 (`mantis cvss` / `mantis security`)

#### Calculate CVSS v4.0 Score Offline
```bash
mantis cvss "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
```

#### Update Bug Security Attributes & Embargo
```bash
mantis security update 1 \
  --vector "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N" \
  --security true \
  --embargo 2026-11-30
```

---

### ✨ Gemini AI Assistant (`mantis triage`)

Synthesize reproduction steps, root cause, confidence score, and recommended next steps:

```bash
mantis triage 1
```

---

### 📈 Metrics & Release Readiness (`mantis metrics` / `mantis readiness`)

#### Check MTTR & Bug Velocity
```bash
mantis metrics velocity
```

#### Calculate Milestone Release Readiness Score (0–100%)
```bash
mantis readiness 128.0
```

---

### 📥 Interactive Standup Triage Inbox (`mantis inbox`)

Launch the terminal triage view for unconfirmed bugs:

```bash
mantis inbox
```

---

## 4. Automated Testing

Run the Vitest test suite across all command modules:

```bash
npm --prefix apps/cli test
```
