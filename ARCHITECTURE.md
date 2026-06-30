# AI Personal Finance Operator — Full Architecture

## System Overview

```
User → Upload Statement → Parse Engine → Embed → Qdrant
                                                     ↓
                                            Orchestrator (LangGraph)
                                                     ↓
                    ┌────────────────────────────────────────────────┐
                    │  Expense Classifier → Subscription Detector    │
                    │  → Waste Detector → Budget Planner             │
                    │  → Debt Optimizer → Savings Coach              │
                    └────────────────────────────────────────────────┘
                                                     ↓
                                         Financial Report → Dashboard
```

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 15, TypeScript, Tailwind, ShadCN |
| Backend     | FastAPI (Python 3.11+)              |
| AI          | Claude API (claude-sonnet-4-6)      |
| Orchestration | LangGraph                        |
| Vector DB   | Qdrant                              |
| Relational  | PostgreSQL (via Supabase)           |
| Auth        | Clerk                               |
| Storage     | Supabase Storage                    |
| Deploy FE   | Vercel                              |
| Deploy BE   | Render                              |
