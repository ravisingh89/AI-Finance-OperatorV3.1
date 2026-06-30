"""
Tests for parsers and agents.
Run: pytest tests/ -v
All tests that involve GroqService mock it out — no real API key needed.
"""
import pytest
from unittest.mock import patch, MagicMock

# ── Shared mock for GroqService ───────────────────────────────────────────────
def make_groq_mock(json_return: dict):
    mock = MagicMock()
    mock.extract_json.return_value = json_return
    mock.complete.return_value = str(json_return)
    return mock

# ── Sample data ──────────────────────────────────────────────────────────────
SAMPLE_CSV = b"""date,description,amount,type
2024-01-05,Carrefour Supermarket,245.50,debit
2024-01-06,Netflix,55.00,debit
2024-01-07,Uber Trip,32.00,debit
2024-01-10,Salary Credit,15000.00,credit
2024-01-12,DEWA Bill,380.00,debit
2024-01-15,Zomato Order,89.00,debit
2024-01-18,Netflix,55.00,debit
2024-01-20,Carrefour Supermarket,189.00,debit
2024-02-06,Netflix,55.00,debit
"""

SAMPLE_TRANSACTIONS = [
    {"date": "2024-01-05", "merchant": "Carrefour Supermarket", "amount": 245.50, "currency": "AED", "type": "debit", "description": ""},
    {"date": "2024-01-06", "merchant": "Netflix",   "amount": 55.0,   "currency": "AED", "type": "debit",  "description": ""},
    {"date": "2024-01-07", "merchant": "Uber Trip", "amount": 32.0,   "currency": "AED", "type": "debit",  "description": ""},
    {"date": "2024-01-10", "merchant": "Salary",    "amount": 15000,  "currency": "AED", "type": "credit", "description": ""},
    {"date": "2024-01-12", "merchant": "DEWA Bill", "amount": 380.0,  "currency": "AED", "type": "debit",  "description": ""},
    {"date": "2024-01-15", "merchant": "Zomato",    "amount": 89.0,   "currency": "AED", "type": "debit",  "description": ""},
    {"date": "2024-02-06", "merchant": "Netflix",   "amount": 55.0,   "currency": "AED", "type": "debit",  "description": ""},
]

# ── Parser tests ─────────────────────────────────────────────────────────────

def test_csv_parser_basic():
    from app.parsers.csv_parser import CSVParser
    result = CSVParser().parse(SAMPLE_CSV, currency="AED")
    assert len(result.transactions) > 0
    for tx in result.transactions:
        assert tx.amount > 0
        assert tx.type in ("debit", "credit")
        assert tx.currency == "AED"

def test_csv_parser_detects_credit():
    from app.parsers.csv_parser import CSVParser
    result = CSVParser().parse(SAMPLE_CSV, currency="AED")
    credits = [t for t in result.transactions if t.type == "credit"]
    assert len(credits) >= 1

def test_csv_parser_india():
    from app.parsers.csv_parser import CSVParser
    india_csv = b"Date,Narration,Debit,Credit\n01-01-2024,Swiggy Order,850,,\n10-01-2024,Salary NEFT,,95000\n"
    result = CSVParser().parse(india_csv, currency="INR")
    assert len(result.transactions) > 0

# ── Expense classifier tests ─────────────────────────────────────────────────

def test_expense_classifier_rule_based():
    """Rule-based path - no LLM call needed."""
    with patch("app.agents.expense_classifier.GroqService", return_value=MagicMock()):
        from app.agents.expense_classifier import ExpenseClassifierAgent
        agent = ExpenseClassifierAgent(region="UAE")
        tx = {"merchant": "Carrefour Supermarket", "amount": 100, "currency": "AED", "type": "debit", "description": ""}
        result = agent.run([tx])
    assert result[0]["category"] == "groceries"
    assert result[0]["confidence"] >= 0.9

def test_expense_classifier_netflix():
    with patch("app.agents.expense_classifier.GroqService", return_value=MagicMock()):
        from app.agents.expense_classifier import ExpenseClassifierAgent
        agent = ExpenseClassifierAgent(region="UAE")
        tx = {"merchant": "Netflix", "amount": 55, "currency": "AED", "type": "debit", "description": ""}
        result = agent.run([tx])
    assert result[0]["category"] == "subscriptions"

def test_expense_classifier_uber():
    with patch("app.agents.expense_classifier.GroqService", return_value=MagicMock()):
        from app.agents.expense_classifier import ExpenseClassifierAgent
        agent = ExpenseClassifierAgent(region="UAE")
        tx = {"merchant": "Uber", "amount": 32, "currency": "AED", "type": "debit", "description": ""}
        result = agent.run([tx])
    assert result[0]["category"] == "transport"

def test_expense_classifier_dewa():
    with patch("app.agents.expense_classifier.GroqService", return_value=MagicMock()):
        from app.agents.expense_classifier import ExpenseClassifierAgent
        agent = ExpenseClassifierAgent(region="UAE")
        tx = {"merchant": "DEWA Bill", "amount": 380, "currency": "AED", "type": "debit", "description": ""}
        result = agent.run([tx])
    assert result[0]["category"] == "utilities"

# ── Subscription detector tests ───────────────────────────────────────────────

def test_subscription_detector_finds_netflix():
    from app.agents.subscription_detector import SubscriptionDetectorAgent
    classified = [
        {**t, "category": "subscriptions" if t["merchant"] == "Netflix" else "transport"}
        for t in SAMPLE_TRANSACTIONS
    ]
    result = SubscriptionDetectorAgent().run(classified)
    merchants = [s["merchant"] for s in result]
    assert any("Netflix" in m for m in merchants)

def test_subscription_monthly_frequency():
    from app.agents.subscription_detector import SubscriptionDetectorAgent
    txs = [
        {"date": "2024-01-06", "merchant": "Netflix", "amount": 55.0, "currency": "AED", "type": "debit", "category": "subscriptions", "description": ""},
        {"date": "2024-02-06", "merchant": "Netflix", "amount": 55.0, "currency": "AED", "type": "debit", "category": "subscriptions", "description": ""},
    ]
    result = SubscriptionDetectorAgent().run(txs)
    assert len(result) >= 1
    assert result[0]["frequency"] == "monthly"

# ── Waste detector tests ──────────────────────────────────────────────────────

def test_waste_detector_empty():
    from app.agents.waste_detector import WasteDetectorAgent
    result = WasteDetectorAgent(currency="AED").run([], [])
    assert isinstance(result, list)

def test_waste_detector_excess_dining():
    from app.agents.waste_detector import WasteDetectorAgent
    txs = [
        {"merchant": "Zomato",    "amount": 500, "currency": "AED", "type": "debit", "category": "dining"},
        {"merchant": "Deliveroo", "amount": 400, "currency": "AED", "type": "debit", "category": "dining"},
        {"merchant": "Carrefour", "amount": 200, "currency": "AED", "type": "debit", "category": "groceries"},
    ]
    result = WasteDetectorAgent(currency="AED").run(txs, [])
    assert any(w["waste_type"] == "excessive_dining" for w in result)

def test_waste_detector_atm():
    from app.agents.waste_detector import WasteDetectorAgent
    txs = [
        {"merchant": "ATM Withdrawal", "amount": 1000, "currency": "AED", "type": "debit", "category": "other"},
        {"merchant": "Carrefour",       "amount": 200,  "currency": "AED", "type": "debit", "category": "groceries"},
    ]
    result = WasteDetectorAgent(currency="AED").run(txs, [])
    assert any(w["waste_type"] == "excess_cash_withdrawals" for w in result)

# ── Budget planner tests ──────────────────────────────────────────────────────

def test_budget_planner_fallback():
    mock_groq = make_groq_mock({})  # simulate LLM failure → fallback kicks in
    mock_groq.extract_json.side_effect = Exception("LLM unavailable")

    with patch("app.agents.budget_planner.GroqService", return_value=mock_groq):
        from app.agents.budget_planner import BudgetPlannerAgent
        from collections import defaultdict
        agent = BudgetPlannerAgent(region="UAE", currency="AED")
        result = agent._fallback_budget(15000, defaultdict(float, {"groceries": 500, "dining": 300}))

    assert "recommended_budget" in result
    assert result["monthly_target_savings"] == pytest.approx(3000, rel=0.01)
    assert result["emergency_fund_target"] == pytest.approx(90000, rel=0.01)

def test_budget_planner_structure():
    mock_groq = make_groq_mock({
        "framework": "50/30/20",
        "recommended_budget": {"needs": {"rent": 7500}, "wants": {"dining": 4500}, "savings": {"investments": 3000}},
        "monthly_target_savings": 3000,
        "emergency_fund_target": 90000,
        "insights": ["Save more!"]
    })
    with patch("app.agents.budget_planner.GroqService", return_value=mock_groq):
        from app.agents.budget_planner import BudgetPlannerAgent
        agent = BudgetPlannerAgent(region="UAE", currency="AED")
        result = agent.run(SAMPLE_TRANSACTIONS)
    assert "recommended_budget" in result

# ── Debt optimizer tests ──────────────────────────────────────────────────────

def test_debt_optimizer_no_debt():
    from app.agents.debt_optimizer import DebtOptimizerAgent
    result = DebtOptimizerAgent(currency="AED").run([])
    assert result["detected_debts"] == []

def test_debt_optimizer_payoff_math():
    from app.agents.debt_optimizer import DebtOptimizerAgent
    agent = DebtOptimizerAgent(currency="AED")
    months, interest = agent._payoff_months(10000, 500, 0.36)
    assert months > 0
    assert interest > 0
    assert months < 360

def test_debt_optimizer_detects_card():
    from app.agents.debt_optimizer import DebtOptimizerAgent
    txs = [
        {"merchant": "ADCB Credit Card", "amount": 800, "currency": "AED", "type": "debit", "category": "debt"},
        {"merchant": "ADCB Credit Card", "amount": 800, "currency": "AED", "type": "debit", "category": "debt"},
    ]
    result = DebtOptimizerAgent(currency="AED").run(txs)
    assert len(result["detected_debts"]) > 0
    assert result["recommended_strategy"] == "avalanche"

# ── Savings coach tests ───────────────────────────────────────────────────────

def test_savings_coach_fallback():
    mock_groq = make_groq_mock({})
    mock_groq.extract_json.side_effect = Exception("LLM unavailable")
    with patch("app.agents.savings_coach.GroqService", return_value=mock_groq):
        from app.agents.savings_coach import SavingsCoachAgent
        agent = SavingsCoachAgent(region="UAE", currency="AED")
        result = agent.run(SAMPLE_TRANSACTIONS, [], {})
    assert "opportunities" in result
    assert "investment_recommendations" in result
    assert result["projected_annual_savings"] > 0

# ── Orchestrator integration ──────────────────────────────────────────────────

def test_orchestrator_full_pipeline():
    classifier_result = {"results": [{"category": "groceries", "confidence": 0.9, "reason": "test"}]}
    budget_result = {
        "framework": "50/30/20",
        "recommended_budget": {"needs": {}, "wants": {}, "savings": {}},
        "monthly_target_savings": 3000,
        "emergency_fund_target": 90000,
        "insights": []
    }
    savings_result = {
        "current_savings_rate": 10,
        "target_savings_rate": 20,
        "opportunities": [],
        "investment_recommendations": [],
        "projected_annual_savings": 15000,
        "emergency_fund_months": 90000
    }

    mock_groq = MagicMock()
    mock_groq.extract_json.side_effect = [
        classifier_result,  # expense classifier batch
        budget_result,      # budget planner
        savings_result,     # savings coach
    ]
    mock_groq.complete.return_value = "Test narrative text."

    # Goal planner / savings forecast / goal actions use their own extract_json
    # calls with different expected shapes — give them a separate mock that
    # returns sensible fallback-safe data via side_effect-free default behavior
    # (their internal fallback logic kicks in on any unexpected/empty response).
    goal_mock = MagicMock()
    goal_mock.extract_json.return_value = {
        "goals": [], "monthly_free_cash": 0, "recommended_allocation": {},
    }
    goal_mock.complete.return_value = "Test narrative."

    actions_mock = MagicMock()
    actions_mock.extract_json.return_value = {
        "actions": [], "weekly_challenge": {"title": "t", "description": "t", "reward": "t"},
    }

    with patch("app.agents.expense_classifier.GroqService", return_value=mock_groq), \
         patch("app.agents.budget_planner.GroqService",     return_value=mock_groq), \
         patch("app.agents.savings_coach.GroqService",      return_value=mock_groq), \
         patch("app.agents.goal_planner.GroqService",       return_value=goal_mock), \
         patch("app.agents.savings_forecast.GroqService",   return_value=goal_mock), \
         patch("app.agents.goal_actions.GroqService",       return_value=actions_mock):
        from app.agents.orchestrator import run_pipeline
        result = run_pipeline(SAMPLE_TRANSACTIONS, region="UAE", currency="AED")

    assert "summary" in result
    assert "classified_transactions" in result
    assert "subscriptions" in result
    assert "waste_items" in result
    assert "budget_plan" in result
    assert "debt_plan" in result
    assert "savings_plan" in result
    assert "health_score" in result
    assert "goals" in result
    assert "savings_forecast" in result
    assert "smart_alerts" in result
    assert "spending_behaviour" in result
    assert "goal_actions" in result
    assert "retention" in result
    assert result["summary"]["total_spend"] > 0
    assert result["summary"]["total_income"] > 0
    assert 0 <= result["summary"]["waste_score"] <= 100
    assert 0 <= result["summary"]["savings_score"] <= 100
    assert len(result["health_score"]["sub_scores"]) == 7, "Health score should have all 7 dimensions"
    assert "strategies" in result["debt_plan"] or result["debt_plan"]["recommended_strategy"] == "none"


def test_orchestrator_real_streak_passthrough():
    """real_streak param should flow through to the retention output, not be re-derived."""
    mock_groq = MagicMock()
    mock_groq.extract_json.return_value = {"results": [{"category": "other", "confidence": 0.7, "reason": "t"}]}
    mock_groq.complete.return_value = "narrative"

    fixed_streak = {"current_streak": 12, "best_streak": 20, "last_active_date": "2025-01-01"}

    with patch("app.agents.expense_classifier.GroqService", return_value=mock_groq), \
         patch("app.agents.budget_planner.GroqService",     return_value=mock_groq), \
         patch("app.agents.savings_coach.GroqService",      return_value=mock_groq), \
         patch("app.agents.goal_planner.GroqService",       return_value=mock_groq), \
         patch("app.agents.savings_forecast.GroqService",   return_value=mock_groq), \
         patch("app.agents.goal_actions.GroqService",       return_value=mock_groq):
        from app.agents.orchestrator import run_pipeline
        result = run_pipeline(SAMPLE_TRANSACTIONS, region="UAE", currency="AED", real_streak=fixed_streak)

    assert result["retention"]["streak"]["current_streak"] == 12
    assert result["retention"]["streak"]["best_streak"] == 20
