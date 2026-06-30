# Deployment Guide — AI Finance Operator

Follow these steps exactly. Total time: ~30 minutes.

---

## Step 1 — Get Free API Keys

| Service  | URL                        | What you need        |
|----------|----------------------------|----------------------|
| Groq     | https://console.groq.com   | API key (free, no CC)|
| Supabase | https://supabase.com       | URL + anon + service keys |
| Clerk    | https://clerk.com          | Publishable + Secret keys |
| Vercel   | https://vercel.com         | Connect GitHub repo  |
| Render   | https://render.com         | Connect GitHub repo  |

---

## Step 2 — Supabase Setup

1. Create a new Supabase project (free tier)
2. Go to **SQL Editor** → paste contents of `backend/app/db/supabase_setup.sql` → Run
3. Go to **Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY`
4. Go to **Settings → Database** → copy connection string → `DATABASE_URL`
   - Change `postgresql://` to `postgresql+asyncpg://`

---

## Step 3 — Clerk Setup

1. Create app at https://clerk.com
2. Go to **API Keys** → copy:
   - Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret key → `CLERK_SECRET_KEY`
3. Under **Redirects**, set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

---

## Step 4 — Push to GitHub

```bash
cd ai-finance-operator
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-finance-operator.git
git push -u origin main
```

---

## Step 5 — Deploy Backend on Render

1. Go to https://render.com → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables** (one by one):
   ```
   GROQ_API_KEY           = gsk_your_key
   GROQ_MODEL             = llama-3.3-70b-versatile
   SUPABASE_URL           = https://xxx.supabase.co
   SUPABASE_ANON_KEY      = eyJ...
   SUPABASE_SERVICE_KEY   = eyJ...
   DATABASE_URL           = postgresql+asyncpg://...
   CLERK_SECRET_KEY       = sk_live_...
   CLERK_PUBLISHABLE_KEY  = pk_live_...
   ALLOWED_ORIGINS        = ["https://your-app.vercel.app"]
   APP_ENV                = production
   ```
5. Click **Deploy**
6. Copy your Render URL: `https://ai-finance-operator-api.onrender.com`

---

## Step 6 — Deploy Frontend on Vercel

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add **Environment Variables**:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_...
   CLERK_SECRET_KEY                  = sk_live_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL     = /sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL     = /sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = /dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = /dashboard
   NEXT_PUBLIC_API_URL               = https://ai-finance-operator-api.onrender.com
   ```
5. Click **Deploy**
6. Copy your Vercel URL: `https://your-app.vercel.app`

---

## Step 7 — Update CORS on Render

Go back to Render → your service → Environment → update:
```
ALLOWED_ORIGINS = ["https://your-app.vercel.app"]
```
Trigger a redeploy.

---

## Step 8 — Initialize Database

After Render deploys, run this once from your local machine:
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # fill in your real keys
python -m app.db.init_db
```

Or use the Supabase SQL from Step 2 (already done).

---

## Step 9 — Test It

```bash
# Health check
curl https://your-render-url.onrender.com/health

# Should return:
# {"status":"ok","service":"ai-finance-operator"}
```

Then go to your Vercel URL, sign up, and upload `backend/tests/sample_uae_statement.csv`.

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env   # add your keys
pip install -r requirements.txt
python -m app.db.init_db
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend
cp .env.example .env.local   # add your keys
npm install
npm run dev
```

Open http://localhost:3000

---

## Run Tests

```bash
cd backend
pytest tests/test_agents.py -v    # no API key needed
pytest tests/test_api.py -v       # mocked
pytest tests/ -v                  # all
```

---

## Groq Free Tier Limits

| Limit         | Value                  |
|---------------|------------------------|
| Requests/min  | 30                     |
| Tokens/min    | 6,000                  |
| Tokens/day    | 500,000                |
| Cost          | **$0.00**              |

The expense classifier batches 20 transactions per call to stay within limits.
For large statements (100+ transactions), the pipeline makes ~8-12 Groq calls.
