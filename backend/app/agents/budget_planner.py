from typing import List
from collections import defaultdict
from app.services.groq_service import GroqService

SYSTEM = """You are a certified financial planner for UAE expats and India residents.
Generate a realistic localized budget plan.
Return ONLY valid JSON — no explanation:
{
  "framework": "50/30/20",
  "recommended_budget": {
    "needs": {"rent":0,"groceries":0,"utilities":0,"transport":0,"healthcare":0,"debt":0},
    "wants": {"dining":0,"entertainment":0,"shopping":0,"subscriptions":0},
    "savings": {"emergency_fund":0,"investments":0}
  },
  "monthly_target_savings": 0,
  "emergency_fund_target": 0,
  "insights": ["string","string","string"]
}"""

class BudgetPlannerAgent:
    def __init__(self, region: str = "UAE", currency: str = "AED"):
        self.groq = GroqService()
        self.region = region
        self.currency = currency

    def run(self, transactions: List[dict]) -> dict:
        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]

        total_income = sum(t["amount"] for t in credits)
        total_spend  = sum(t["amount"] for t in debits)

        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category", "other")] += t["amount"]

        cat_summary = {k: round(v, 2) for k, v in cat_spend.items()}

        user_msg = (
            f"Region: {self.region} | Currency: {self.currency}\n"
            f"Monthly Income: {round(total_income, 2)} {self.currency}\n"
            f"Monthly Total Spend: {round(total_spend, 2)} {self.currency}\n"
            f"Spend by category: {cat_summary}\n\n"
            "Generate a 50/30/20 budget plan. All amounts in the given currency."
        )

        try:
            return self.groq.extract_json(SYSTEM, user_msg)
        except Exception:
            # Fallback: pure math 50/30/20
            return self._fallback_budget(total_income, cat_spend)

    def _fallback_budget(self, income: float, cat_spend: dict) -> dict:
        needs   = round(income * 0.50, 2)
        wants   = round(income * 0.30, 2)
        savings = round(income * 0.20, 2)
        return {
            "framework": "50/30/20",
            "recommended_budget": {
                "needs":   {"rent": round(needs*0.5,2), "groceries": round(needs*0.2,2),
                            "utilities": round(needs*0.1,2), "transport": round(needs*0.15,2),
                            "healthcare": round(needs*0.05,2), "debt": 0},
                "wants":   {"dining": round(wants*0.4,2), "entertainment": round(wants*0.2,2),
                            "shopping": round(wants*0.3,2), "subscriptions": round(wants*0.1,2)},
                "savings": {"emergency_fund": round(savings*0.5,2), "investments": round(savings*0.5,2)},
            },
            "monthly_target_savings": savings,
            "emergency_fund_target":  round(income * 6, 2),
            "insights": [
                f"Target saving {self.currency} {savings}/month.",
                "Build 6-month emergency fund first.",
                "Then invest regularly.",
            ],
        }
