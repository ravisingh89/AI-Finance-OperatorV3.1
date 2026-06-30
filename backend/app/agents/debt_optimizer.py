"""
Advanced Debt Optimizer — Snowball, Avalanche, and Hybrid strategies.
"""
from typing import List
from collections import defaultdict


class DebtOptimizerAgent:
    UAE_CARD_RATE = 0.36
    IND_CARD_RATE = 0.42
    EMI_RATE      = 0.14

    def __init__(self, currency: str = "AED"):
        self.currency  = currency
        self.card_rate = self.UAE_CARD_RATE if currency == "AED" else self.IND_CARD_RATE

    def run(self, transactions: List[dict]) -> dict:
        debt_txs = [t for t in transactions if t.get("category") == "debt" and t.get("type") == "debit"]
        if not debt_txs:
            return {
                "detected_debts": [], "recommended_strategy": "none",
                "strategy_reason": "No debt detected.",
                "strategies": {}, "interest_saved_vs_minimum": 0,
                "total_payoff_months": 0,
            }

        # Detect debts from transactions
        monthly_debt = defaultdict(float)
        for t in debt_txs:
            m   = t.get("merchant", "debt").lower()
            key = "credit_card" if any(k in m for k in ["card","visa","master","amex","credit"]) else "loan"
            monthly_debt[key] += t["amount"]

        detected_debts = []
        for dtype, monthly_pay in monthly_debt.items():
            rate = self.card_rate if dtype == "credit_card" else self.EMI_RATE
            estimated_balance = monthly_pay * 24
            detected_debts.append({
                "type":              dtype,
                "estimated_balance": round(estimated_balance, 2),
                "interest_rate":     rate,
                "monthly_payment":   round(monthly_pay, 2),
            })

        if not detected_debts:
            return {"detected_debts": [], "recommended_strategy": "none",
                    "strategies": {}, "interest_saved_vs_minimum": 0, "total_payoff_months": 0}

        # ── Avalanche: highest interest first ────────────────────────────
        av_order   = sorted(detected_debts, key=lambda d: d["interest_rate"], reverse=True)
        av_plan, av_interest, av_months = self._payoff_plan(av_order)

        # ── Snowball: smallest balance first ─────────────────────────────
        sb_order   = sorted(detected_debts, key=lambda d: d["estimated_balance"])
        sb_plan, sb_interest, sb_months = self._payoff_plan(sb_order)

        # ── Hybrid: pay minimums on all, throw extra at highest rate ─────
        hy_plan, hy_interest, hy_months = self._hybrid_plan(detected_debts)

        # Minimum payment comparison (just minimums — no extra)
        min_interest = sum(
            self._payoff_months(d["estimated_balance"], d["monthly_payment"] * 0.5, d["interest_rate"])[1]
            for d in detected_debts
        )

        # Recommend: Hybrid if multiple debts, Avalanche if single
        if len(detected_debts) > 1:
            recommended = "hybrid"
            reason = "Hybrid pays minimums on all debts while throwing any extra cash at the highest-interest debt. Best balance of speed and savings."
        else:
            recommended = "avalanche"
            reason = "Single debt — Avalanche is optimal. Pay as much as possible each month."

        return {
            "detected_debts":   detected_debts,
            "recommended_strategy": recommended,
            "strategy_reason":  reason,
            "strategies": {
                "avalanche": {
                    "name":         "Avalanche",
                    "description":  "Highest interest rate first. Mathematically optimal.",
                    "payoff_plan":  av_plan,
                    "total_interest": round(av_interest, 2),
                    "total_months": av_months,
                    "interest_saved_vs_minimum": round(min_interest - av_interest, 2),
                    "best_for":     "Savers who want to minimise total cost",
                },
                "snowball": {
                    "name":         "Snowball",
                    "description":  "Smallest balance first. Faster psychological wins.",
                    "payoff_plan":  sb_plan,
                    "total_interest": round(sb_interest, 2),
                    "total_months": sb_months,
                    "interest_saved_vs_minimum": round(min_interest - sb_interest, 2),
                    "best_for":     "People who need motivation from quick wins",
                },
                "hybrid": {
                    "name":         "Hybrid",
                    "description":  "Minimums on all, extra on highest-rate debt.",
                    "payoff_plan":  hy_plan,
                    "total_interest": round(hy_interest, 2),
                    "total_months": hy_months,
                    "interest_saved_vs_minimum": round(min_interest - hy_interest, 2),
                    "best_for":     "Multiple debts — best balance of speed and savings",
                },
            },
            "interest_saved_vs_minimum": round(min_interest - av_interest, 2),
            "total_payoff_months":       av_months,
            "payoff_plan":               av_plan,
        }

    def _payoff_plan(self, ordered_debts: list) -> tuple:
        plan          = []
        total_interest = 0
        max_months    = 0
        for d in ordered_debts:
            months, interest = self._payoff_months(
                d["estimated_balance"], d["monthly_payment"], d["interest_rate"])
            plan.append({
                "debt_type":      d["type"],
                "payoff_months":  months,
                "total_interest": round(interest, 2),
                "monthly_payment":d["monthly_payment"],
            })
            total_interest += interest
            max_months = max(max_months, months)
        return plan, total_interest, max_months

    def _hybrid_plan(self, debts: list) -> tuple:
        # Each debt pays minimum (50% of stated payment), rest goes to highest rate
        plan          = []
        total_interest = 0
        max_months    = 0
        sorted_debts  = sorted(debts, key=lambda d: d["interest_rate"], reverse=True)
        for i, d in enumerate(sorted_debts):
            extra   = d["monthly_payment"] * 0.5 if i == 0 else 0
            payment = d["monthly_payment"] * 0.5 + extra
            months, interest = self._payoff_months(d["estimated_balance"], payment, d["interest_rate"])
            plan.append({
                "debt_type":       d["type"],
                "payoff_months":   months,
                "total_interest":  round(interest, 2),
                "monthly_payment": round(payment, 2),
                "priority":        "primary" if i == 0 else "minimum",
            })
            total_interest += interest
            max_months = max(max_months, months)
        return plan, total_interest, max_months

    def _payoff_months(self, balance: float, monthly: float, annual_rate: float):
        if monthly <= 0 or balance <= 0:
            return 0, 0
        monthly_rate = annual_rate / 12
        if monthly <= balance * monthly_rate:
            return 120, balance * annual_rate * 10
        months = 0
        total_interest = 0
        remaining = balance
        while remaining > 0 and months < 360:
            interest        = remaining * monthly_rate
            total_interest += interest
            remaining       = remaining + interest - monthly
            months         += 1
        return months, total_interest
