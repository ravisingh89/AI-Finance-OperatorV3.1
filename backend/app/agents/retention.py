"""
Retention Engine — streak system, milestones, challenges, weekly digest, bill calendar.
Pure calculation — no LLM needed for core retention mechanics.
"""
from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime, timedelta


class RetentionEngine:
    def run(self, transactions: List[dict], health_score: dict,
            previous_report: dict | None, currency: str = "AED",
            real_streak: dict | None = None) -> dict:

        debits  = [t for t in transactions if t.get("type") == "debit"]
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits) or 1
        spend   = sum(t["amount"] for t in debits)
        savings = max(0, income - spend)

        return {
            "streak":          self._streak(health_score, real_streak),
            "milestones":      self._milestones(savings, income, health_score),
            "weekly_digest":   self._weekly_digest(transactions, currency),
            "bill_calendar":   self._bill_calendar(transactions),
            "challenges":      self._challenges(transactions, currency),
            "score_trend":     self._score_trend(health_score, previous_report),
            "report_card":     self._report_card(health_score, savings, income, currency),
        }

    def _streak(self, health_score: dict, real_streak: dict | None = None) -> dict:
        """
        Uses real persisted streak data (actual consecutive days of activity) when
        available. Falls back to a score-based estimate only for a brand-new user
        with no streak history yet (e.g. first-ever report preview).
        """
        if real_streak is not None:
            current = real_streak.get("current_streak", 1)
            best    = real_streak.get("best_streak", current)
            points  = 10 + (health_score.get("overall_score", 0) // 10)
            level   = "Bronze" if current < 7 else "Silver" if current < 30 else "Gold"
            return {
                "current_streak": current,
                "best_streak":    best,
                "streak_label":   f"{current} day streak 🔥",
                "next_milestone": 7,
                "points_today":   points,
                "level":          level,
            }

        # Fallback for contexts with no persisted streak (e.g. unit tests)
        score = health_score.get("overall_score", 0)
        bonus = 3 if score >= 70 else 1 if score >= 50 else 0
        total = 1 + bonus
        return {
            "current_streak": total,
            "best_streak": total,
            "streak_label": f"{total} day streak 🔥",
            "next_milestone": 7,
            "points_today": 10 + (score // 10),
            "level": "Bronze",
        }
        score = health_score.get("overall_score", 0)
        # Streak is days since last upload (proxy) + score-based bonus
        streak_days = 1  # At least 1 for uploading today
        if score >= 70: streak_bonus = 3
        elif score >= 50: streak_bonus = 1
        else: streak_bonus = 0
        total_streak = streak_days + streak_bonus
        return {
            "current_streak": total_streak,
            "best_streak": total_streak,
            "streak_label": f"{total_streak} day streak 🔥",
            "next_milestone": 7,
            "points_today": 10 + (score // 10),
            "level": "Bronze" if total_streak < 7 else "Silver" if total_streak < 30 else "Gold",
        }

    def _milestones(self, savings: float, income: float, health_score: dict) -> List[dict]:
        score = health_score.get("overall_score", 0)
        return [
            {
                "id": "first_upload",
                "title": "Statement uploaded",
                "icon": "📁",
                "achieved": True,
                "points": 50,
                "description": "You took the first step!",
            },
            {
                "id": "score_50",
                "title": "Health score 50+",
                "icon": "❤️",
                "achieved": score >= 50,
                "points": 100,
                "description": "Reach a financial health score of 50",
            },
            {
                "id": "score_75",
                "title": "Health score 75+",
                "icon": "⭐",
                "achieved": score >= 75,
                "points": 200,
                "description": "Reach a financial health score of 75",
            },
            {
                "id": "savings_20",
                "title": "Saving 20% of income",
                "icon": "💰",
                "achieved": savings / income >= 0.20,
                "points": 150,
                "description": "Save at least 20% of your monthly income",
            },
            {
                "id": "no_waste",
                "title": "Zero waste month",
                "icon": "🌱",
                "achieved": False,  # Needs historical data
                "points": 300,
                "description": "A month with no identified waste",
            },
        ]

    def _weekly_digest(self, transactions: List[dict], currency: str) -> dict:
        debits  = [t for t in transactions if t.get("type") == "debit"]
        spend   = sum(t["amount"] for t in debits)
        credits = [t for t in transactions if t.get("type") == "credit"]
        income  = sum(t["amount"] for t in credits)

        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category", "other")] += t["amount"]

        top_cat   = max(cat_spend, key=cat_spend.get) if cat_spend else "other"
        num_tx    = len(debits)
        avg_daily = spend / 30

        return {
            "title": "Your weekly money digest",
            "total_spend": round(spend, 2),
            "avg_daily_spend": round(avg_daily, 2),
            "top_category": top_cat,
            "top_category_amount": round(cat_spend.get(top_cat, 0), 2),
            "transaction_count": num_tx,
            "savings_this_period": round(max(0, income - spend), 2),
            "currency": currency,
            "highlights": [
                f"You made {num_tx} transactions this month",
                f"Your biggest spend category is {top_cat} at {currency} {cat_spend.get(top_cat, 0):.0f}",
                f"Daily average spend: {currency} {avg_daily:.0f}",
            ],
        }

    def _bill_calendar(self, transactions: List[dict]) -> List[dict]:
        """Predict upcoming bills from recurring patterns."""
        from collections import Counter
        debits = [t for t in transactions if t.get("type") == "debit"]

        # Group by merchant, find those that appear monthly
        merchant_dates = defaultdict(list)
        for t in debits:
            try:
                d = datetime.strptime(t["date"], "%Y-%m-%d")
                merchant_dates[t.get("merchant","")].append(d)
            except Exception:
                pass

        calendar = []
        today    = datetime.now()
        for merchant, dates in merchant_dates.items():
            if len(dates) >= 2:
                # Estimate next date
                dates.sort()
                gaps = [(dates[i+1]-dates[i]).days for i in range(len(dates)-1)]
                avg_gap = sum(gaps) / len(gaps) if gaps else 30

                if 25 <= avg_gap <= 35:  # Monthly
                    last_date = dates[-1]
                    next_date = last_date + timedelta(days=int(avg_gap))
                    days_away = (next_date - today).days

                    # Get the typical amount
                    amounts = [t["amount"] for t in debits if t.get("merchant") == merchant]
                    avg_amount = sum(amounts) / len(amounts) if amounts else 0

                    if -5 <= days_away <= 35:
                        calendar.append({
                            "merchant":  merchant,
                            "due_date":  next_date.strftime("%Y-%m-%d"),
                            "days_away": days_away,
                            "amount":    round(avg_amount, 2),
                            "status":    "overdue" if days_away < 0 else "due_soon" if days_away <= 7 else "upcoming",
                        })

        return sorted(calendar, key=lambda b: b["days_away"])[:10]

    def _challenges(self, transactions: List[dict], currency: str) -> List[dict]:
        debits = [t for t in transactions if t.get("type") == "debit"]
        cat_spend = defaultdict(float)
        for t in debits:
            cat_spend[t.get("category","other")] += t["amount"]

        challenges = [
            {
                "id": "no_dining_week",
                "title": "No-delivery week 🍳",
                "description": "Cook every meal this week. No food delivery or restaurants.",
                "duration": "7 days",
                "reward": f"Save {currency} {round(cat_spend.get('dining',0)*0.25,0)}",
                "difficulty": "medium",
                "active": False,
            },
            {
                "id": "no_spend_weekend",
                "title": "No-spend weekend 🚫",
                "description": "Zero non-essential spending Saturday and Sunday.",
                "duration": "2 days",
                "reward": f"Save {currency} {round(cat_spend.get('entertainment',0)*0.5,0)+50}",
                "difficulty": "easy",
                "active": False,
            },
            {
                "id": "cancel_one_sub",
                "title": "Cut one subscription ✂️",
                "description": "Cancel one subscription you haven't used this month.",
                "duration": "today",
                "reward": "Recurring monthly savings",
                "difficulty": "easy",
                "active": False,
            },
            {
                "id": "savings_challenge",
                "title": "52-week challenge 💪",
                "description": "Save Week 1: 10, Week 2: 20... increasing each week.",
                "duration": "52 weeks",
                "reward": f"{currency} 13,780 at year end",
                "difficulty": "hard",
                "active": False,
            },
        ]
        return challenges

    def _score_trend(self, health_score: dict, previous_report: dict | None) -> dict:
        current_score = health_score.get("overall_score", 0)
        if not previous_report:
            return {
                "current": current_score,
                "previous": None,
                "change": 0,
                "trend": "new",
                "message": "First report — track your progress next month!",
            }
        prev_hs    = previous_report.get("report",{}).get("health_score",{})
        prev_score = prev_hs.get("overall_score", current_score)
        change     = current_score - prev_score
        return {
            "current":  current_score,
            "previous": prev_score,
            "change":   change,
            "trend":    "up" if change > 2 else "down" if change < -2 else "stable",
            "message":  f"Score {'improved' if change>0 else 'declined'} by {abs(change)} points vs last month" if change != 0 else "Score stable vs last month",
        }

    def _report_card(self, health_score: dict, savings: float, income: float, currency: str) -> dict:
        score = health_score.get("overall_score", 0)
        grade = health_score.get("grade", "C")
        subs  = health_score.get("sub_scores", {})
        return {
            "grade":        grade,
            "overall":      score,
            "savings_rate": round(savings / income * 100, 1) if income else 0,
            "letter_grades": {
                "spending":    self._letter(subs.get("spending_discipline",{}).get("score",0), 15),
                "savings":     self._letter(subs.get("savings_rate",{}).get("score",0), 15),
                "debt":        self._letter(subs.get("debt_health",{}).get("score",0), 15),
                "subscriptions": self._letter(subs.get("subscription_efficiency",{}).get("score",0), 15),
                "emergency":   self._letter(subs.get("emergency_fund",{}).get("score",0), 15),
                "stability":   self._letter(subs.get("income_stability",{}).get("score",0), 10),
                "investing":   self._letter(subs.get("investment_readiness",{}).get("score",0), 15),
            },
            "currency": currency,
        }

    def _letter(self, score: float, max_score: float) -> str:
        pct = score / max_score if max_score else 0
        if pct >= 0.90: return "A+"
        if pct >= 0.80: return "A"
        if pct >= 0.70: return "B"
        if pct >= 0.60: return "C"
        if pct >= 0.40: return "D"
        return "F"
