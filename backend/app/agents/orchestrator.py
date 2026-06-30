"""
Full 14-agent pipeline orchestrator.
"""
from typing import List
from collections import defaultdict
from app.agents.expense_classifier        import ExpenseClassifierAgent
from app.agents.subscription_detector     import SubscriptionDetectorAgent
from app.agents.subscription_intelligence import SubscriptionIntelligenceAgent
from app.agents.waste_detector            import WasteDetectorAgent
from app.agents.budget_planner            import BudgetPlannerAgent
from app.agents.debt_optimizer            import DebtOptimizerAgent
from app.agents.savings_coach             import SavingsCoachAgent
from app.agents.health_score              import HealthScoreAgent
from app.agents.goal_planner              import GoalPlannerAgent
from app.agents.savings_forecast          import SavingsForecastAgent
from app.agents.smart_alerts              import SmartAlertsAgent
from app.agents.spending_behaviour        import SpendingBehaviourAgent
from app.agents.goal_actions              import GoalActionsAgent
from app.agents.retention                 import RetentionEngine


def run_pipeline(transactions: List[dict], region: str = "UAE",
                 currency: str = "AED", previous_report: dict = None,
                 real_streak: dict = None) -> dict:
    print(f"[PIPELINE] {len(transactions)} txs | {region} | {currency}")

    classified    = ExpenseClassifierAgent(region=region).run(transactions)
    subscriptions = SubscriptionDetectorAgent().run(classified)
    sub_intel     = SubscriptionIntelligenceAgent().run(classified, subscriptions, currency)
    waste_items   = WasteDetectorAgent(currency=currency).run(classified, subscriptions)
    budget_plan   = BudgetPlannerAgent(region=region, currency=currency).run(classified)
    debt_plan     = DebtOptimizerAgent(currency=currency).run(classified)
    savings_plan  = SavingsCoachAgent(region=region, currency=currency).run(classified, waste_items, budget_plan)
    health_score  = HealthScoreAgent().run(classified, subscriptions, waste_items, currency)
    goals         = GoalPlannerAgent(region=region, currency=currency).run(classified)
    forecast      = SavingsForecastAgent(region=region, currency=currency).run(classified, waste_items, savings_plan)
    alerts        = SmartAlertsAgent().run(classified, sub_intel.get("subscriptions",[]), waste_items, budget_plan, health_score, currency)
    behaviour     = SpendingBehaviourAgent().run(classified, currency)
    actions       = GoalActionsAgent(region=region, currency=currency).run(classified, waste_items, goals, sub_intel.get("subscriptions",[]))
    retention     = RetentionEngine().run(classified, health_score, previous_report, currency, real_streak)

    debits  = [t for t in classified if t.get("type") == "debit"]
    credits = [t for t in classified if t.get("type") == "credit"]
    total_spend  = sum(t["amount"] for t in debits)
    total_income = sum(t["amount"] for t in credits)

    cat_breakdown = defaultdict(float)
    for t in debits:
        cat_breakdown[t.get("category","other")] += t["amount"]

    # Month-over-month comparison
    report_comparison = None
    if previous_report:
        from app.db.database import compare_reports
        current_stub = {"report":{"summary":{"total_spend":total_spend,"total_income":total_income,
                        "net_savings":max(0,total_income-total_spend),"currency":currency},
                        "health_score":health_score}}
        report_comparison = compare_reports(current_stub, previous_report)

    print(f"[PIPELINE] Done. Score:{health_score['overall_score']} Alerts:{len(alerts)}")

    return {
        "summary": {
            "total_income":  round(total_income, 2),
            "total_spend":   round(total_spend, 2),
            "net_savings":   round(max(0, total_income - total_spend), 2),
            "waste_score":   health_score["sub_scores"]["subscription_efficiency"]["score"] * 6,
            "savings_score": min(100, int(max(0,total_income-total_spend)/max(total_income,1)*300)),
            "currency":      currency,
            "region":        region,
        },
        "category_breakdown":        {k: round(v,2) for k,v in cat_breakdown.items()},
        "classified_transactions":   classified,
        "subscriptions":             subscriptions,
        "subscription_intelligence": sub_intel,
        "waste_items":               waste_items,
        "budget_plan":               budget_plan,
        "debt_plan":                 debt_plan,
        "savings_plan":              savings_plan,
        "health_score":              health_score,
        "goals":                     goals,
        "savings_forecast":          forecast,
        "smart_alerts":              alerts,
        "spending_behaviour":        behaviour,
        "goal_actions":              actions,
        "retention":                 retention,
        "report_comparison":         report_comparison,
    }
