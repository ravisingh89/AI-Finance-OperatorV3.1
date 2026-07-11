/**
 * report-helpers.ts — The Contract Layer.
 *
 * Every page imports from here, never from raw report fields.
 * These helpers guarantee:
 *   - No TypeScript errors (no unsafe property access)
 *   - No runtime crashes (every optional field has a fallback)
 *   - No LLM shape surprises reaching the UI
 *
 * Pattern:
 *   const hs = getHealthScore(report)   // always a NormalisedHealthScore
 *   hs.score        → number (0 if missing)
 *   hs.radarData    → array ([] if missing)
 *   hs.subScores    → array of NormalisedSubScore ([] if missing)
 */

import type {
  FinancialReport, HealthScore, DebtPlan, SmartAlert,
  SpendingBehaviour, GoalActions, Retention, StreakData,
  SubIntelligence, SavingsForecast, GoalPlan, WasteItem,
  Transaction,
  AnomalyReport, InvestmentPlans, MarketTrends,
} from "./api";

// ── Normalised shapes (what pages actually consume) ───────────────────────────

export interface NormalisedHealthScore {
  score:        number;
  grade:        string;
  label:        string;
  color:        string;
  currency:     string;
  subScores:    NormalisedSubScore[];
  radarData:    Array<{ subject: string; score: number; full: number }>;
  income:       number;
  spend:        number;
  savings:      number;
  savingsRate:  number;
  debtRatio:    number;
  spendRatio:   number;
  investRatio:  number;
  insights:     Array<{ type: string; msg: string }>;
  suggestions:  Array<{ subscore: string; gap: number; tip: string }>;
}

export interface NormalisedSubScore {
  key:   string;
  label: string;
  icon:  string;
  score: number;
  max:   number;
}

export interface NormalisedDebtPlan {
  strategy:       string;
  reason:         string;
  debts:          Array<{ type: string; balance: number; monthly: number; rate: number }>;
  strategies:     Record<string, NormalisedDebtStrategy>;
  hasDebts:       boolean;
  totalMonths:    number;
  interestSaved:  number;
}

export interface NormalisedDebtStrategy {
  name:          string;
  description:   string;
  bestFor:       string;
  payoffPlan:    Array<{ debtType: string; months: number; interest: number; priority?: string }>;
  totalInterest: number;
  totalMonths:   number;
  saved:         number;
}

export interface NormalisedWasteItem {
  type:           string;
  merchant:       string;
  severity:       "low" | "medium" | "high";
  monthlyLoss:    number;
  recommendation: string;
}

// ── Health Score ──────────────────────────────────────────────────────────────
export function getHealthScore(report: FinancialReport | null): NormalisedHealthScore {
  const hs: HealthScore | undefined = report?.health_score;
  const m = hs?.metrics;

  const subScores: NormalisedSubScore[] = Object.entries(hs?.sub_scores ?? {}).map(([key, ss]) => ({
    key,
    label: ss.label ?? key,
    icon:  ss.icon  ?? "📊",
    score: ss.score ?? 0,
    max:   ss.max   ?? 100,
  }));

  return {
    score:       hs?.overall_score  ?? 0,
    grade:       hs?.grade          ?? "—",
    label:       hs?.label          ?? "—",
    color:       hs?.color          ?? "#10B981",
    currency:    hs?.currency       ?? report?.summary.currency ?? "AED",
    subScores,
    radarData:   hs?.radar_data     ?? [],
    income:      m?.income          ?? 0,
    spend:       m?.spend           ?? 0,
    savings:     m?.savings         ?? 0,
    savingsRate: m?.savings_rate    ?? 0,
    debtRatio:   m?.debt_ratio      ?? 0,
    spendRatio:  m?.spending_ratio  ?? 0,
    investRatio: m?.investment_ratio ?? 0,
    insights:    hs?.insights       ?? [],
    suggestions: hs?.suggestions    ?? [],
  };
}

// ── Debt Plan ─────────────────────────────────────────────────────────────────
export function getDebtPlan(report: FinancialReport | null): NormalisedDebtPlan {
  const dp: DebtPlan | undefined = report?.debt_plan;

  const debts = (dp?.detected_debts ?? []).map(d => ({
    type:    d.type ?? "unknown",
    balance: d.estimated_balance ?? 0,
    monthly: d.monthly_payment   ?? 0,
    rate:    d.interest_rate      ?? 0,
  }));

  const strategies: Record<string, NormalisedDebtStrategy> = {};
  for (const [key, s] of Object.entries(dp?.strategies ?? {})) {
    strategies[key] = {
      name:          s.name        ?? key,
      description:   s.description ?? "",
      bestFor:       s.best_for    ?? "",
      totalInterest: s.total_interest ?? 0,
      totalMonths:   s.total_months   ?? 0,
      saved:         s.interest_saved_vs_minimum ?? 0,
      payoffPlan: (s.payoff_plan ?? []).map(p => ({
        debtType: p.debt_type ?? "",
        months:   p.payoff_months  ?? 0,
        interest: p.total_interest ?? 0,
        priority: p.priority,
      })),
    };
  }

  return {
    strategy:      dp?.recommended_strategy      ?? "none",
    reason:        dp?.strategy_reason           ?? "",
    debts,
    strategies,
    hasDebts:      debts.length > 0,
    totalMonths:   dp?.total_payoff_months       ?? 0,
    interestSaved: dp?.interest_saved_vs_minimum ?? 0,
  };
}

// ── Waste Items ───────────────────────────────────────────────────────────────
export function getWasteItems(report: FinancialReport | null): NormalisedWasteItem[] {
  return (report?.waste_items ?? []).map((w: WasteItem) => ({
    type:           w.waste_type    ?? "other",
    merchant:       w.merchant      ?? "",
    severity:       w.severity      ?? "low",
    monthlyLoss:    w.monthly_loss  ?? 0,
    recommendation: w.recommendation ?? "",
  }));
}

// ── Smart Alerts ──────────────────────────────────────────────────────────────
export function getAlerts(report: FinancialReport | null): SmartAlert[] {
  return report?.smart_alerts ?? [];
}

export function getCriticalAlerts(report: FinancialReport | null): SmartAlert[] {
  return getAlerts(report).filter(a => a.severity === "high");
}

// ── Streak ────────────────────────────────────────────────────────────────────
export function getStreak(report: FinancialReport | null): StreakData {
  return report?.retention?.streak ?? {
    current_streak: 0, best_streak: 0, streak_label: "",
    next_milestone: 7, points_today: 0, level: "Bronze",
  };
}

// ── Spending Behaviour ────────────────────────────────────────────────────────
export function getBehaviour(report: FinancialReport | null): SpendingBehaviour {
  return report?.spending_behaviour ?? {
    currency: report?.summary.currency ?? "AED",
    behaviour_score: 0, heatmap_dow: [], weekly_trend: [],
    category_heatmap: {}, patterns: [], top_merchants: [],
    total_transactions: 0, avg_transaction: 0,
  };
}

// ── Goal Actions ──────────────────────────────────────────────────────────────
export function getGoalActions(report: FinancialReport | null): GoalActions {
  return report?.goal_actions ?? {
    actions: [],
    weekly_challenge: { title: "", description: "", reward: "" },
  };
}

// ── Retention ─────────────────────────────────────────────────────────────────
export function getRetention(report: FinancialReport | null): Retention {
  return report?.retention ?? {
    streak: { current_streak: 0, best_streak: 0, streak_label: "", next_milestone: 7, points_today: 0, level: "Bronze" },
    milestones: [], weekly_digest: {
      title: "Weekly digest", total_spend: 0, avg_daily_spend: 0,
      top_category: "", top_category_amount: 0, transaction_count: 0,
      savings_this_period: 0, currency: "AED", highlights: [],
    },
    bill_calendar: [], challenges: [],
    score_trend: { current: 0, previous: null, change: 0, trend: "new", message: "First report" },
    report_card: { grade: "—", overall: 0, savings_rate: 0, letter_grades: {}, currency: "AED" },
  };
}

// ── Subscription Intelligence ─────────────────────────────────────────────────
export function getSubIntel(report: FinancialReport | null): SubIntelligence {
  return report?.subscription_intelligence ?? {
    subscriptions: [], total_monthly: 0, total_annual: 0, active_count: 0,
    potential_saving: 0, to_cancel_count: 0, to_switch_count: 0,
    overlap_warning: null, currency: report?.summary.currency ?? "AED",
  };
}

// ── Savings Forecast ──────────────────────────────────────────────────────────
export function getForecast(report: FinancialReport | null): SavingsForecast {
  return report?.savings_forecast ?? {
    currency: report?.summary.currency ?? "AED",
    monthly_income: 0, current_monthly_savings: 0, current_savings_rate: 0,
    monthly_waste: 0, scenarios: { current: 0, optimised: 0, aggressive: 0 },
    projections: {}, milestones: [], narrative: "", investment_products: [],
  };
}

// ── Goal Plan ─────────────────────────────────────────────────────────────────
export function getGoalPlan(report: FinancialReport | null): GoalPlan {
  return report?.goals ?? { goals: [], monthly_free_cash: 0, recommended_allocation: {} };
}

// ── Transactions ──────────────────────────────────────────────────────────────
export function getTransactions(report: FinancialReport | null): Transaction[] {
  return report?.classified_transactions ?? [];
}

// ── Category Breakdown ────────────────────────────────────────────────────────
export function getCategoryBreakdown(report: FinancialReport | null): Record<string, number> {
  return report?.category_breakdown ?? {};
}

// ── Currency ──────────────────────────────────────────────────────────────────
export function getCurrency(report: FinancialReport | null): string {
  return report?.summary.currency ?? "AED";
}


// ── Phase 4 helpers ───────────────────────────────────────────────────────────

export function getAnomalies(report: FinancialReport | null): AnomalyReport {
  return report?.anomalies ?? {
    anomalies: [], anomaly_count: 0, critical_count: 0, total_at_risk: 0,
  };
}

export function getInvestmentPlans(report: FinancialReport | null): InvestmentPlans {
  return report?.investment_plans ?? {
    risk_profiles: ["conservative", "moderate", "aggressive"],
    plans: {}, disclaimer: "", currency: report?.summary.currency ?? "AED",
  };
}

export function getMarketTrends(report: FinancialReport | null): MarketTrends {
  return report?.market_trends ?? {
    last_updated: "", currency: report?.summary.currency ?? "AED",
    sections: [], global_disclaimer: "",
  };
}
