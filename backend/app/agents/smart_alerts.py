"""
Smart Alerts Agent — card-stack alerts like Monarch/Copilot.
Generates: overspending, bill due, spending spike, investment readiness,
           debt danger, savings milestone, waste alert, subscription renewal.
"""
from typing import List
from collections import defaultdict
from datetime import datetime, timedelta


class SmartAlertsAgent:
    def run(self, transactions: List[dict], subscriptions: List[dict],
            waste_items: List[dict], budget_plan: dict,
            health_score: dict, currency: str = "AED", anomalies: dict = None) -> List[dict]:
        alerts = []
        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits) or 1
        spend   = sum(t["amount"] for t in debits)

        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category", "other")] += t["amount"]

        budget  = budget_plan.get("recommended_budget", {})
        wants   = budget.get("wants", {})
        needs   = budget.get("needs", {})

        # 1. Overspending alert
        dining_budget = wants.get("dining", income * 0.12)
        dining_actual = cat_spend.get("dining", 0)
        if dining_actual > dining_budget * 1.2:
            pct = int((dining_actual - dining_budget) / dining_budget * 100)
            alerts.append({
                "id":       "overspend_dining",
                "type":     "overspending",
                "severity": "high" if pct > 50 else "medium",
                "icon":     "🍽️",
                "title":    f"Dining spend {pct}% over budget",
                "body":     f"You've spent {currency} {dining_actual:.0f} on dining vs your {currency} {dining_budget:.0f} budget. Cut 3 meals out this week.",
                "action":   "View dining transactions",
                "action_route": "/transactions?cat=dining",
                "color":    "#F43F5E",
            })

        # 2. Shopping spike
        shop_budget = wants.get("shopping", income * 0.15)
        shop_actual = cat_spend.get("shopping", 0)
        if shop_actual > shop_budget * 1.15:
            alerts.append({
                "id":       "spike_shopping",
                "type":     "spending_spike",
                "severity": "medium",
                "icon":     "🛒",
                "title":    "Shopping spike detected",
                "body":     f"Shopping is {currency} {shop_actual:.0f} this month — {int((shop_actual/shop_budget-1)*100)}% above normal. Check for impulse buys.",
                "action":   "See transactions",
                "action_route": "/transactions?cat=shopping",
                "color":    "#F59E0B",
            })

        # 3. Subscription renewals in next 7 days
        today = datetime.now()
        for sub in subscriptions:
            renewal = sub.get("next_renewal", "")
            try:
                r_date = datetime.strptime(renewal, "%Y-%m-%d")
                days   = (r_date - today).days
                if 0 <= days <= 7:
                    alerts.append({
                        "id":       f"renewal_{sub.get('merchant','').lower().replace(' ','_')}",
                        "type":     "bill_due",
                        "severity": "info",
                        "icon":     "📅",
                        "title":    f"{sub.get('merchant')} renews in {days} days",
                        "body":     f"{currency} {sub.get('monthly_cost', sub.get('amount', 0)):.0f} will be charged. Cancel now if you don't use it.",
                        "action":   "Review subscription",
                        "action_route": "/subscription-intelligence",
                        "color":    "#3B82F6",
                    })
            except Exception:
                pass

        # 4. Investment readiness
        savings_rate = (income - spend) / income
        debt_ratio   = cat_spend.get("debt", 0) / income
        hs_score     = health_score.get("overall_score", 0)
        if savings_rate >= 0.20 and debt_ratio < 0.20 and hs_score >= 65:
            monthly_surplus = income - spend
            alerts.append({
                "id":       "investment_ready",
                "type":     "investment_readiness",
                "severity": "success",
                "icon":     "📈",
                "title":    "You're ready to invest!",
                "body":     f"Strong savings rate ({savings_rate*100:.0f}%) and healthy debt ratio. Consider putting {currency} {monthly_surplus*0.5:.0f} into an ETF or SIP this month.",
                "action":   "View savings forecast",
                "action_route": "/savings-forecast",
                "color":    "#10B981",
            })

        # 5. Debt danger
        if debt_ratio > 0.40:
            alerts.append({
                "id":       "debt_danger",
                "type":     "debt_danger",
                "severity": "high",
                "icon":     "⚠️",
                "title":    "Debt consuming 40%+ of income",
                "body":     f"Debt repayments are {debt_ratio*100:.0f}% of income. This limits financial flexibility. Avalanche strategy could save you {currency} {cat_spend.get('debt',0)*2:.0f}.",
                "action":   "Optimise debt",
                "action_route": "/debt-optimizer",
                "color":    "#EF4444",
            })

        # 6. Cash withdrawal warning
        cash = sum(t["amount"] for t in debits
                   if any(k in t.get("merchant","").lower() for k in ["atm","cash","withdraw"]))
        threshold = 500 if currency == "AED" else 10000
        if cash > threshold:
            alerts.append({
                "id":       "cash_warning",
                "type":     "spending_spike",
                "severity": "medium",
                "icon":     "💵",
                "title":    f"High cash withdrawals: {currency} {cash:.0f}",
                "body":     "Cash is hard to track. Switch to card payments for better spending visibility and rewards.",
                "action":   "See cash transactions",
                "action_route": "/transactions?cat=cash",
                "color":    "#F59E0B",
            })

        # 7. Waste total alert
        total_waste = sum(w.get("monthly_loss", 0) for w in waste_items)
        if total_waste > (200 if currency == "AED" else 4000):
            alerts.append({
                "id":       "waste_total",
                "type":     "waste_alert",
                "severity": "medium",
                "icon":     "🗑️",
                "title":    f"{currency} {total_waste:.0f}/mo leaking out",
                "body":     f"AI detected {len(waste_items)} waste patterns totalling {currency} {total_waste:.0f}/month = {currency} {total_waste*12:.0f}/year.",
                "action":   "Fix waste now",
                "action_route": "/insights",
                "color":    "#8B5CF6",
            })

        # 8. Health score milestone
        if hs_score >= 80:
            alerts.append({
                "id":       "health_milestone",
                "type":     "milestone",
                "severity": "success",
                "icon":     "🏆",
                "title":    f"Health score {hs_score}/100 — excellent!",
                "body":     "You're in the top financial health bracket. Keep the momentum and consider increasing your investment allocation.",
                "action":   "View health score",
                "action_route": "/health-score",
                "color":    "#10B981",
            })
        elif hs_score < 50:
            alerts.append({
                "id":       "health_low",
                "type":     "health_warning",
                "severity": "high",
                "icon":     "❤️‍🩹",
                "title":    f"Health score needs attention: {hs_score}/100",
                "body":     "Focus on reducing waste and increasing savings rate. Even a 5% improvement in savings rate adds 10 points.",
                "action":   "Improve score",
                "action_route": "/health-score",
                "color":    "#F43F5E",
            })


        # Fold critical anomalies from AnomalyDetector into alert stack
        if anomalies:
            sev_map   = {"critical":"high","warning":"medium","info":"info"}
            color_map = {"critical":"#F43F5E","warning":"#F59E0B","info":"#3B82F6"}
            for a in (anomalies.get("anomalies") or [])[:3]:
                alerts.append({"id":a["id"],"type":"anomaly_"+a["type"],
                    "severity":sev_map.get(a["severity"],"medium"),"icon":"🔍",
                    "title":a["title"],"body":a["detail"]+" "+a["action"],
                    "action":"View transactions","action_route":"/insights",
                    "color":color_map.get(a["severity"],"#F59E0B")})

        # Sort: high severity first
        sev_order = {"high": 0, "medium": 1, "info": 2, "success": 3}
        alerts.sort(key=lambda a: sev_order.get(a["severity"], 4))

        return alerts[:10]  # Max 8 alerts
