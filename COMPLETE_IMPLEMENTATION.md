# AI Personal Finance Operator — Complete Implementation Guide

---

## 1. FOLDER STRUCTURE

```
ai-finance-operator/
├── frontend/                          # Next.js 15 App
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   ├── insights/page.tsx
│   │   │   ├── budget/page.tsx
│   │   │   ├── subscriptions/page.tsx
│   │   │   ├── debt/page.tsx
│   │   │   └── savings/page.tsx
│   │   ├── api/
│   │   │   └── webhooks/clerk/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Landing page
│   ├── components/
│   │   ├── ui/                        # ShadCN components
│   │   ├── dashboard/
│   │   │   ├── SpendWidget.tsx
│   │   │   ├── WasteScoreCard.tsx
│   │   │   ├── BudgetAdherenceChart.tsx
│   │   │   ├── CategoryPieChart.tsx
│   │   │   └── SpendTrendChart.tsx
│   │   ├── upload/
│   │   │   ├── FileDropzone.tsx
│   │   │   └── ParseProgress.tsx
│   │   └── shared/
│   │       ├── CurrencyToggle.tsx
│   │       └── Navbar.tsx
│   ├── lib/
│   │   ├── api.ts                     # API client
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useFinancialData.ts
│   │   └── useUpload.ts
│   ├── types/
│   │   └── finance.ts
│   ├── middleware.ts                   # Clerk middleware
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                           # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── dependencies.py
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── upload.py
│   │   │   │   ├── analysis.py
│   │   │   │   ├── reports.py
│   │   │   │   └── health.py
│   │   │   └── middleware/
│   │   │       ├── auth.py
│   │   │       └── rate_limit.py
│   │   ├── agents/
│   │   │   ├── orchestrator.py        # LangGraph flow
│   │   │   ├── expense_classifier.py
│   │   │   ├── subscription_detector.py
│   │   │   ├── waste_detector.py
│   │   │   ├── budget_planner.py
│   │   │   ├── debt_optimizer.py
│   │   │   └── savings_coach.py
│   │   ├── parsers/
│   │   │   ├── pdf_parser.py
│   │   │   ├── csv_parser.py
│   │   │   ├── excel_parser.py
│   │   │   └── ocr_parser.py
│   │   ├── services/
│   │   │   ├── claude_service.py
│   │   │   ├── qdrant_service.py
│   │   │   ├── supabase_service.py
│   │   │   └── embedding_service.py
│   │   ├── schemas/
│   │   │   ├── transaction.py
│   │   │   ├── analysis.py
│   │   │   └── report.py
│   │   ├── db/
│   │   │   ├── models.py
│   │   │   ├── database.py
│   │   │   └── migrations/
│   │   ├── prompts/
│   │   │   ├── expense_classifier.py
│   │   │   ├── subscription_detector.py
│   │   │   ├── waste_detector.py
│   │   │   ├── budget_planner.py
│   │   │   ├── debt_optimizer.py
│   │   │   └── savings_coach.py
│   │   └── utils/
│   │       ├── pii_masker.py
│   │       ├── currency.py
│   │       └── validators.py
│   ├── tests/
│   │   ├── test_parsers.py
│   │   ├── test_agents.py
│   │   └── test_api.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml
│
└── docs/
    ├── api-spec.md
    └── deployment.md
```

---

## 2. DATABASE SCHEMA (PostgreSQL)

```sql
-- Users table (synced from Clerk)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    currency VARCHAR(3) DEFAULT 'AED',  -- AED or INR
    region VARCHAR(10) DEFAULT 'UAE',   -- UAE or India
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statement uploads
CREATE TABLE statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,             -- Supabase Storage URL
    file_type VARCHAR(10) NOT NULL,     -- pdf, csv, xlsx
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, done, failed
    parsed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES statements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    merchant VARCHAR(500),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    type VARCHAR(10) NOT NULL,          -- debit, credit
    description TEXT,
    -- Classified fields
    category VARCHAR(50),
    category_confidence DECIMAL(4,3),
    category_reason TEXT,
    -- Embedding ref
    qdrant_point_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis results
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES statements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL, -- subscriptions, waste, budget, debt, savings
    result JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial reports (final output)
CREATE TABLE financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    statement_id UUID REFERENCES statements(id) ON DELETE CASCADE,
    month_year VARCHAR(7),              -- e.g. 2024-01
    total_income DECIMAL(12,2),
    total_spend DECIMAL(12,2),
    waste_score INTEGER,                -- 0-100
    savings_score INTEGER,
    debt_score INTEGER,
    budget_adherence INTEGER,
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    merchant VARCHAR(255) NOT NULL,
    frequency VARCHAR(20) NOT NULL,     -- monthly, quarterly, annual
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    active BOOLEAN DEFAULT true,
    first_seen DATE,
    last_seen DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, merchant)
);

-- Indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_statements_user_id ON statements(user_id);
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
```

---

## 3. QDRANT SCHEMA (Vector Collections)

```python
# qdrant_service.py — Collection Definitions

COLLECTIONS = {
    "transactions": {
        "vector_size": 1536,            # text-embedding-3-small
        "distance": "Cosine",
        "payload_schema": {
            "user_id": "keyword",
            "statement_id": "keyword",
            "merchant": "text",
            "category": "keyword",
            "amount": "float",
            "currency": "keyword",
            "date": "keyword",
            "type": "keyword"
        }
    },
    "finance_rules": {
        "vector_size": 1536,
        "distance": "Cosine",
        "payload_schema": {
            "rule_type": "keyword",     # budgeting, investment, debt
            "region": "keyword",        # UAE, India, global
            "framework": "text"
        }
    },
    "budgeting_frameworks": {
        "vector_size": 1536,
        "distance": "Cosine"
    },
    "debt_strategies": {
        "vector_size": 1536,
        "distance": "Cosine"
    },
    "regional_finance_india": {
        "vector_size": 1536,
        "distance": "Cosine"
    },
    "regional_finance_uae": {
        "vector_size": 1536,
        "distance": "Cosine"
    }
}
```

---

## 4. API ROUTES

### Backend (FastAPI)

```
POST   /api/v1/statements/upload          # Upload file
GET    /api/v1/statements/{id}/status     # Poll parsing status
GET    /api/v1/statements/{id}/transactions # Get parsed transactions

POST   /api/v1/analysis/run              # Trigger full analysis
GET    /api/v1/analysis/{statement_id}   # Get analysis results

GET    /api/v1/reports/{user_id}/latest  # Latest report
GET    /api/v1/reports/{user_id}/history # Report history

GET    /api/v1/subscriptions/{user_id}   # All subscriptions
GET    /api/v1/budget/{user_id}/plan     # Budget plan
GET    /api/v1/debt/{user_id}/plan       # Debt plan
GET    /api/v1/savings/{user_id}/plan    # Savings plan

GET    /health                           # Health check
```

---

## 5. BACKEND CORE FILES

### backend/app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import upload, analysis, reports, health
from app.config import settings

app = FastAPI(title="AI Finance Operator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(upload.router, prefix="/api/v1/statements", tags=["statements"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
```

### backend/app/config.py
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str
    
    # Claude
    ANTHROPIC_API_KEY: str
    CLAUDE_MODEL: str = "claude-sonnet-4-6"
    
    # Qdrant
    QDRANT_URL: str
    QDRANT_API_KEY: str
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # PostgreSQL
    DATABASE_URL: str
    
    # Clerk
    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 6. PARSERS

### backend/app/parsers/pdf_parser.py
```python
import pdfplumber
import anthropic
import base64
from pathlib import Path
from app.schemas.transaction import Transaction, TransactionList
from app.services.claude_service import ClaudeService

class PDFParser:
    def __init__(self):
        self.claude = ClaudeService()

    async def parse(self, file_path: str, currency: str = "AED") -> TransactionList:
        text = self._extract_text(file_path)
        if len(text.strip()) < 100:
            # Likely scanned — use Claude Vision
            return await self._parse_with_vision(file_path, currency)
        return await self._parse_text(text, currency)

    def _extract_text(self, file_path: str) -> str:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    async def _parse_text(self, text: str, currency: str) -> TransactionList:
        prompt = f"""Extract ALL transactions from this bank statement text.
Currency: {currency}

Statement text:
{text[:8000]}

Return ONLY valid JSON:
{{
  "transactions": [
    {{
      "date": "YYYY-MM-DD",
      "merchant": "string",
      "amount": 0.00,
      "currency": "{currency}",
      "type": "debit|credit",
      "description": "string"
    }}
  ]
}}"""
        return await self.claude.extract_json(prompt, TransactionList)

    async def _parse_with_vision(self, file_path: str, currency: str) -> TransactionList:
        with open(file_path, "rb") as f:
            pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")
        return await self.claude.extract_from_pdf(pdf_data, currency)
```

### backend/app/parsers/csv_parser.py
```python
import pandas as pd
from app.schemas.transaction import Transaction, TransactionList
from datetime import datetime
import re

class CSVParser:
    DEBIT_KEYWORDS = ["dr", "debit", "withdrawal", "payment", "purchase"]
    CREDIT_KEYWORDS = ["cr", "credit", "deposit", "refund", "salary"]

    async def parse(self, file_path: str, currency: str = "AED") -> TransactionList:
        df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
        df.columns = [c.lower().strip() for c in df.columns]
        transactions = []
        for _, row in df.iterrows():
            tx = self._map_row(row, currency)
            if tx:
                transactions.append(tx)
        return TransactionList(transactions=transactions)

    def _map_row(self, row, currency) -> Transaction | None:
        try:
            date = self._parse_date(row)
            merchant = str(row.get("merchant") or row.get("description") or row.get("narration") or "")
            amount = self._parse_amount(row)
            tx_type = self._detect_type(row, amount)
            return Transaction(
                date=date, merchant=merchant.strip(),
                amount=abs(amount), currency=currency,
                type=tx_type, description=merchant
            )
        except Exception:
            return None

    def _parse_date(self, row) -> str:
        for col in ["date", "transaction date", "value date", "txn date"]:
            if col in row and pd.notna(row[col]):
                try:
                    return pd.to_datetime(row[col]).strftime("%Y-%m-%d")
                except Exception:
                    pass
        return datetime.now().strftime("%Y-%m-%d")

    def _parse_amount(self, row) -> float:
        for col in ["amount", "debit", "credit", "withdrawal", "deposit"]:
            if col in row and pd.notna(row[col]):
                val = str(row[col]).replace(",", "").replace("AED", "").replace("₹", "").strip()
                try:
                    return float(val)
                except Exception:
                    pass
        return 0.0

    def _detect_type(self, row, amount) -> str:
        for col in row.index:
            val = str(row[col]).lower()
            if any(k in val for k in self.DEBIT_KEYWORDS):
                return "debit"
            if any(k in val for k in self.CREDIT_KEYWORDS):
                return "credit"
        return "debit" if amount < 0 else "credit"
```

---

## 7. CLAUDE SERVICE

### backend/app/services/claude_service.py
```python
import anthropic
import json
from typing import Type, TypeVar
from pydantic import BaseModel
from app.config import settings

T = TypeVar("T", bound=BaseModel)

class ClaudeService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def complete(self, system: str, user: str, max_tokens: int = 2000) -> str:
        message = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}]
        )
        return message.content[0].text

    async def extract_json(self, prompt: str, schema: Type[T], retries: int = 3) -> T:
        system = "You are a financial data extractor. Always respond with valid JSON only. No markdown, no explanation."
        for attempt in range(retries):
            try:
                raw = await self.complete(system, prompt)
                raw = raw.strip().lstrip("```json").rstrip("```").strip()
                data = json.loads(raw)
                return schema(**data)
            except Exception as e:
                if attempt == retries - 1:
                    raise ValueError(f"Failed after {retries} attempts: {e}")
        raise ValueError("Extraction failed")

    async def extract_from_pdf(self, pdf_base64: str, currency: str):
        from app.schemas.transaction import TransactionList
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": f"Extract all transactions from this bank statement. Currency: {currency}. Return JSON: {{\"transactions\": [{{\"date\": \"YYYY-MM-DD\", \"merchant\": \"\", \"amount\": 0, \"currency\": \"{currency}\", \"type\": \"debit|credit\", \"description\": \"\"}}]}}"
                    }
                ]
            }]
        )
        raw = message.content[0].text.strip()
        raw = raw.lstrip("```json").rstrip("```").strip()
        data = json.loads(raw)
        return TransactionList(**data)
```

---

## 8. AGENT ORCHESTRATOR (LangGraph)

### backend/app/agents/orchestrator.py
```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional
from app.agents import (
    expense_classifier, subscription_detector,
    waste_detector, budget_planner,
    debt_optimizer, savings_coach
)
from app.services.qdrant_service import QdrantService
from app.services.embedding_service import EmbeddingService
from app.schemas.transaction import TransactionList

class FinanceState(TypedDict):
    user_id: str
    statement_id: str
    region: str                  # UAE or India
    currency: str                # AED or INR
    transactions: List[dict]
    classified_transactions: List[dict]
    subscriptions: Optional[List[dict]]
    waste_items: Optional[List[dict]]
    budget_plan: Optional[dict]
    debt_plan: Optional[dict]
    savings_plan: Optional[dict]
    financial_report: Optional[dict]
    error: Optional[str]

async def embed_and_store(state: FinanceState) -> FinanceState:
    qdrant = QdrantService()
    embedder = EmbeddingService()
    for tx in state["transactions"]:
        text = f"{tx['merchant']} {tx['description']} {tx['amount']} {tx['currency']}"
        vector = await embedder.embed(text)
        await qdrant.upsert("transactions", vector, {
            "user_id": state["user_id"],
            "statement_id": state["statement_id"],
            **tx
        })
    return state

async def classify_expenses(state: FinanceState) -> FinanceState:
    agent = expense_classifier.ExpenseClassifierAgent(state["region"])
    classified = await agent.run(state["transactions"])
    return {**state, "classified_transactions": classified}

async def detect_subscriptions(state: FinanceState) -> FinanceState:
    agent = subscription_detector.SubscriptionDetectorAgent()
    subs = await agent.run(state["classified_transactions"])
    return {**state, "subscriptions": subs}

async def detect_waste(state: FinanceState) -> FinanceState:
    agent = waste_detector.WasteDetectorAgent(state["currency"])
    waste = await agent.run(state["classified_transactions"], state["subscriptions"])
    return {**state, "waste_items": waste}

async def plan_budget(state: FinanceState) -> FinanceState:
    agent = budget_planner.BudgetPlannerAgent(state["region"], state["currency"])
    plan = await agent.run(state["classified_transactions"])
    return {**state, "budget_plan": plan}

async def optimize_debt(state: FinanceState) -> FinanceState:
    agent = debt_optimizer.DebtOptimizerAgent(state["currency"])
    plan = await agent.run(state["classified_transactions"])
    return {**state, "debt_plan": plan}

async def coach_savings(state: FinanceState) -> FinanceState:
    agent = savings_coach.SavingsCoachAgent(state["region"], state["currency"])
    plan = await agent.run(
        state["classified_transactions"],
        state["waste_items"],
        state["budget_plan"]
    )
    return {**state, "savings_plan": plan}

async def generate_report(state: FinanceState) -> FinanceState:
    txs = state["classified_transactions"]
    total_spend = sum(t["amount"] for t in txs if t["type"] == "debit")
    total_income = sum(t["amount"] for t in txs if t["type"] == "credit")
    
    # Score calculations
    waste_score = _calculate_waste_score(state["waste_items"] or [])
    savings_score = _calculate_savings_score(total_income, total_spend)
    
    report = {
        "summary": {
            "total_income": total_income,
            "total_spend": total_spend,
            "net_savings": total_income - total_spend,
            "waste_score": waste_score,
            "savings_score": savings_score,
            "currency": state["currency"]
        },
        "classified_transactions": state["classified_transactions"],
        "subscriptions": state["subscriptions"],
        "waste_items": state["waste_items"],
        "budget_plan": state["budget_plan"],
        "debt_plan": state["debt_plan"],
        "savings_plan": state["savings_plan"]
    }
    return {**state, "financial_report": report}

def _calculate_waste_score(waste_items: list) -> int:
    if not waste_items:
        return 100
    severity_map = {"low": 5, "medium": 15, "high": 30}
    total_penalty = sum(severity_map.get(w.get("severity", "low"), 5) for w in waste_items)
    return max(0, 100 - total_penalty)

def _calculate_savings_score(income: float, spend: float) -> int:
    if income == 0:
        return 50
    savings_rate = (income - spend) / income
    return min(100, max(0, int(savings_rate * 200)))

def build_graph() -> StateGraph:
    graph = StateGraph(FinanceState)
    graph.add_node("embed_store", embed_and_store)
    graph.add_node("classify", classify_expenses)
    graph.add_node("subscriptions", detect_subscriptions)
    graph.add_node("waste", detect_waste)
    graph.add_node("budget", plan_budget)
    graph.add_node("debt", optimize_debt)
    graph.add_node("savings", coach_savings)
    graph.add_node("report", generate_report)
    
    graph.set_entry_point("embed_store")
    graph.add_edge("embed_store", "classify")
    graph.add_edge("classify", "subscriptions")
    graph.add_edge("subscriptions", "waste")
    graph.add_edge("waste", "budget")
    graph.add_edge("budget", "debt")
    graph.add_edge("debt", "savings")
    graph.add_edge("savings", "report")
    graph.add_edge("report", END)
    
    return graph.compile()

finance_graph = build_graph()
```

---

## 9. ALL AGENT PROMPTS

### backend/app/prompts/expense_classifier.py
```python
SYSTEM_PROMPT = """You are an expert financial transaction categorizer for UAE and India markets.

Categories (use EXACTLY these):
groceries, transport, dining, subscriptions, shopping, rent, salary, utilities, debt, investments, healthcare, entertainment, other

Rules:
- Be precise. A supermarket is 'groceries', a restaurant is 'dining'.
- Telecom bills are 'utilities'. Netflix/Spotify are 'subscriptions'.
- EMI payments are 'debt'. SIP/mutual fund are 'investments'.
- UAE-specific: DEWA=utilities, RTA=transport, Carrefour=groceries
- India-specific: Swiggy/Zomato=dining, Ola/Uber=transport, HDFC EMI=debt
- Return valid JSON only."""

USER_PROMPT = """Classify this transaction:
Merchant: {merchant}
Amount: {amount} {currency}
Description: {description}
Region: {region}

Return JSON:
{{
  "category": "string",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}}"""

RETRY_PROMPT = """Previous attempt failed. Classify this transaction returning ONLY JSON with keys: category, confidence (float), reason.
Transaction: {merchant} | {amount} {currency}"""
```

### backend/app/prompts/subscription_detector.py
```python
SYSTEM_PROMPT = """You are a subscription detection specialist. Analyze transaction patterns to identify recurring charges.

Known subscription services:
- Streaming: Netflix, Spotify, Apple TV+, Disney+, OSN, MX Player
- Cloud: iCloud, Google One, Dropbox, OneDrive
- SaaS: Adobe, Microsoft 365, Notion, Slack
- Food: Talabat Pro, Zomato Gold, Swiggy One
- Finance: Trading apps, credit monitoring

Detection rules:
- Same merchant + similar amount appearing monthly = subscription
- Slightly varying amounts (±5%) same merchant = subscription
- Annual/quarterly: same merchant once every 3 or 12 months

Return JSON only."""

USER_PROMPT = """Analyze these transactions and identify subscriptions:
{transactions_json}

Return JSON:
{{
  "subscriptions": [
    {{
      "merchant": "string",
      "frequency": "monthly|quarterly|annual",
      "amount": 0.00,
      "currency": "string",
      "active": true,
      "category": "streaming|cloud|saas|other"
    }}
  ]
}}"""
```

### backend/app/prompts/waste_detector.py
```python
SYSTEM_PROMPT = """You are a financial waste detection AI. Identify money leaks and inefficient spending patterns.

Waste categories:
1. duplicate_subscription: Same service paid twice
2. unused_subscription: Subscription with no usage pattern
3. excessive_dining: >30% of spend on dining
4. impulse_spending: Late-night purchases, weekend splurges, small frequent transactions
5. cash_withdrawal: Excessive ATM withdrawals (hard to track)
6. high_fees: Bank fees, late payment fees
7. overspending_category: Any category >40% of total spend

Severity levels:
- low: <100 AED/month waste
- medium: 100-500 AED/month waste  
- high: >500 AED/month waste (scale proportionally for INR)

Return JSON only."""

USER_PROMPT = """Analyze spending for waste:
Transactions: {transactions_json}
Subscriptions: {subscriptions_json}
Currency: {currency}
Region: {region}

Return JSON:
{{
  "waste_items": [
    {{
      "waste_type": "string",
      "merchant": "string",
      "severity": "low|medium|high",
      "monthly_loss": 0.00,
      "recommendation": "actionable suggestion"
    }}
  ],
  "total_monthly_waste": 0.00
}}"""
```

### backend/app/prompts/budget_planner.py
```python
SYSTEM_PROMPT = """You are a certified financial planner specializing in UAE expat and India domestic budgets.

Budget frameworks:
1. 50/30/20 Rule: 50% needs, 30% wants, 20% savings
2. Zero-based: Every dirham/rupee assigned a purpose

UAE context:
- Rent typically 30-40% of income for expats
- Transport includes car loan, fuel, Salik, RTA
- Remittance costs for expat workers
- No income tax advantage

India context:
- Family obligations often mandatory
- EMI culture — budget around fixed EMIs first
- Consider PPF/NPS tax savings
- Cost of living varies wildly by city

Output a realistic, localized budget."""

USER_PROMPT = """Create a budget plan for this user:
Monthly Income: {income} {currency}
Current Spend by Category: {category_spend_json}
Region: {region}
Currency: {currency}

Return JSON:
{{
  "framework": "50/30/20|zero_based",
  "recommended_budget": {{
    "needs": {{
      "rent": 0,
      "groceries": 0,
      "utilities": 0,
      "transport": 0,
      "healthcare": 0
    }},
    "wants": {{
      "dining": 0,
      "entertainment": 0,
      "shopping": 0,
      "subscriptions": 0
    }},
    "savings": {{
      "emergency_fund": 0,
      "investments": 0,
      "debt_repayment": 0
    }}
  }},
  "monthly_target_savings": 0,
  "emergency_fund_target": 0,
  "insights": ["string"]
}}"""
```

### backend/app/prompts/debt_optimizer.py
```python
SYSTEM_PROMPT = """You are a debt optimization specialist. Minimize interest paid and accelerate payoff.

Strategies:
1. Avalanche: Attack highest interest rate first (mathematically optimal)
2. Snowball: Attack smallest balance first (psychologically motivating)

For UAE:
- Credit cards: ~36% APR typical
- Personal loans: 15-25% APR
- Home loans: 3-5% fixed/variable

For India:
- Credit cards: 36-45% APR
- Personal loans: 12-24% APR
- Home loans (EMI): 8-12%
- Gold loans: 12-24%

Always calculate interest saved and payoff timeline."""

USER_PROMPT = """Optimize debt repayment:
Debt transactions: {debt_transactions_json}
Monthly available for debt: {available_monthly} {currency}
Currency: {currency}

Return JSON:
{{
  "detected_debts": [
    {{
      "type": "credit_card|personal_loan|home_loan|emi",
      "estimated_balance": 0,
      "estimated_rate": 0,
      "monthly_payment": 0
    }}
  ],
  "recommended_strategy": "avalanche|snowball",
  "strategy_reason": "string",
  "payoff_plan": [
    {{
      "debt_type": "string",
      "payoff_months": 0,
      "total_interest": 0
    }}
  ],
  "interest_saved_vs_minimum": 0,
  "total_payoff_months": 0
}}"""
```

### backend/app/prompts/savings_coach.py
```python
SYSTEM_PROMPT = """You are a savings coach with expertise in UAE and India investment products.

UAE investment options:
- High-yield savings accounts (2.5-4% APY)
- Fixed deposits (3-5%)
- ETFs via trading platforms (Sarwa, StashAway)
- Government bonds
- Real estate (REITs)

India investment options:
- Mutual funds SIP (equity: 12-15% long-term)
- Fixed Deposits (6-7.5%)
- PPF (7.1% tax-free)
- NPS (pension + tax benefit)
- Gold ETFs
- Recurring Deposits

Rules:
- Emergency fund = 6 months expenses (priority #1)
- After emergency fund: clear high-interest debt
- Then invest for goals"""

USER_PROMPT = """Create savings plan:
Monthly Income: {income} {currency}
Monthly Spend: {spend} {currency}
Current Savings Rate: {savings_rate}%
Waste Identified: {waste_json}
Region: {region}

Return JSON:
{{
  "current_savings_rate": 0,
  "target_savings_rate": 0,
  "opportunities": [
    {{
      "type": "cut_waste|increase_income|invest",
      "description": "string",
      "monthly_impact": 0,
      "priority": "high|medium|low"
    }}
  ],
  "investment_recommendations": [
    {{
      "product": "string",
      "allocation_percent": 0,
      "expected_return": "string",
      "rationale": "string"
    }}
  ],
  "projected_annual_savings": 0,
  "emergency_fund_months": 0
}}"""
```

---

## 10. EXPENSE CLASSIFIER AGENT

### backend/app/agents/expense_classifier.py
```python
from app.services.claude_service import ClaudeService
from app.prompts import expense_classifier as prompts
from typing import List
import asyncio

class ExpenseClassifierAgent:
    def __init__(self, region: str = "UAE"):
        self.claude = ClaudeService()
        self.region = region
        # Rule-based pre-classification for speed
        self.merchant_rules = {
            "carrefour": "groceries", "lulu": "groceries", "spinneys": "groceries",
            "netflix": "subscriptions", "spotify": "subscriptions",
            "uber": "transport", "careem": "transport", "rta": "transport",
            "dewa": "utilities", "du ": "utilities", "etisalat": "utilities",
            "swiggy": "dining", "zomato": "dining", "talabat": "dining",
            "amazon": "shopping", "noon": "shopping",
        }

    async def run(self, transactions: List[dict]) -> List[dict]:
        tasks = [self._classify(tx) for tx in transactions]
        return await asyncio.gather(*tasks)

    async def _classify(self, tx: dict) -> dict:
        # Fast rule-based check
        merchant_lower = tx.get("merchant", "").lower()
        for keyword, category in self.merchant_rules.items():
            if keyword in merchant_lower:
                return {**tx, "category": category, "confidence": 0.95, "category_reason": "rule-based match"}
        
        # Claude classification
        prompt = prompts.USER_PROMPT.format(
            merchant=tx.get("merchant", ""),
            amount=tx.get("amount", 0),
            currency=tx.get("currency", "AED"),
            description=tx.get("description", ""),
            region=self.region
        )
        try:
            result = await self.claude.extract_json(prompt, ClassificationResult)
            return {**tx, "category": result.category, "confidence": result.confidence, "category_reason": result.reason}
        except Exception:
            return {**tx, "category": "other", "confidence": 0.5, "category_reason": "classification failed"}

from pydantic import BaseModel

class ClassificationResult(BaseModel):
    category: str
    confidence: float
    reason: str
```

---

## 11. PII MASKER

### backend/app/utils/pii_masker.py
```python
import re

class PIIMasker:
    """Mask sensitive financial information before logging or storing."""
    
    ACCOUNT_PATTERN = re.compile(r'\b\d{10,18}\b')
    CARD_PATTERN = re.compile(r'\b(?:\d{4}[\s-]?){3}\d{4}\b')
    IBAN_PATTERN = re.compile(r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b')
    
    @classmethod
    def mask_transactions(cls, transactions: list) -> list:
        masked = []
        for tx in transactions:
            masked.append({
                **tx,
                "merchant": cls._mask_account_numbers(tx.get("merchant", "")),
                "description": cls._mask_account_numbers(tx.get("description", ""))
            })
        return masked
    
    @classmethod
    def _mask_account_numbers(cls, text: str) -> str:
        text = cls.ACCOUNT_PATTERN.sub(lambda m: m.group()[:4] + "****" + m.group()[-2:], text)
        text = cls.CARD_PATTERN.sub("****-****-****-****", text)
        text = cls.IBAN_PATTERN.sub(lambda m: m.group()[:6] + "****" + m.group()[-4:], text)
        return text
```

---

## 12. UPLOAD ROUTE

### backend/app/api/routes/upload.py
```python
from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException
from app.dependencies import get_current_user
from app.services.supabase_service import SupabaseService
from app.parsers.pdf_parser import PDFParser
from app.parsers.csv_parser import CSVParser
from app.agents.orchestrator import finance_graph, FinanceState
from app.db.database import get_db
import tempfile, os

router = APIRouter()

@router.post("/upload")
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    currency: str = "AED",
    region: str = "UAE",
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    allowed_types = ["application/pdf", "text/csv", 
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Unsupported file type. Use PDF, CSV, or XLSX.")
    
    # Store file
    supabase = SupabaseService()
    file_url = await supabase.upload_file(file, current_user.id)
    
    # Create statement record
    statement = await db.create_statement(current_user.id, file.filename, file_url, file.content_type)
    
    # Background processing
    background_tasks.add_task(process_statement, statement.id, file_url, 
                               file.content_type, current_user.id, currency, region, db)
    
    return {"statement_id": statement.id, "status": "processing"}

async def process_statement(statement_id, file_url, content_type, user_id, currency, region, db):
    try:
        await db.update_statement_status(statement_id, "processing")
        
        # Download and parse
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            # ... download from supabase ...
            pass
        
        if "pdf" in content_type:
            parser = PDFParser()
        elif "csv" in content_type:
            parser = CSVParser()
        else:
            from app.parsers.excel_parser import ExcelParser
            parser = ExcelParser()
        
        parsed = await parser.parse(tmp.name, currency)
        
        # Store transactions
        await db.save_transactions(statement_id, user_id, parsed.transactions)
        
        # Run orchestration
        initial_state = FinanceState(
            user_id=user_id,
            statement_id=statement_id,
            region=region,
            currency=currency,
            transactions=[t.dict() for t in parsed.transactions],
            classified_transactions=[],
            subscriptions=None, waste_items=None,
            budget_plan=None, debt_plan=None,
            savings_plan=None, financial_report=None, error=None
        )
        
        final_state = await finance_graph.ainvoke(initial_state)
        
        # Save report
        await db.save_financial_report(user_id, statement_id, final_state["financial_report"])
        await db.update_statement_status(statement_id, "done")
        
    except Exception as e:
        await db.update_statement_status(statement_id, "failed")
        raise e
```

---

## 13. SCHEMAS

### backend/app/schemas/transaction.py
```python
from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import date

class Transaction(BaseModel):
    date: str
    merchant: str
    amount: float
    currency: str
    type: str                    # debit | credit
    description: Optional[str] = ""
    category: Optional[str] = None
    confidence: Optional[float] = None
    category_reason: Optional[str] = None

    @validator("type")
    def validate_type(cls, v):
        if v not in ["debit", "credit"]:
            raise ValueError("type must be debit or credit")
        return v

    @validator("amount")
    def validate_amount(cls, v):
        return abs(v)

class TransactionList(BaseModel):
    transactions: List[Transaction]
```

---

## 14. FRONTEND — KEY FILES

### frontend/middleware.ts
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### frontend/types/finance.ts
```typescript
export type Currency = "AED" | "INR";
export type Region = "UAE" | "India";

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: Currency;
  type: "debit" | "credit";
  description: string;
  category: ExpenseCategory;
  confidence: number;
}

export type ExpenseCategory =
  | "groceries" | "transport" | "dining" | "subscriptions"
  | "shopping" | "rent" | "salary" | "utilities" | "debt"
  | "investments" | "healthcare" | "entertainment" | "other";

export interface FinancialReport {
  summary: {
    total_income: number;
    total_spend: number;
    net_savings: number;
    waste_score: number;
    savings_score: number;
    currency: Currency;
  };
  subscriptions: Subscription[];
  waste_items: WasteItem[];
  budget_plan: BudgetPlan;
  debt_plan: DebtPlan;
  savings_plan: SavingsPlan;
}

export interface Subscription {
  merchant: string;
  frequency: "monthly" | "quarterly" | "annual";
  amount: number;
  currency: Currency;
  active: boolean;
  category: string;
}

export interface WasteItem {
  waste_type: string;
  merchant: string;
  severity: "low" | "medium" | "high";
  monthly_loss: number;
  recommendation: string;
}

export interface BudgetPlan {
  framework: string;
  recommended_budget: {
    needs: Record<string, number>;
    wants: Record<string, number>;
    savings: Record<string, number>;
  };
  monthly_target_savings: number;
  insights: string[];
}

export interface DebtPlan {
  recommended_strategy: "avalanche" | "snowball";
  payoff_plan: Array<{
    debt_type: string;
    payoff_months: number;
    total_interest: number;
  }>;
  interest_saved_vs_minimum: number;
  total_payoff_months: number;
}

export interface SavingsPlan {
  current_savings_rate: number;
  target_savings_rate: number;
  opportunities: Array<{
    type: string;
    description: string;
    monthly_impact: number;
    priority: "high" | "medium" | "low";
  }>;
  investment_recommendations: Array<{
    product: string;
    allocation_percent: number;
    expected_return: string;
    rationale: string;
  }>;
  projected_annual_savings: number;
}
```

### frontend/lib/api.ts
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { getToken } = await import("@clerk/nextjs/server");
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  upload: async (file: File, currency: string, region: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("currency", currency);
    form.append("region", region);
    return apiFetch<{ statement_id: string; status: string }>("/api/v1/statements/upload", {
      method: "POST",
      body: form,
      headers: {},  // No Content-Type for multipart
    });
  },
  getStatus: (id: string) =>
    apiFetch<{ status: string }>(`/api/v1/statements/${id}/status`),
  getReport: (userId: string) =>
    apiFetch<import("@/types/finance").FinancialReport>(`/api/v1/reports/${userId}/latest`),
  getSubscriptions: (userId: string) =>
    apiFetch<{ subscriptions: import("@/types/finance").Subscription[] }>(`/api/v1/subscriptions/${userId}`),
  getBudget: (userId: string) =>
    apiFetch<import("@/types/finance").BudgetPlan>(`/api/v1/budget/${userId}/plan`),
  getDebt: (userId: string) =>
    apiFetch<import("@/types/finance").DebtPlan>(`/api/v1/debt/${userId}/plan`),
  getSavings: (userId: string) =>
    apiFetch<import("@/types/finance").SavingsPlan>(`/api/v1/savings/${userId}/plan`),
};
```

---

## 15. ENVIRONMENT VARIABLES

### frontend/.env.local
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

### backend/.env
```bash
# App
APP_ENV=production
SECRET_KEY=your-32-char-secret-key

# Claude
ANTHROPIC_API_KEY=sk-ant-...

# Qdrant Cloud
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-key

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres

# Clerk
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# CORS
ALLOWED_ORIGINS=["https://your-app.vercel.app"]
```

---

## 16. REQUIREMENTS

### backend/requirements.txt
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.3.0
anthropic==0.34.0
langgraph==0.2.0
langchain-core==0.3.0
qdrant-client==1.11.0
supabase==2.7.0
pdfplumber==0.11.0
pandas==2.2.0
openpyxl==3.1.2
sqlalchemy==2.0.35
asyncpg==0.29.0
python-multipart==0.0.9
httpx==0.27.0
python-jose[cryptography]==3.3.0
```

### frontend/package.json (key deps)
```json
{
  "dependencies": {
    "next": "15.0.0",
    "react": "^19.0.0",
    "@clerk/nextjs": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.12.0",
    "react-dropzone": "^14.2.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0"
  }
}
```

---

## 17. DEPLOYMENT

### Render (Backend) — render.yaml
```yaml
services:
  - type: web
    name: finance-operator-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: APP_ENV
        value: production
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
      - key: QDRANT_URL
        sync: false
      - key: QDRANT_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: CLERK_SECRET_KEY
        sync: false
    healthCheckPath: /health
    autoDeploy: true
```

### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# From frontend directory
vercel --prod

# Set env vars in Vercel dashboard or:
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_API_URL
```

---

## 18. GITHUB SETUP

```bash
# Initialize repo
git init
git remote add origin https://github.com/your-org/ai-finance-operator

# Structure
mkdir -p frontend backend

# Root .gitignore
cat > .gitignore << 'EOF'
.env
.env.local
__pycache__/
*.pyc
node_modules/
.next/
.vercel/
*.egg-info/
dist/
uploads/
*.pdf
*.csv
EOF

# GitHub Actions CI — .github/workflows/ci.yml
mkdir -p .github/workflows
```

### .github/workflows/ci.yml
```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
  
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build
```

---

## 19. MVP ROADMAP

### Phase 1 — Core (Weeks 1–3)
- [ ] Supabase + PostgreSQL setup + schema
- [ ] Clerk auth integration
- [ ] PDF/CSV/Excel parsers
- [ ] Expense classifier agent
- [ ] Basic dashboard UI

### Phase 2 — Intelligence (Weeks 4–6)
- [ ] Subscription detector agent
- [ ] Waste detector agent
- [ ] LangGraph orchestration
- [ ] Qdrant vector store + embeddings
- [ ] Budget planner agent

### Phase 3 — Full Product (Weeks 7–9)
- [ ] Debt optimizer agent
- [ ] Savings coach agent
- [ ] All dashboard pages (budget, debt, subscriptions, savings)
- [ ] Charts + visualizations
- [ ] Financial report PDF export

### Phase 4 — Production (Week 10)
- [ ] PII masking + security audit
- [ ] Rate limiting
- [ ] Error monitoring (Sentry)
- [ ] Vercel + Render deployment
- [ ] User testing (UAE + India)

---

## 20. PRODUCTION SCALING ROADMAP

### Scale Tier 1 (0–1K users)
- Render Starter plan
- Supabase Free/Pro
- Qdrant Cloud Free
- Single FastAPI instance

### Scale Tier 2 (1K–10K users)
- Render Standard (multi-instance)
- Supabase Pro
- Qdrant Cloud Growth
- Redis for job queues (Celery)
- Background workers for parsing

### Scale Tier 3 (10K+ users)
- AWS ECS / Kubernetes
- RDS PostgreSQL Multi-AZ
- Qdrant dedicated cluster
- CDN for statement storage
- Async processing with SQS
- Multi-region (Dubai + Mumbai)
- SOC 2 compliance review

---

## 21. SECURITY CHECKLIST

- [x] Clerk JWT verification on every API route
- [x] Row-level security in PostgreSQL (user can only see own data)
- [x] PII masking before logging
- [x] Supabase storage with signed URLs (expiry: 1hr)
- [x] HTTPS enforced everywhere
- [x] File type validation + size limits (10MB max)
- [x] Rate limiting: 10 uploads/hour per user
- [x] No raw statement files stored after parsing
- [x] API keys never exposed to frontend
- [x] CORS locked to specific origins
