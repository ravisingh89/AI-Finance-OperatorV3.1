"""
Subscription Intelligence Agent
Deep analysis: true cost, usage scoring, cancel recommendations, renewal alerts.
"""
from typing import List
from collections import defaultdict
from datetime import datetime, timedelta


KNOWN_ALTERNATIVES = {
    "netflix":      {"cheaper": "Disney+ Hotstar", "price_uae": 39, "price_ind": 299},
    "spotify":      {"cheaper": "YouTube Premium", "price_uae": 19, "price_ind": 129},
    "amazon prime": {"cheaper": "None needed if you don't use shipping", "price_uae": 0, "price_ind": 0},
    "apple":        {"cheaper": "Google One 100GB", "price_uae": 9, "price_ind": 130},
    "adobe":        {"cheaper": "Canva Pro", "price_uae": 45, "price_ind": 500},
    "microsoft 365":{"cheaper": "LibreOffice (free)", "price_uae": 0, "price_ind": 0},
}

CATEGORY_ICONS = {
    "streaming":   "📺",
    "cloud":       "☁️",
    "saas":        "💻",
    "fitness":     "🏋️",
    "music":       "🎵",
    "news":        "📰",
    "food":        "🍔",
    "other":       "📦",
}


class SubscriptionIntelligenceAgent:
    def run(self, transactions: List[dict], subscriptions: List[dict],
            currency: str = "AED") -> dict:

        enriched = []
        for sub in subscriptions:
            merchant = sub.get("merchant", "").lower()
            amount   = sub.get("amount", 0)
            freq     = sub.get("frequency", "monthly")

            # Monthly cost normalisation
            if freq == "annual":     monthly_cost = round(amount / 12, 2)
            elif freq == "quarterly": monthly_cost = round(amount / 3, 2)
            else:                     monthly_cost = amount

            annual_cost = round(monthly_cost * 12, 2)

            # Category detection
            cat = self._categorise(merchant)

            # Usage score (rule-based — streaming used if dining txs exist nearby)
            usage_score = self._usage_score(merchant, transactions)

            # Alternative
            alt = None
            for key, val in KNOWN_ALTERNATIVES.items():
                if key in merchant:
                    price_key = "price_uae" if currency == "AED" else "price_ind"
                    saving = monthly_cost - val[price_key]
                    if saving > 0 and val["cheaper"]:
                        alt = {"name": val["cheaper"], "saving": round(saving, 2)}

            # Recommendation
            if usage_score < 30:
                rec = "cancel"
                rec_reason = "Low usage detected — likely unused"
            elif usage_score < 60 and alt:
                rec = "switch"
                rec_reason = f"Switch to {alt['name']} and save {currency} {alt['saving']}/mo"
            else:
                rec = "keep"
                rec_reason = "Good value for usage"

            # Next renewal estimate
            sub_txs = [t for t in transactions
                       if sub.get("merchant","").lower() in t.get("merchant","").lower()
                       and t.get("type") == "debit"]
            last_date = None
            if sub_txs:
                try:
                    dates = [datetime.strptime(t["date"], "%Y-%m-%d") for t in sub_txs]
                    last_date = max(dates)
                    if freq == "monthly":    next_renewal = last_date + timedelta(days=30)
                    elif freq == "quarterly": next_renewal = last_date + timedelta(days=90)
                    else:                     next_renewal = last_date + timedelta(days=365)
                    next_renewal_str = next_renewal.strftime("%Y-%m-%d")
                except Exception:
                    next_renewal_str = "Unknown"
            else:
                next_renewal_str = "Unknown"

            enriched.append({
                "merchant":      sub.get("merchant"),
                "category":      cat,
                "icon":          CATEGORY_ICONS.get(cat, "📦"),
                "frequency":     freq,
                "amount":        amount,
                "monthly_cost":  monthly_cost,
                "annual_cost":   annual_cost,
                "currency":      currency,
                "usage_score":   usage_score,
                "recommendation": rec,
                "rec_reason":    rec_reason,
                "alternative":   alt,
                "next_renewal":  next_renewal_str,
                "active":        sub.get("active", True),
            })

        # Totals
        active = [s for s in enriched if s["active"]]
        total_monthly = sum(s["monthly_cost"] for s in active)
        total_annual  = sum(s["annual_cost"]  for s in active)
        to_cancel     = [s for s in active if s["recommendation"] == "cancel"]
        to_switch     = [s for s in active if s["recommendation"] == "switch"]
        potential_saving = sum(s["monthly_cost"] for s in to_cancel) + \
                           sum(s["alternative"]["saving"] for s in to_switch if s.get("alternative"))

        # Subscription overlap (e.g. Netflix + Disney + Prime = overkill)
        streaming = [s for s in active if s["category"] == "streaming"]
        overlap_warning = None
        if len(streaming) >= 3:
            overlap_warning = f"You have {len(streaming)} streaming services. Consider keeping only 2."

        return {
            "subscriptions":       enriched,
            "total_monthly":       round(total_monthly, 2),
            "total_annual":        round(total_annual, 2),
            "active_count":        len(active),
            "potential_saving":    round(potential_saving, 2),
            "to_cancel_count":     len(to_cancel),
            "to_switch_count":     len(to_switch),
            "overlap_warning":     overlap_warning,
            "currency":            currency,
        }

    def _categorise(self, merchant: str) -> str:
        m = merchant.lower()
        if any(k in m for k in ["netflix","disney","osn","hotstar","prime video","starzplay","mbc"]): return "streaming"
        if any(k in m for k in ["spotify","anghami","deezer","apple music","youtube music"]): return "music"
        if any(k in m for k in ["icloud","google one","dropbox","onedrive","box"]): return "cloud"
        if any(k in m for k in ["adobe","notion","slack","office","microsoft","zoom","canva"]): return "saas"
        if any(k in m for k in ["gym","fitness","classpass","cult.fit","strava"]): return "fitness"
        if any(k in m for k in ["linkedin","medium","substack","nytimes"]): return "news"
        if any(k in m for k in ["talabat","zomato gold","swiggy one","deliveroo"]): return "food"
        return "other"

    def _usage_score(self, merchant: str, transactions: List[dict]) -> int:
        """Estimate usage based on surrounding transaction patterns."""
        m = merchant.lower()
        if any(k in m for k in ["netflix","spotify","disney","hotstar"]):
            return 65  # Assume medium usage for entertainment
        if any(k in m for k in ["gym","fitness","classpass"]):
            gym_txs = [t for t in transactions if "uber" in t.get("merchant","").lower()
                      or "careem" in t.get("merchant","").lower()]
            return 70 if len(gym_txs) > 4 else 35  # Active if they commute
        if any(k in m for k in ["icloud","google one","dropbox"]):
            return 80  # Cloud storage almost always used
        if any(k in m for k in ["adobe","notion","microsoft"]):
            return 60
        return 55  # Default medium
