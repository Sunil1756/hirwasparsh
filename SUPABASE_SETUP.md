# Green Enlightenment – Supabase & Production Setup Guide

This guide enables 100% database & backend ownership for **Green Enlightenment** (free of any Lovable dependencies).

---

## 1. Create Your Free Supabase Project

1. Visit **[supabase.com](https://supabase.com)** and sign in / sign up with GitHub or Google.
2. Click **New Project**.
3. Choose a project name (e.g. `green-enlightenment` or `hirwasparsh`), a secure database password, and select your preferred region (e.g. `ap-south-1` Mumbai).

---

## 2. Initialize Database Schema (1-Click)

1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of the file:
   `supabase/consolidated_schema.sql`
4. Paste it into the SQL Editor and click **Run**.
5. All tables (`trees`, `profiles`, `plantation_projects`, `growth_updates`, `challenges`, `audit_logs`), Row Level Security policies, and verification functions will be created.

---

## 3. Configure Storage Buckets

1. In Supabase Dashboard, go to **Storage**.
2. Ensure the following public buckets exist (or create them if needed):
   - `tree-photos` (Public)
   - `growth-updates` (Public)
   - `project-evidence` (Public)
   - `avatars` (Public)

---

## 4. Connect Your Local & Production App

Update your `.env` file (or `.env.local`) with your new project credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://<YOUR-PROJECT-REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi..."
VITE_SUPABASE_PROJECT_ID="<YOUR-PROJECT-REF>"

# Direct Google Gemini AI Configuration
VITE_GEMINI_API_KEY="AIzaSy..."
```

---

## 5. Get Your Free Google Gemini API Key

1. Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Click **Create API Key**.
3. Copy your key and add it to `VITE_GEMINI_API_KEY` in `.env` (or enter it via the **Connect Gemini AI** button in the app UI).

---

## 6. Deploy to Production (Vercel / Cloudflare)

1. Push your latest code changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Add Map My Crop features and direct Gemini integration"
   git push origin main
   ```
2. Go to **[vercel.com](https://vercel.com)** $\rightarrow$ **Add New Project** $\rightarrow$ Import your GitHub repo `hirwasparsh`.
3. Add the Environment Variables from Step 4 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GEMINI_API_KEY`).
4. Click **Deploy**!
5. Add your custom domain under **Settings $\rightarrow$ Domains**.
