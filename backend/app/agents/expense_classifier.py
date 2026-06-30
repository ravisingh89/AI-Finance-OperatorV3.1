from app.services.groq_service import GroqService
from typing import List

SYSTEM = """You are a financial transaction categorizer for UAE and India.

Assign ONE category from this exact list:
groceries, transport, dining, subscriptions, shopping, rent, salary,
utilities, debt, investments, healthcare, entertainment, other

Quick rules:
- Carrefour / LuLu / Spinneys / DMart / BigBasket = groceries
- Netflix / Spotify / OSN / Hotstar / Prime = subscriptions
- Uber / Careem / Ola / RTA / DMRC = transport
- Zomato / Swiggy / Talabat / Deliveroo = dining
- DEWA / ADDC / SEWA / Du / Etisalat / Airtel / Jio = utilities
- EMI / loan payment / credit card bill = debt
- SIP / mutual fund / stocks = investments
- Salary / income credit = salary

Return ONLY valid JSON, no extra text:
{"results":[{"category":"string","confidence":0.9,"reason":"brief"}]}"""

class ExpenseClassifierAgent:
    # Rule-based fast-path — avoids LLM calls for known merchants
    RULES = {
        "carrefour": "groceries", "lulu": "groceries", "spinneys": "groceries",
        "dmart": "groceries", "bigbasket": "groceries", "reliance fresh": "groceries",
        "netflix": "subscriptions", "spotify": "subscriptions", "apple": "subscriptions",
        "amazon prime": "subscriptions", "hotstar": "subscriptions", "osn": "subscriptions",
        "uber": "transport", "careem": "transport", "ola": "transport",
        "rta": "transport", "salik": "transport", "dmrc": "transport",
        "zomato": "dining", "swiggy": "dining", "talabat": "dining", "deliveroo": "dining",
        "dewa": "utilities", "addc": "utilities", "du ": "utilities",
        "etisalat": "utilities", "airtel": "utilities", "jio": "utilities",
        "salary": "salary", "payroll": "salary",
        "emi": "debt", "loan": "debt",
        "sip": "investments", "mutual fund": "investments",
    }

    def __init__(self, region: str = "UAE"):
        self.groq = GroqService()
        self.region = region

    def run(self, transactions: List[dict]) -> List[dict]:
        result = []
        # Batch up to 20 transactions per LLM call to save API calls
        batch = []
        batch_indices = []

        classified = [None] * len(transactions)

        for i, tx in enumerate(transactions):
            cat = self._rule_match(tx.get("merchant", ""))
            if cat:
                classified[i] = {**tx, "category": cat, "confidence": 0.95, "reason": "rule-based"}
            else:
                batch.append(tx)
                batch_indices.append(i)
                if len(batch) == 20:
                    self._classify_batch(batch, batch_indices, classified)
                    batch, batch_indices = [], []

        if batch:
            self._classify_batch(batch, batch_indices, classified)

        return [t or {**transactions[i], "category": "other", "confidence": 0.5, "reason": "fallback"}
                for i, t in enumerate(classified)]

    def _rule_match(self, merchant: str) -> str | None:
        m = merchant.lower()
        for keyword, cat in self.RULES.items():
            if keyword in m:
                return cat
        return None

    def _classify_batch(self, batch: list, indices: list, classified: list):
        user_msg = (
            f"Region: {self.region}\n"
            "Classify each transaction:\n"
            + "\n".join(f"{i+1}. Merchant: {t['merchant']} | Amount: {t['amount']} {t['currency']}"
                        for i, t in enumerate(batch))
            + f"\n\nReturn JSON with {len(batch)} results in 'results' array."
        )
        try:
            data = self.groq.extract_json(SYSTEM, user_msg)
            results = data.get("results", [])
            for j, idx in enumerate(indices):
                if j < len(results):
                    r = results[j]
                    classified[idx] = {
                        **batch[j],
                        "category":   r.get("category", "other"),
                        "confidence": float(r.get("confidence", 0.7)),
                        "reason":     r.get("reason", ""),
                    }
        except Exception:
            for j, idx in enumerate(indices):
                classified[idx] = {**batch[j], "category": "other", "confidence": 0.5, "reason": "error"}
