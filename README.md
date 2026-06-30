# AI Personal Finance Operator

An agentic AI app that reads your bank statements and gives you a full financial breakdown — categorized expenses, subscriptions, waste detection, budget plan, debt strategy, and savings coach.

**Free LLM:** Groq (Llama 3.3 70B) — completely free tier  
**Target regions:** UAE (AED) and India (INR)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind, ShadCN |
| Backend | FastAPI (Python) |
| LLM | Groq API (Llama 3.3 70B) — Free |
| Database | Supabase (PostgreSQL) |
| Auth | Clerk |
| File Storage | Supabase Storage |
| Deploy FE | Vercel |
| Deploy BE | Render |

---

## Quick Start

### 1. Get Free API Keys
- **Groq:** https://console.groq.com → free, no credit card
- **Supabase:** https://supabase.com → free tier
- **Clerk:** https://clerk.com → free tier
- **Vercel:** https://vercel.com → free
- **Render:** https://render.com → free tier

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your keys in .env
pip install -r requirements.txt
python -m app.db.init_db   # creates tables
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Fill in your keys in .env.local
npm install
npm run dev
```

### 4. Deploy
- Push to GitHub
- Connect Render to `backend/` → auto deploys
- Connect Vercel to `frontend/` → auto deploys

---

## Features
- Upload PDF, CSV, Excel bank statements
- Auto-categorize every transaction (AI-powered)
- Detect subscriptions (Netflix, Spotify, etc.)
- Find wasteful spending
- Generate 50/30/20 budget plan
- Debt payoff optimizer (Snowball / Avalanche)
- Savings coach with region-specific advice
- Dashboard with charts and scores
