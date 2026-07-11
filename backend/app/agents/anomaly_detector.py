"""
Spending Anomaly Detection Engine — pure Python, no LLM needed.
Detects: duplicates, large tx, overspend, new recurring charges,
night-spending patterns, weekend concentration.
"""
from typing import List
from collections import defaultdict
from datetime import datetime
import uuid


class AnomalyDetectorAgent:
    def run(self, transactions: List[dict], currency: str = "AED") -> dict:
        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits) or 1
        anomalies = []
        anomalies += self._duplicates(debits, currency)
        anomalies += self._large_tx(debits, income, currency)
        anomalies += self._overspend(debits, credits, currency)
        anomalies += self._new_recurring(debits, currency)
        anomalies += self._night_spending(debits, currency)
        anomalies += self._weekend_heavy(debits, currency)
        sev = {"critical": 0, "warning": 1, "info": 2}
        anomalies.sort(key=lambda a: sev.get(a["severity"], 3))
        total_at_risk   = sum(a["amount"] for a in anomalies if a["severity"] == "critical")
        critical_count  = sum(1 for a in anomalies if a["severity"] == "critical")
        return {
            "anomalies":      anomalies[:10],
            "anomaly_count":  len(anomalies),
            "critical_count": critical_count,
            "total_at_risk":  round(total_at_risk, 2),
        }

    def _duplicates(self, debits, currency):
        result, seen = [], {}
        for t in debits:
            key = f"{t.get('merchant','').lower()}_{round(t.get('amount',0),2)}"
            try:
                d = datetime.strptime(t["date"], "%Y-%m-%d")
            except Exception:
                continue
            if key in seen:
                gap = abs((d - seen[key]).days)
                if gap <= 3:
                    result.append({"id": f"dup_{uuid.uuid4().hex[:8]}", "type": "duplicate",
                        "severity": "critical", "title": f"Possible duplicate charge — {t.get('merchant')}",
                        "detail": f"{currency} {t.get('amount')} charged twice within {gap} day(s). Potential double-billing.",
                        "amount": t.get("amount", 0), "currency": currency,
                        "action": "Check bank app and dispute one charge if duplicate.",
                        "merchant": t.get("merchant"), "detected_at": datetime.utcnow().isoformat()})
            seen[key] = d
        return result

    def _large_tx(self, debits, income, currency):
        result, threshold = [], income * 0.15
        for t in debits:
            if t.get("amount", 0) > threshold:
                pct = round(t["amount"] / income * 100, 1)
                result.append({"id": f"large_{uuid.uuid4().hex[:8]}", "type": "large_tx",
                    "severity": "warning", "title": f"Large transaction: {currency} {t.get('amount')} at {t.get('merchant')}",
                    "detail": f"This charge is {pct}% of monthly income ({currency} {round(income,0)}). Date: {t.get('date')}.",
                    "amount": t.get("amount", 0), "currency": currency,
                    "action": "Verify this was intentional. Contact bank immediately if unexpected.",
                    "merchant": t.get("merchant"), "detected_at": datetime.utcnow().isoformat()})
        return result[:2]

    def _overspend(self, debits, credits, currency):
        spend  = sum(t["amount"] for t in debits)
        income = sum(t["amount"] for t in credits)
        if income > 0 and spend > income:
            deficit = round(spend - income, 2)
            return [{"id": "overspend_month", "type": "overspend",
                "severity": "critical", "title": "Spending exceeds income this month",
                "detail": f"Spent {currency} {round(spend,0)} vs income {currency} {round(income,0)}. Deficit: {currency} {deficit}.",
                "amount": deficit, "currency": currency,
                "action": "Review all non-essential spend immediately. Consider a no-spend week.",
                "merchant": None, "detected_at": datetime.utcnow().isoformat()}]
        return []

    def _new_recurring(self, debits, currency):
        merchant_amounts = defaultdict(list)
        for t in debits:
            merchant_amounts[t.get("merchant","").lower()].append(round(t.get("amount",0),2))
        result = []
        threshold = 500 if currency == "AED" else 10000
        for merchant, amounts in merchant_amounts.items():
            if len(amounts) >= 2 and len(set(amounts)) == 1 and amounts[0] < threshold:
                result.append({"id": f"recurring_{uuid.uuid4().hex[:8]}", "type": "new_charge",
                    "severity": "info", "title": f"New recurring charge — {merchant.title()}",
                    "detail": f"{currency} {amounts[0]} charged {len(amounts)}× — looks like a new subscription or EMI.",
                    "amount": amounts[0], "currency": currency,
                    "action": "If you didn't sign up for this, cancel immediately.",
                    "merchant": merchant.title(), "detected_at": datetime.utcnow().isoformat()})
        return result[:2]

    def _night_spending(self, debits, currency):
        night_kw = ["uber eats","zomato","deliveroo","talabat","swiggy","netflix","playstation","steam"]
        night_txs = [t for t in debits if any(k in t.get("merchant","").lower() for k in night_kw)]
        if len(debits) > 5 and len(night_txs) / len(debits) > 0.30:
            total = round(sum(t["amount"] for t in night_txs), 2)
            return [{"id": "night_spending", "type": "night_spending",
                "severity": "info", "title": "Late-night / impulse spending pattern",
                "detail": f"{len(night_txs)} of {len(debits)} transactions are impulse/late-night spend ({currency} {total} total).",
                "amount": total, "currency": currency,
                "action": "Set a daily spending limit on delivery apps. Remove saved card details from impulse platforms.",
                "merchant": None, "detected_at": datetime.utcnow().isoformat()}]
        return []

    def _weekend_heavy(self, debits, currency):
        weekend, weekday = 0.0, 0.0
        for t in debits:
            try:
                if datetime.strptime(t["date"], "%Y-%m-%d").weekday() >= 5:
                    weekend += t.get("amount", 0)
                else:
                    weekday += t.get("amount", 0)
            except Exception:
                pass
        total = weekend + weekday
        if total > 0 and weekend / total > 0.60:
            pct = round(weekend / total * 100, 1)
            return [{"id": "weekend_heavy", "type": "weekend_heavy",
                "severity": "info", "title": f"Weekend spending is {pct}% of total",
                "detail": f"{currency} {round(weekend,0)} on weekends vs {currency} {round(weekday,0)} weekdays.",
                "amount": round(weekend, 2), "currency": currency,
                "action": "Set a weekend budget cap. Review weekend merchant list for patterns.",
                "merchant": None, "detected_at": datetime.utcnow().isoformat()}]
        return []
