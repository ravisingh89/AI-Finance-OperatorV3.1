"""
Goal Planner Agent — Daily, Weekly, Monthly, Yearly breakdown.
Uses Groq for personalised goal setting.
"""
from typing import List
from app.services.groq_service import GroqService

SYSTEM = """You are a personal financial goal coach for UAE and India.
Create SMART financial goals broken into daily, weekly, monthly, yearly targets.
Be specific, use exact numbers from user's data.
Return ONLY valid JSON, no explanation:
{
  "goals": [
    {
      "id": "string",
      "name": "string",
      "category": "savings|debt|investment|spending|emergency",
      "target_amount": 0,
      "currency": "AED",
      "why": "one sentence motivation",
      "timeframe_months": 0,
      "milestones": {
        "daily": {"action": "string", "amount": 0},
        "weekly": {"action": "string", "amount": 0},
        "monthly": {"action": "string", "amount": 0},
        "yearly": {"action": "string", "amount": 0}
      },
      "priority": "high|medium|low",
      "progress_percent": 0
    }
  ],
  "monthly_free_cash": 0,
  "recommended_allocation": {
    "emergency_fund": 0,
    "debt_payoff": 0,
    "investments": 0,
    "goal_savings": 0
  }
}"""


class GoalPlannerAgent:
    def __init__(self, region: str = "UAE", currency: str = "AED"):
        self.groq     = GroqService()
        self.region   = region
        self.currency = currency

    def run(self, transactions: List[dict], existing_goals: List[dict] = None) -> dict:
        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits)
        spend   = sum(t["amount"] for t in debits)
        free    = max(0, income - spend)

        from collections import defaultdict
        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category", "other")] += t["amount"]

        has_debt      = cat_spend.get("debt", 0) > 0
        has_invest    = cat_spend.get("investments", 0) > 0
        savings_rate  = round((income - spend) / income * 100, 1) if income > 0 else 0

        user_msg = f"""Region: {self.region} | Currency: {self.currency}
Monthly income: {round(income, 0)} {self.currency}
Monthly spend:  {round(spend, 0)} {self.currency}
Free cash:      {round(free, 0)} {self.currency}
Savings rate:   {savings_rate}%
Has debt:       {has_debt}
Has investments: {has_invest}
Top spend: {dict(list(cat_spend.items())[:5])}
Existing goals: {existing_goals or 'None — create fresh goals'}

Create 4-5 specific financial goals with daily/weekly/monthly/yearly breakdowns.
Focus on their biggest pain points from the data above.
All amounts in {self.currency}."""

        try:
            data = self.groq.extract_json(SYSTEM, user_msg, retries=3)
            # Inject monthly_free_cash if missing
            if "monthly_free_cash" not in data:
                data["monthly_free_cash"] = round(free, 2)
            return data
        except Exception as e:
            return self._fallback_goals(income, spend, free)

    def _fallback_goals(self, income: float, spend: float, free: float) -> dict:
        c = self.currency
        monthly_save = round(income * 0.20, 0)
        emergency    = round(income * 6, 0)
        return {
            "goals": [
                {
                    "id":              "emergency",
                    "name":            "Build emergency fund",
                    "category":        "emergency",
                    "target_amount":   emergency,
                    "currency":        c,
                    "why":             "6 months of expenses as safety net",
                    "timeframe_months": 12,
                    "milestones": {
                        "daily":   {"action": f"Skip one impulse buy", "amount": round(emergency/365, 0)},
                        "weekly":  {"action": f"Transfer to savings", "amount": round(emergency/52, 0)},
                        "monthly": {"action": f"Auto-transfer on salary day", "amount": round(emergency/12, 0)},
                        "yearly":  {"action": f"Emergency fund complete", "amount": emergency},
                    },
                    "priority":          "high",
                    "progress_percent":  0,
                },
                {
                    "id":              "savings_rate",
                    "name":            "Reach 20% savings rate",
                    "category":        "savings",
                    "target_amount":   round(monthly_save, 0),
                    "currency":        c,
                    "why":             "20% savings rate is the foundation of wealth",
                    "timeframe_months": 3,
                    "milestones": {
                        "daily":   {"action": "Track every purchase", "amount": round(monthly_save/30, 0)},
                        "weekly":  {"action": "Review spending vs budget", "amount": round(monthly_save/4, 0)},
                        "monthly": {"action": f"Save {c} {monthly_save}", "amount": monthly_save},
                        "yearly":  {"action": f"Save {c} {round(monthly_save*12, 0)}", "amount": round(monthly_save*12, 0)},
                    },
                    "priority":          "high",
                    "progress_percent":  max(0, min(100, int((income-spend)/income*5))),
                },
            ],
            "monthly_free_cash": round(free, 2),
            "recommended_allocation": {
                "emergency_fund": round(free * 0.5, 2),
                "debt_payoff":    round(free * 0.2, 2),
                "investments":    round(free * 0.2, 2),
                "goal_savings":   round(free * 0.1, 2),
            }
        }
