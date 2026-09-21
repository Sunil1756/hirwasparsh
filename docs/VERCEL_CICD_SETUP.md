# Green Enlightenment — Vercel CI/CD & GitHub Environment Management Setup Guide

This guide details how to configure automated deployments with Git-based triggers on **Vercel** and manage environment variables directly from the **GitHub Repository**.

---

## 1. Architecture Overview

```
[ Developer Push / PR ]
         │
         ▼
[ GitHub Actions Workflow ]
    ├── Lint & TypeScript Typecheck
    ├── Vitest Security & Quality Tests (35+ Suites)
    ├── Vercel Environment Pull
    └── Vercel Prebuilt Deployment
         ├── main branch ─────────► Vercel Production Environment
         └── Pull Requests ───────► Vercel Preview Deployment (with PR comment)
```

---

## 2. GitHub Secrets Configuration

To enable automated deployments and environment variable synchronization, configure the following secrets in your GitHub repository under **Settings > Secrets and variables > Actions > New repository secret**:

### A. Vercel CI/CD Credentials
| Secret Name | Description | Where to Find |
| :--- | :--- | :--- |
| `VERCEL_TOKEN` | Vercel Personal Access Token | [Vercel Account Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel Team/Organization ID | Run `npx vercel link` or look in Project Settings |
| `VERCEL_PROJECT_ID` | Vercel Project ID | Found in Vercel Project Settings > General |

### B. Application Environment Variables
| Secret Name | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key | `eyJhbGciOiJIUzI1Ni...` |
| `VITE_GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `VITE_POSTHOG_KEY` | PostHog Project API Key | `phc_...` |
| `VITE_POSTHOG_HOST` | PostHog API Host | `https://us.i.posthog.com` |

---

## 3. Git-Based Deployment Workflows

### 🚀 Production Deployments (Automatic)
- **Trigger**: Every `git push` or merged PR into the `main` branch.
- **Action**: Runs quality gates (linting, typechecking, tests), builds production bundles, and deploys to the live production domain on Vercel.
- **Safety**: Deployment cancels if typecheck or test suites fail.

### 🔍 Preview Deployments (Automatic)
- **Trigger**: Every Pull Request opened or updated targeting the `main` branch.
- **Action**: Creates a branch-isolated preview deployment on Vercel and automatically leaves a comment on the PR with the live preview link.

### 🔄 Syncing Environment Variables to Vercel
- Navigate to **Actions > Sync Environment Variables to Vercel**.
- Click **Run workflow** and select the target environment (`all`, `production`, `preview`, `development`).
- The workflow runs `scripts/sync-vercel-env.mjs` to automatically push GitHub Secrets to Vercel.

---

## 4. Local Development

To run the project locally with verified environment variables:

```bash
# 1. Copy template
cp .env.example .env

# 2. Start Vite dev server
npm run dev

# 3. Run all test suites
npm test -- --run

# 4. Dry-run Vercel env sync
node scripts/sync-vercel-env.mjs --dry-run
```
