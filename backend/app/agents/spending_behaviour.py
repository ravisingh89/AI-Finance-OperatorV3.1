"""
Spending Behaviour Agent — heatmap data, patterns, streaks, behaviour scores.
"""
from typing import List
from collections import defaultdict
from datetime import datetime


class SpendingBehaviourAgent:
    def run(self, transactions: List[dict], currency: str = "AED") -> dict:
        debits = [t for t in transactions if t.get("type") == "debit"]
        if not debits:
            return self._empty()

        # ── Day-of-week heatmap ───────────────────────────────────────────
        dow_spend = defaultdict(float)
        dow_count = defaultdict(int)
        for t in debits:
            try:
                d = datetime.strptime(t["date"], "%Y-%m-%d")
                dow_spend[d.weekday()] += t["amount"]
                dow_count[d.weekday()] += 1
            except Exception:
                pass

        days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
        heatmap_dow = [
            {"day": days[i], "amount": round(dow_spend.get(i, 0), 2),
             "count": dow_count.get(i, 0)}
            for i in range(7)
        ]

        # ── Weekly spending trend ─────────────────────────────────────────
        week_spend = defaultdict(float)
        for t in debits:
            try:
                d = datetime.strptime(t["date"], "%Y-%m-%d")
                week = d.isocalendar()[1]
                week_spend[week] += t["amount"]
            except Exception:
                pass

        weekly_trend = [
            {"week": f"W{w}", "amount": round(a, 2)}
            for w, a in sorted(week_spend.items())
        ]

        # ── Category heatmap (top 6 cats × days) ─────────────────────────
        cat_dow = defaultdict(lambda: defaultdict(float))
        for t in debits:
            try:
                d   = datetime.strptime(t["date"], "%Y-%m-%d")
                cat = t.get("category", "other")
                cat_dow[cat][d.weekday()] += t["amount"]
            except Exception:
                pass

        top_cats = sorted(
            {t.get("category","other") for t in debits},
            key=lambda c: sum(cat_dow[c].values()), reverse=True
        )[:6]

        category_heatmap = {
            cat: [round(cat_dow[cat].get(i, 0), 2) for i in range(7)]
            for cat in top_cats
        }

        # ── Behaviour patterns ────────────────────────────────────────────
        total_spend = sum(t["amount"] for t in debits)
        avg_tx      = total_spend / max(len(debits), 1)

        patterns = []

        # Weekend warrior?
        weekend_spend = dow_spend.get(5, 0) + dow_spend.get(6, 0)
        weekday_avg   = sum(dow_spend.get(i, 0) for i in range(5)) / 5
        if weekend_spend > weekday_avg * 3:
            patterns.append({
                "id":    "weekend_warrior",
                "icon":  "🎉",
                "title": "Weekend spender",
                "desc":  f"You spend {int(weekend_spend/max(weekday_avg,1))}× more on weekends. Set a weekend budget.",
                "color": "#F59E0B",
            })

        # Late-month panic?
        late_txs    = [t for t in debits if int(t.get("date","2024-01-01").split("-")[2]) > 20]
        early_txs   = [t for t in debits if int(t.get("date","2024-01-01").split("-")[2]) <= 10]
        late_spend  = sum(t["amount"] for t in late_txs)
        early_spend = sum(t["amount"] for t in early_txs)
        if late_spend > early_spend * 1.5 and len(late_txs) >= 3:
            patterns.append({
                "id":    "late_month_splurge",
                "icon":  "📅",
                "title": "Late-month splurger",
                "desc":  "Spending accelerates after the 20th. You may be stress-spending near month-end.",
                "color": "#EF4444",
            })

        # Micro-transaction habit
        micro_txs = [t for t in debits if t["amount"] < (20 if currency=="AED" else 400)]
        if len(micro_txs) > 10:
            micro_total = sum(t["amount"] for t in micro_txs)
            patterns.append({
                "id":    "micro_spending",
                "icon":  "☕",
                "title": "Micro-transaction habit",
                "desc":  f"{len(micro_txs)} small purchases totalling {currency} {micro_total:.0f}. These add up fast.",
                "color": "#8B5CF6",
            })

        # Consistent saver?
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits)
        if income > 0 and (income - total_spend) / income >= 0.20:
            patterns.append({
                "id":    "consistent_saver",
                "icon":  "💚",
                "title": "Consistent saver",
                "desc":  f"Saving {((income-total_spend)/income*100):.0f}% of income. You're building real wealth.",
                "color": "#10B981",
            })

        # ── Behaviour score (0-100) ───────────────────────────────────────
        score = 50
        if weekend_spend < weekday_avg * 2: score += 10
        if late_spend < early_spend * 1.2:  score += 10
        if len(micro_txs) < 8:              score += 10
        if income > 0 and (income - total_spend) / income >= 0.15: score += 20
        score = min(100, max(0, score))

        # ── Merchant frequency ────────────────────────────────────────────
        merchant_freq = defaultdict(lambda: {"count":0,"total":0.0})
        for t in debits:
            m = t.get("merchant","Unknown")
            merchant_freq[m]["count"] += 1
            merchant_freq[m]["total"] += t["amount"]

        top_merchants = sorted(
            [{"merchant":m,"count":v["count"],"total":round(v["total"],2)}
             for m,v in merchant_freq.items()],
            key=lambda x: x["total"], reverse=True
        )[:8]

        return {
            "currency":          currency,
            "behaviour_score":   score,
            "heatmap_dow":       heatmap_dow,
            "weekly_trend":      weekly_trend,
            "category_heatmap":  category_heatmap,
            "patterns":          patterns,
            "top_merchants":     top_merchants,
            "total_transactions": len(debits),
            "avg_transaction":   round(avg_tx, 2),
        }

    def _empty(self):
        return {
            "currency":"AED","behaviour_score":0,"heatmap_dow":[],
            "weekly_trend":[],"category_heatmap":{},"patterns":[],
            "top_merchants":[],"total_transactions":0,"avg_transaction":0,
        }
