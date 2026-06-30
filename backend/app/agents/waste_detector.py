from typing import List
from collections import defaultdict

class WasteDetectorAgent:
    """Detects money leaks — rule-based + LLM summary."""

    # Thresholds relative to total spend
    DINING_THRESHOLD  = 0.30   # >30% on dining = waste
    ENTERTAIN_THRESHOLD = 0.20 # >20% entertainment
    SHOPPING_THRESHOLD = 0.25  # >25% shopping

    def __init__(self, currency: str = "AED"):
        self.currency = currency
        # Scale thresholds: AED vs INR amounts differ ~22x
        self.waste_threshold_low  = 200  if currency == "AED" else 4000
        self.waste_threshold_high = 1000 if currency == "AED" else 20000

    def run(self, transactions: List[dict], subscriptions: List[dict]) -> List[dict]:
        waste = []
        debits = [t for t in transactions if t.get("type") == "debit"]
        total_spend = sum(t["amount"] for t in debits) or 1

        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category", "other")] += t["amount"]

        # 1. Duplicate subscriptions
        waste += self._check_duplicate_subs(subscriptions)

        # 2. Excessive category spend
        waste += self._check_category_excess(cat_spend, total_spend)

        # 3. Excessive cash withdrawals
        waste += self._check_cash_withdrawals(debits)

        # 4. High-frequency small spend (impulse)
        waste += self._check_impulse(debits)

        return waste

    def _check_duplicate_subs(self, subscriptions: list) -> list:
        seen = defaultdict(list)
        for s in subscriptions:
            cat = s.get("category", "")
            if "stream" in cat or "subscription" in (s.get("merchant","")).lower():
                seen["streaming"].append(s)
        waste = []
        for cat, subs in seen.items():
            if len(subs) > 2:
                monthly_loss = sum(s["amount"] for s in subs[2:])
                waste.append({
                    "waste_type":     "duplicate_subscriptions",
                    "merchant":       ", ".join(s["merchant"] for s in subs),
                    "severity":       "medium" if monthly_loss < self.waste_threshold_high else "high",
                    "monthly_loss":   round(monthly_loss, 2),
                    "recommendation": f"You have {len(subs)} streaming subscriptions. Consider keeping 1-2 max.",
                })
        return waste

    def _check_category_excess(self, cat_spend: dict, total: float) -> list:
        waste = []
        checks = [
            ("dining",         self.DINING_THRESHOLD,   "dining out"),
            ("entertainment",  self.ENTERTAIN_THRESHOLD, "entertainment"),
            ("shopping",       self.SHOPPING_THRESHOLD,  "shopping"),
        ]
        for cat, threshold, label in checks:
            spend = cat_spend.get(cat, 0)
            ratio = spend / total
            if ratio > threshold:
                excess = spend - (total * threshold)
                waste.append({
                    "waste_type":     f"excessive_{cat}",
                    "merchant":       cat.capitalize(),
                    "severity":       "high" if ratio > threshold * 1.5 else "medium",
                    "monthly_loss":   round(excess, 2),
                    "recommendation": f"Reduce {label} spend by ~{int((ratio - threshold)*100)}% to hit healthy budget ratio.",
                })
        return waste

    def _check_cash_withdrawals(self, debits: list) -> list:
        cash = [t for t in debits if any(
            k in t.get("merchant", "").lower() for k in ["atm", "cash", "withdraw"]
        )]
        total_cash = sum(t["amount"] for t in cash)
        if total_cash > self.waste_threshold_low:
            return [{
                "waste_type":     "excess_cash_withdrawals",
                "merchant":       "ATM / Cash",
                "severity":       "medium",
                "monthly_loss":   round(total_cash * 0.1, 2),  # ~10% hard to track
                "recommendation": "Use card/UPI instead of cash for better expense tracking.",
            }]
        return []

    def _check_impulse(self, debits: list) -> list:
        from collections import Counter
        merchants = [t.get("merchant", "") for t in debits if t["amount"] < 50]
        counts = Counter(merchants)
        impulse = [(m, c) for m, c in counts.items() if c >= 5]
        waste = []
        for merchant, count in impulse[:3]:  # cap at top 3
            txs = [t for t in debits if t.get("merchant") == merchant]
            total = sum(t["amount"] for t in txs)
            waste.append({
                "waste_type":     "impulse_spending",
                "merchant":       merchant,
                "severity":       "low",
                "monthly_loss":   round(total, 2),
                "recommendation": f"Visited {merchant} {count}x this month. Set a monthly limit.",
            })
        return waste
