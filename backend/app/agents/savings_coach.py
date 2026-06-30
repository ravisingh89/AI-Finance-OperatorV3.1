from typing import List
from app.services.groq_service import GroqService

SYSTEM = """You are a savings coach for UAE and India. Give practical, localized savings advice.
Return ONLY valid JSON:
{
  "current_savings_rate": 0,
  "target_savings_rate": 20,
  "opportunities": [
    {"type":"cut_waste","description":"string","monthly_impact":0,"priority":"high|medium|low"}
  ],
  "investment_recommendations": [
    {"product":"string","allocation_percent":0,"expected_return":"string","rationale":"string"}
  ],
  "projected_annual_savings": 0,
  "emergency_fund_months": 0
}"""

UAE_INVESTMENTS = "High-yield savings (3-4%), Fixed deposits (4-5%), ETFs via Sarwa/StashAway, Government sukuk bonds"
IND_INVESTMENTS = "SIP in index funds (12-15% long-term), PPF (7.1% tax-free), FD (6.5-7.5%), NPS for retirement"

class SavingsCoachAgent:
    def __init__(self, region: str = "UAE", currency: str = "AED"):
        self.groq = GroqService()
        self.region = region
        self.currency = currency

    def run(self, transactions: List[dict], waste_items: List[dict], budget_plan: dict) -> dict:
        credits = [t for t in transactions if t.get("type") == "credit"]
        debits  = [t for t in transactions if t.get("type") == "debit"]

        income  = sum(t["amount"] for t in credits)
        spend   = sum(t["amount"] for t in debits)
        savings = max(0, income - spend)
        savings_rate = round((savings / income * 100) if income > 0 else 0, 1)

        total_waste = sum(w.get("monthly_loss", 0) for w in waste_items)
        investments = UAE_INVESTMENTS if self.region == "UAE" else IND_INVESTMENTS

        user_msg = (
            f"Region: {self.region} | Currency: {self.currency}\n"
            f"Monthly Income: {round(income,2)}\n"
            f"Monthly Spend: {round(spend,2)}\n"
            f"Current Savings: {round(savings,2)} ({savings_rate}%)\n"
            f"Monthly Waste Identified: {round(total_waste,2)}\n"
            f"Available investments: {investments}\n\n"
            "Create a concrete savings and investment plan."
        )

        try:
            return self.groq.extract_json(SYSTEM, user_msg)
        except Exception:
            return self._fallback(income, savings, savings_rate, total_waste)

    def _fallback(self, income, savings, savings_rate, waste) -> dict:
        target_savings = income * 0.20
        gap = max(0, target_savings - savings)
        return {
            "current_savings_rate":  savings_rate,
            "target_savings_rate":   20,
            "opportunities": [
                {"type": "cut_waste", "description": f"Eliminate identified waste ({self.currency} {round(waste,0)}/mo)",
                 "monthly_impact": round(waste, 2), "priority": "high"},
                {"type": "invest", "description": "Start a small recurring investment (SIP/ETF)",
                 "monthly_impact": round(gap, 2), "priority": "medium"},
            ],
            "investment_recommendations": [
                {"product": "Emergency Fund (savings account)", "allocation_percent": 50,
                 "expected_return": "3-4%", "rationale": "6-month safety net first"},
                {"product": "Index ETF / Mutual Fund SIP", "allocation_percent": 50,
                 "expected_return": "10-15% long-term", "rationale": "Wealth building"},
            ],
            "projected_annual_savings": round((savings + waste) * 12, 2),
            "emergency_fund_months":    round(income * 6, 2),
        }
