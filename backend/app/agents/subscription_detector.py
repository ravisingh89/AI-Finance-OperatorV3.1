from collections import defaultdict
from typing import List
import re

KNOWN_SUBSCRIPTIONS = {
    "netflix", "spotify", "apple", "icloud", "google one", "amazon prime",
    "hotstar", "osn", "starzplay", "anghami", "deezer", "youtube premium",
    "microsoft 365", "office 365", "adobe", "dropbox", "notion",
    "linkedin", "talabat pro", "zomato gold", "swiggy one",
}

class SubscriptionDetectorAgent:
    """
    Rule-based subscription detection — no LLM needed.
    Detects recurring charges by merchant + frequency.
    """

    def run(self, transactions: List[dict]) -> List[dict]:
        # Group debits by normalized merchant name
        merchant_txs = defaultdict(list)
        for tx in transactions:
            if tx.get("type") == "debit":
                key = self._normalize(tx.get("merchant", ""))
                merchant_txs[key].append(tx)

        subscriptions = []
        for merchant, txs in merchant_txs.items():
            if len(txs) < 2:
                # Check if it's a known subscription even with 1 occurrence
                if any(sub in merchant for sub in KNOWN_SUBSCRIPTIONS):
                    subscriptions.append(self._build(txs[0], "monthly", True))
                continue

            freq = self._detect_frequency(txs)
            if freq:
                subscriptions.append(self._build(txs[-1], freq, True))

        return subscriptions

    def _normalize(self, name: str) -> str:
        name = name.lower()
        # Remove trailing numbers, dates, transaction IDs
        name = re.sub(r"\d{4,}", "", name).strip()
        return name

    def _detect_frequency(self, txs: list) -> str | None:
        if len(txs) < 2:
            return None
        # Sort by date
        try:
            sorted_txs = sorted(txs, key=lambda t: t.get("date", ""))
        except Exception:
            return None

        # Check amount consistency (within 10%)
        amounts = [t["amount"] for t in sorted_txs]
        avg = sum(amounts) / len(amounts)
        if any(abs(a - avg) / avg > 0.15 for a in amounts):
            return None

        # Check date gaps
        from datetime import datetime
        dates = []
        for t in sorted_txs:
            try:
                dates.append(datetime.strptime(t["date"], "%Y-%m-%d"))
            except Exception:
                pass

        if len(dates) < 2:
            return None

        gaps = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
        avg_gap = sum(gaps) / len(gaps)

        if 25 <= avg_gap <= 35:
            return "monthly"
        elif 85 <= avg_gap <= 95:
            return "quarterly"
        elif 355 <= avg_gap <= 375:
            return "annual"
        return None

    def _build(self, tx: dict, freq: str, active: bool) -> dict:
        return {
            "merchant":  tx.get("merchant", "Unknown"),
            "frequency": freq,
            "amount":    tx.get("amount", 0),
            "currency":  tx.get("currency", "AED"),
            "active":    active,
            "category":  tx.get("category", "subscriptions"),
        }
