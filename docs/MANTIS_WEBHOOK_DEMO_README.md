# 🦗 Mantis — GitHub SCM Webhook & Traceability Demo

> **Live Evaluation Sandbox:** [https://mantis-clonefest.vercel.app](https://mantis-clonefest.vercel.app)  
> **Repository Purpose:** This repository is pre-configured with Mantis webhooks so judges, evaluators, and engineers can test real-time Git commit traceability, automatic defect resolution, and audit logging.

---

## ⚡ 1. Fast Test for Judges & Evaluators (30 Seconds)

You can verify live Git-to-Bugzilla traceability right now by committing directly to this repository:

### Step 1: Clone this repo or edit a file on GitHub
```bash
git clone https://github.com/OjasKugore/mantis-webhook-demo.git
cd mantis-webhook-demo
```

### Step 2: Make a commit referencing any Mantis Bug ID
Include `Fixes #<id>`, `Closes #<id>`, or `Bug <id>` in your commit message:

```bash
# Example for Bug #1 (or any bug ID in your workspace)
git commit --allow-empty -m "Fix memory leak in network pipeline (Fixes #1)"
git push origin main
```

### Step 3: Watch it update live in Mantis!
1. Open [https://mantis-clonefest.vercel.app/bugs/1](https://mantis-clonefest.vercel.app/bugs/1).
2. Click the **"SCM"** tab under the activity panel.
3. Your commit hash, author name, timestamp, and GitHub diff link will appear **instantly**, and the defect will automatically transition to **`RESOLVED (FIXED)`**.

---

## 📝 2. Supported Commit Message Syntax

Mantis parses incoming GitHub push and pull request webhooks for standard issue reference keywords:

| Keyword Format | Example | Action in Mantis |
| :--- | :--- | :--- |
| **`Fixes #<id>`** | `git commit -m "Optimize query index (Fixes #4)"` | Links commit & auto-resolves defect to `RESOLVED (FIXED)` |
| **`Closes #<id>`** | `git commit -m "Patch auth timeout (Closes #12)"` | Links commit & auto-resolves defect to `RESOLVED (FIXED)` |
| **`Resolves #<id>`** | `git commit -m "Update CSP header rules (Resolves #7)"` | Links commit & auto-resolves defect to `RESOLVED (FIXED)` |
| **`Bug <id>`** | `git commit -m "Bug 2: Wayland surface buffer sync"` | Links commit and author metadata to bug audit trail |

---

## 🔌 3. How to Connect Your Own Real Repository to Mantis

If you want to connect an actual repository and use it with Mantis for your team or custom project:

### Step 1: Open GitHub Repository Settings
1. Go to your repository on GitHub (`https://github.com/<your-org>/<your-repo>`).
2. Click on the **Settings** tab at the top.
3. In the left sidebar, click **Webhooks** (under *Code and automation*).
4. Click the **Add webhook** button on the top right.

### Step 2: Configure Webhook Parameters
Fill in the fields exactly as follows:

* **Payload URL:** `https://mantis-clonefest.vercel.app/api/v1/webhooks/github`
* **Content type:** Select **`application/json`** *(Do not use `x-www-form-urlencoded`)*
* **Secret:** *(Leave blank or enter your workspace secret)*
* **SSL verification:** Select **Enable SSL verification**
* **Which events would you like to trigger this webhook?** Select **"Just the push event"** (and optionally *Pull requests*)
* **Active:** Ensure the **Active** checkbox is checked `[x]`.

### Step 3: Save & Test
1. Click **Add webhook**. GitHub will deliver a ping handshake test marked with a green checkmark (✔ `200 OK`).
2. Push any commit referencing a bug ID (e.g. `Fixes #3`).
3. View the bug report on Mantis to see the commit linked live!

---

## 🛡️ 4. Key Architectural Highlights Tested
* **Bi-directional Isolation:** SCM activity in the Judge Demo Sandbox remains separate from custom non-judge workspaces.
* **Zero-Leakage Security:** Code references to quarantined security bugs under active 90-day embargoes maintain strict visibility restrictions.
* **Audit Trail Compliance:** Produces a permanent, unalterable log mapping commits to engineers for security audits (SOC2 / ISO 27001).
* **Automated Workflow Acceleration:** Eliminates manual administrative overhead by keeping tickets in sync with GitHub branch merges.
