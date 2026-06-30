"""
Savings Forecast Agent — 3/6/12/36 month projections with scenarios.
Pure math + Groq for narrative.
"""
from typing import List
from app.services.groq_service import GroqService


class SavingsForecastAgent:
    def __init__(self, region: str = "UAE", currency: str = "AED"):
        self.groq     = GroqService()
        self.region   = region
        self.currency = currency

    def run(self, transactions: List[dict], waste_items: List[dict],
            savings_plan: dict) -> dict:
        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits)
        spend   = sum(t["amount"] for t in debits)
        current_monthly_savings = max(0, income - spend)
        waste_monthly = sum(w.get("monthly_loss", 0) for w in waste_items)

        # Three scenarios
        scenarios = {
            "current":    current_monthly_savings,
            "optimised":  current_monthly_savings + (waste_monthly * 0.5),  # cut half the waste
            "aggressive": current_monthly_savings + waste_monthly,           # cut all waste
        }

        # Investment return assumptions
        returns = {
            "savings_account": 0.035,   # 3.5% APY
            "fd":              0.050,   # 5% FD
            "etf_sip":         0.120,   # 12% long term equity
        }

        projections = {}
        for scenario, monthly in scenarios.items():
            projections[scenario] = {}
            for horizon in [3, 6, 12, 24, 36]:
                projections[scenario][f"{horizon}m"] = {}
                for product, rate in returns.items():
                    # Future value of annuity = PMT × [((1+r)^n - 1) / r]
                    r = rate / 12
                    n = horizon
                    if r == 0:
                        fv = monthly * n
                    else:
                        fv = monthly * (((1 + r) ** n - 1) / r)
                    projections[scenario][f"{horizon}m"][product] = round(fv, 2)

        # Milestones
        milestones = self._milestones(income, current_monthly_savings, self.currency)

        # AI narrative for optimised scenario
        narrative = self._narrative(income, spend, current_monthly_savings,
                                     waste_monthly, projections["optimised"])

        return {
            "currency":                self.currency,
            "monthly_income":          round(income, 2),
            "current_monthly_savings": round(current_monthly_savings, 2),
            "current_savings_rate":    round(current_monthly_savings / income * 100, 1) if income > 0 else 0,
            "monthly_waste":           round(waste_monthly, 2),
            "scenarios":               {k: round(v, 2) for k, v in scenarios.items()},
            "projections":             projections,
            "milestones":              milestones,
            "narrative":               narrative,
            "investment_products":     self._products(),
        }

    def _milestones(self, income: float, monthly_save: float, currency: str) -> list:
        targets = [
            {"name": "1-month emergency buffer", "amount": income},
            {"name": "3-month emergency fund",    "amount": income * 3},
            {"name": "6-month emergency fund",    "amount": income * 6},
            {"name": f"{currency} 100,000 saved", "amount": 100000 if currency == "AED" else 1000000},
        ]
        milestones = []
        for t in targets:
            months = (t["amount"] / monthly_save) if monthly_save > 0 else 999
            milestones.append({
                "name":         t["name"],
                "target":       round(t["amount"], 0),
                "months_away":  round(months, 1),
                "achievable":   months <= 60,
            })
        return milestones

    def _narrative(self, income, spend, monthly_save, waste, projections) -> str:
        try:
            system = "You are a financial advisor. Write 2-3 encouraging sentences about a user's savings forecast. Be specific about numbers. No markdown."
            optimised_12m = projections.get("12m", {}).get("etf_sip", 0)
            user_msg = f"""Income: {round(income,0)} {self.currency}/month
Current savings: {round(monthly_save,0)} {self.currency}/month
Identified waste: {round(waste,0)} {self.currency}/month
If they cut waste, in 12 months they could have {round(optimised_12m,0)} {self.currency} in a diversified portfolio.
Write a short motivating paragraph."""
            return self.groq.complete(system, user_msg, max_tokens=200)
        except Exception:
            return f"By saving consistently and cutting identified waste of {self.currency} {round(waste,0)}/month, you could accumulate {self.currency} {round(projections.get('12m',{}).get('etf_sip',0),0)} in a diversified portfolio within 12 months. Small consistent actions compound into life-changing wealth."

    def _products(self) -> list:
        if self.currency == "AED":
            return [
                {"name": "High-yield savings", "rate": "3–4%",  "risk": "none",   "min": "AED 1,000",  "platform": "ADCB, FAB, Emirates NBD"},
                {"name": "Fixed deposit",       "rate": "4–5%",  "risk": "none",   "min": "AED 5,000",  "platform": "Any UAE bank"},
                {"name": "ETF portfolio",       "rate": "8–12%", "risk": "medium", "min": "AED 500",    "platform": "Sarwa, StashAway"},
                {"name": "Government sukuk",    "rate": "4–5%",  "risk": "low",    "min": "AED 10,000", "platform": "Dubai Islamic Bank"},
            ]
        else:
            return [
                {"name": "SIP — Index fund",    "rate": "12–15%","risk": "medium", "min": "₹500/mo",   "platform": "Groww, Zerodha"},
                {"name": "PPF",                 "rate": "7.1%",  "risk": "none",   "min": "₹500/yr",   "platform": "Post office, SBI"},
                {"name": "Fixed deposit",       "rate": "6.5–7.5%","risk":"none",  "min": "₹1,000",    "platform": "Any Indian bank"},
                {"name": "NPS",                 "rate": "9–12%", "risk": "low",    "min": "₹500/mo",   "platform": "NSDL, HDFC Pension"},
            ]
