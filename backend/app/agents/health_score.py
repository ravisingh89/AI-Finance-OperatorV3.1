"""
Enhanced Financial Health Score — 7 subscores, 0-100 total.
New vs previous: emergency_fund, income_stability, investment_readiness.
"""
from typing import List
from collections import defaultdict
import math


class HealthScoreAgent:
    def run(self, transactions: List[dict], subscriptions: List[dict],
            waste_items: List[dict], currency: str = "AED") -> dict:

        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits) or 1
        spend   = sum(t["amount"] for t in debits)

        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category", "other")] += t["amount"]

        savings        = max(0, income - spend)
        savings_rate   = savings / income
        spending_ratio = spend / income
        debt_spend     = cat_spend.get("debt", 0)
        debt_ratio     = debt_spend / income
        sub_spend      = sum(s.get("amount", 0) for s in subscriptions)
        sub_ratio      = sub_spend / income

        # ── 1. Spending discipline (0-15) ────────────────────────────────
        if spending_ratio <= 0.50:   sd = 15
        elif spending_ratio <= 0.65: sd = 12
        elif spending_ratio <= 0.80: sd = 8
        elif spending_ratio <= 0.95: sd = 4
        else:                        sd = 0

        # ── 2. Savings rate (0-15) ───────────────────────────────────────
        if savings_rate >= 0.30:    sr = 15
        elif savings_rate >= 0.20:  sr = 12
        elif savings_rate >= 0.10:  sr = 8
        elif savings_rate >= 0.05:  sr = 4
        else:                       sr = 0

        # ── 3. Debt health (0-15) ────────────────────────────────────────
        if debt_ratio == 0:         dh = 15
        elif debt_ratio <= 0.15:    dh = 12
        elif debt_ratio <= 0.30:    dh = 7
        elif debt_ratio <= 0.45:    dh = 3
        else:                       dh = 0

        # ── 4. Subscription efficiency (0-15) ────────────────────────────
        waste_count = len(waste_items)
        sub_score   = max(0, 15 - int(sub_ratio * 120) - (waste_count * 2))

        # ── 5. Emergency fund readiness (0-15) ───────────────────────────
        # Proxy: savings this month vs 1-month expense target
        one_month_expenses = spend
        emergency_ratio    = savings / max(one_month_expenses, 1)
        if emergency_ratio >= 0.5:   ef = 15  # Saving half a month in one go
        elif emergency_ratio >= 0.3: ef = 11
        elif emergency_ratio >= 0.1: ef = 6
        elif emergency_ratio >= 0.0: ef = 2
        else:                        ef = 0

        # ── 6. Income stability (0-10) ───────────────────────────────────
        # Proxy: single large credit = salary (stable), many small = freelance (less stable)
        credit_txs = [t for t in credits]
        if len(credit_txs) == 1:                         is_ = 10  # Single salary
        elif len(credit_txs) <= 3:                       is_ = 8
        elif len(credit_txs) <= 6:                       is_ = 5   # Mixed income
        else:                                             is_ = 3   # Many small, uncertain

        # ── 7. Investment readiness (0-15) ───────────────────────────────
        invest_spend = cat_spend.get("investments", 0)
        inv_ratio    = invest_spend / income
        # Also check: low debt + good savings = ready to invest
        if inv_ratio >= 0.10:                            ir = 15
        elif inv_ratio >= 0.05:                          ir = 11
        elif savings_rate >= 0.20 and debt_ratio < 0.20: ir = 8   # Ready but not investing
        elif savings_rate >= 0.10:                       ir = 4
        else:                                            ir = 0

        total = sd + sr + dh + sub_score + ef + is_ + ir

        # Grade
        if total >= 85:   grade, label, color = "A+","Outstanding", "#10B981"
        elif total >= 75: grade, label, color = "A", "Excellent",   "#10B981"
        elif total >= 65: grade, label, color = "B", "Good",        "#3B82F6"
        elif total >= 50: grade, label, color = "C", "Fair",        "#F59E0B"
        elif total >= 35: grade, label, color = "D", "Needs work",  "#F97316"
        else:             grade, label, color = "F", "Critical",    "#EF4444"

        # Improvement suggestions (ranked by impact)
        suggestions = []
        sub_scores_map = {
            "spending_discipline":   (sd,  15, "Reduce monthly spend below 80% of income"),
            "savings_rate":          (sr,  15, "Target saving at least 20% of every paycheck"),
            "debt_health":           (dh,  15, "Accelerate debt repayment — pay more than minimum"),
            "subscription_efficiency":(sub_score,15,"Cancel or switch unused subscriptions"),
            "emergency_fund":        (ef,  15, "Build a 6-month emergency fund — open a dedicated account"),
            "income_stability":      (is_, 10, "Diversify income sources to reduce dependency on one stream"),
            "investment_readiness":  (ir,  15, "Start a small SIP/ETF — even AED 100 or ₹500/month"),
        }
        for key, (score, max_score, tip) in sub_scores_map.items():
            gap = max_score - score
            if gap >= 5:
                suggestions.append({"subscore": key, "gap": gap, "tip": tip})
        suggestions.sort(key=lambda s: s["gap"], reverse=True)

        # Insights
        insights = []
        if savings_rate < 0.10:
            insights.append({"type":"danger",  "msg":f"Savings rate is only {savings_rate*100:.0f}%. Target 20%+ urgently."})
        if debt_ratio > 0.35:
            insights.append({"type":"danger",  "msg":f"Debt payments consume {debt_ratio*100:.0f}% of income — financially dangerous."})
        if ef < 6:
            insights.append({"type":"warning", "msg":"Emergency fund is low. One unexpected expense could derail your finances."})
        if ir >= 8 and invest_spend == 0:
            insights.append({"type":"warning", "msg":"You're ready to invest but not doing it yet. Start with AED 200/mo ETF."})
        if savings_rate >= 0.20:
            insights.append({"type":"success", "msg":f"Strong savings rate of {savings_rate*100:.0f}%. You're building real wealth."})
        if total >= 75:
            insights.append({"type":"success", "msg":f"Financial health score of {total} puts you in the top tier."})

        return {
            "overall_score": total,
            "grade":         grade,
            "label":         label,
            "color":         color,
            "sub_scores": {
                "spending_discipline":    {"score": sd,        "max": 15, "label": "Spending discipline",   "icon": "💸"},
                "savings_rate":           {"score": sr,        "max": 15, "label": "Savings rate",          "icon": "💰"},
                "debt_health":            {"score": dh,        "max": 15, "label": "Debt health",           "icon": "💳"},
                "subscription_efficiency":{"score": sub_score, "max": 15, "label": "Subscription control",  "icon": "🔁"},
                "emergency_fund":         {"score": ef,        "max": 15, "label": "Emergency fund",        "icon": "🛡️"},
                "income_stability":       {"score": is_,       "max": 10, "label": "Income stability",      "icon": "📊"},
                "investment_readiness":   {"score": ir,        "max": 15, "label": "Investment readiness",  "icon": "📈"},
            },
            "radar_data": [
                {"subject": "Spending",    "score": int(sd/15*100),        "full": 100},
                {"subject": "Savings",     "score": int(sr/15*100),        "full": 100},
                {"subject": "Debt",        "score": int(dh/15*100),        "full": 100},
                {"subject": "Subs",        "score": int(sub_score/15*100), "full": 100},
                {"subject": "Emergency",   "score": int(ef/15*100),        "full": 100},
                {"subject": "Stability",   "score": int(is_/10*100),       "full": 100},
                {"subject": "Investing",   "score": int(ir/15*100),        "full": 100},
            ],
            "metrics": {
                "income":          round(income, 2),
                "spend":           round(spend, 2),
                "savings":         round(savings, 2),
                "savings_rate":    round(savings_rate * 100, 1),
                "debt_ratio":      round(debt_ratio * 100, 1),
                "spending_ratio":  round(spending_ratio * 100, 1),
                "investment_ratio":round(inv_ratio * 100, 1),
            },
            "insights":    insights,
            "suggestions": suggestions[:3],
            "currency":    currency,
        }
