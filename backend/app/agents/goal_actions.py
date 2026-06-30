"""
Goal-Driven Action Engine — concrete daily/weekly actions from goals + report data.
Separate from goal_planner. This generates ACTIONABLE tasks, not plans.
"""
from typing import List
from app.services.groq_service import GroqService

SYSTEM = """You are a financial action coach. Generate specific, measurable, time-bound actions.
Each action must be completable within the stated timeframe.
Return ONLY valid JSON:
{
  "actions": [
    {
      "id": "string",
      "timeframe": "today|this_week|this_month",
      "category": "spending|saving|debt|subscription|investment",
      "icon": "emoji",
      "title": "Short action title",
      "description": "Exact specific instruction with numbers",
      "impact": "string",
      "impact_amount": 0,
      "difficulty": "easy|medium|hard",
      "currency": "AED"
    }
  ],
  "weekly_challenge": {
    "title": "string",
    "description": "string",
    "reward": "string"
  }
}"""


class GoalActionsAgent:
    def __init__(self, region: str = "UAE", currency: str = "AED"):
        self.groq     = GroqService()
        self.region   = region
        self.currency = currency

    def run(self, transactions: List[dict], waste_items: List[dict],
            goals: dict, subscriptions: List[dict]) -> dict:

        from collections import defaultdict
        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits)
        spend   = sum(t["amount"] for t in debits)
        free    = max(0, income - spend)

        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category","other")] += t["amount"]

        top_waste  = sorted(waste_items, key=lambda w: w.get("monthly_loss",0), reverse=True)[:3]
        goal_list  = goals.get("goals", [])[:3] if goals else []
        to_cancel  = [s for s in subscriptions if isinstance(s, dict) and s.get("recommendation") == "cancel"]

        user_msg = f"""Region: {self.region} | Currency: {self.currency}
Monthly income: {round(income,0)} | Monthly spend: {round(spend,0)} | Free cash: {round(free,0)}

Top spending categories: {dict(list(cat_spend.items())[:5])}

Top waste items:
{chr(10).join(f"- {w.get('waste_type')}: {self.currency} {w.get('monthly_loss',0):.0f}/mo — {w.get('recommendation','')}" for w in top_waste)}

Active goals:
{chr(10).join(f"- {g.get('name')}: {g.get('progress_percent',0)}% complete" for g in goal_list)}

Subscriptions to cancel: {len(to_cancel)} ({', '.join(s.get('merchant','') for s in to_cancel[:3])})

Generate 6-8 specific actions (mix of today/this_week/this_month).
Include one weekly spending challenge.
All amounts in {self.currency}."""

        try:
            data = self.groq.extract_json(SYSTEM, user_msg, retries=3)
            return data
        except Exception:
            return self._fallback_actions(free, top_waste, to_cancel)

    def _fallback_actions(self, free: float, waste: list, to_cancel: list) -> dict:
        c = self.currency
        actions = [
            {
                "id": "skip_delivery",
                "timeframe": "this_week",
                "category": "spending",
                "icon": "🍕",
                "title": "Skip 3 food deliveries",
                "description": f"Cook at home instead of ordering. Save {c} {round(free*0.05,0)} this week.",
                "impact": f"Save {c} {round(free*0.05,0)} this week",
                "impact_amount": round(free * 0.05, 2),
                "difficulty": "easy",
                "currency": c,
            },
            {
                "id": "transfer_savings",
                "timeframe": "today",
                "category": "saving",
                "icon": "💰",
                "title": "Transfer to savings now",
                "description": f"Move {c} {round(free*0.2,0)} to your savings account right now. Don't wait.",
                "impact": f"Lock in {c} {round(free*0.2,0)} savings",
                "impact_amount": round(free * 0.2, 2),
                "difficulty": "easy",
                "currency": c,
            },
        ]
        if to_cancel:
            actions.append({
                "id": "cancel_sub",
                "timeframe": "today",
                "category": "subscription",
                "icon": "🚫",
                "title": f"Cancel {to_cancel[0].get('merchant','unused subscription')}",
                "description": f"Open the app and cancel {to_cancel[0].get('merchant','')} today. You haven't used it recently.",
                "impact": f"Save {c} {to_cancel[0].get('monthly_cost',0)}/month",
                "impact_amount": to_cancel[0].get("monthly_cost", 0),
                "difficulty": "easy",
                "currency": c,
            })
        return {
            "actions": actions,
            "weekly_challenge": {
                "title": "No-delivery week",
                "description": "Cook every meal this week. No food delivery apps.",
                "reward": f"Save {c} {round(free*0.08,0)} and build a healthy habit",
            }
        }
