/**
 * api.ts — Single source of truth for the API contract.
 *
 * Architecture (3 layers):
 *   1. AI Layer  → backend agents return dynamic shapes
 *   2. Contract  → lib/report-helpers.ts normalises everything safely
 *   3. UI Layer  → pages consume normalised data, never raw report fields
 *
 * Rule: FinancialReport fields are optional except `summary`.
 * Pages MUST use helpers from lib/report-helpers.ts, not raw report access.
 * The [key: string]: unknown index signature ensures future backend fields
 * never break the TypeScript build.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Core request ──────────────────────────────────────────────────────────────
async function req<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

// ── API methods ───────────────────────────────────────────────────────────────
export const api = {
  upload: async (file: File, currency: string, region: string, token: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("currency", currency);
    form.append("region", region);
    return req<{ statement_id: string; status: string }>(
      "/api/v1/statements/upload", token, { method: "POST", body: form }
    );
  },
  status:          (id: string, t: string) => req<{ status: string }>(`/api/v1/statements/${id}/status`, t),
  report:          (t: string) => req<{ report: FinancialReport }>("/api/v1/reports/latest", t),
  history:         (t: string) => req<{ reports: HistoryEntry[] }>("/api/v1/reports/history", t),
  compare:         (t: string) => req<{ comparison: ReportComparison }>("/api/v1/reports/compare", t),
  chat:            (message: string, history: ChatMessage[], t: string) =>
    req<{ reply: string; suggestions: string[]; user_profile: string; memory_updated: boolean }>(
      "/api/v1/copilot/chat", t, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      }
    ),
  suggestions:     (t: string) => req<{ suggestions: string[] }>("/api/v1/copilot/suggestions", t),
  getGoals:        (t: string) => req<{ goals: GoalPlan }>("/api/v1/goals", t),
  updateGoal:      (goal_id: string, progress: number, t: string) =>
    req<{ success: boolean }>("/api/v1/goals/progress", t, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_id, progress_percent: progress }),
    }),
  getActions:      (t: string) => req<{ goal_actions: GoalActions }>("/api/v1/actions", t),
  getRetention:    (t: string) => req<{ retention: Retention; streak: StreakData }>("/api/v1/retention", t),
  updateChallenge: (challenge_id: string, status: string, t: string) =>
    req<{ success: boolean }>("/api/v1/retention/challenge", t, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id, status }),
    }),
  // Phase 4
  checkAlerts:     (t: string) => req<{ new_critical: number; messages: string[] }>("/api/v1/alerts/check", t),
  getAnomalies:    (t: string) => req<{ anomalies: AnomalyReport | null }>("/api/v1/anomalies", t),
  getMarketTrends: (t: string) => req<{ market_trends: MarketTrends | null }>("/api/v1/market-trends", t),
  getInvestPlans:  (t: string) => req<{ investment_plans: InvestmentPlans | null }>("/api/v1/investment-plans", t),
};

// ── FinancialReport — top-level shape ─────────────────────────────────────────
// summary is the ONLY always-present field (computed, not LLM-generated).
// Everything else is optional — phases add fields; old reports won't have them.
// Index signature [key:string]:unknown lets future backend fields pass through.
export interface FinancialReport {
  summary:                  ReportSummary;           // always present
  category_breakdown:       Record<string, number>;  // always present
  classified_transactions?: Transaction[];
  subscriptions?:           Subscription[];
  waste_items?:             WasteItem[];
  budget_plan?:             Record<string, unknown>;
  debt_plan?:               DebtPlan;
  savings_plan?:            Record<string, unknown>;
  subscription_intelligence?: SubIntelligence;
  health_score?:            HealthScore;
  goals?:                   GoalPlan;
  savings_forecast?:        SavingsForecast;
  smart_alerts?:            SmartAlert[];
  spending_behaviour?:      SpendingBehaviour;
  goal_actions?:            GoalActions;
  retention?:               Retention;
  report_comparison?:       ReportComparison | null;
  // Phase 4
  anomalies?:               AnomalyReport;
  investment_plans?:        InvestmentPlans;
  market_trends?:           MarketTrends;
  [key: string]:            unknown;  // safety valve for future fields
}

// ── ReportSummary — always present, strictly typed ───────────────────────────
export interface ReportSummary {
  total_income:  number;
  total_spend:   number;
  net_savings:   number;
  waste_score:   number;
  savings_score: number;
  currency:      string;
  region:        string;
}

// ── HealthScore — matches backend health_score.py output exactly ─────────────
// All fields present when health_score exists; the whole object is optional.
export interface HealthScore {
  overall_score:  number;
  grade:          string;
  label:          string;
  color:          string;
  currency:       string;
  sub_scores: Record<string, {
    score: number;
    max:   number;
    label: string;
    icon?: string;
  }>;
  radar_data: Array<{
    subject: string;
    score:   number;
    full:    number;
  }>;
  metrics: {
    income:           number;
    spend:            number;
    savings:          number;
    savings_rate:     number;
    debt_ratio:       number;
    spending_ratio:   number;
    investment_ratio: number;
  };
  insights:    Array<{ type: string; msg: string }>;
  suggestions: Array<{ subscore: string; gap: number; tip: string }>;
}

// ── DebtPlan — matches backend debt_optimizer.py output exactly ──────────────
export interface DebtPlan {
  recommended_strategy:       string;
  strategy_reason?:           string;
  detected_debts:             Array<{
    type:              string;
    estimated_balance: number;
    monthly_payment:   number;
    interest_rate:     number;
  }>;
  payoff_plan: Array<{
    debt_type:       string;
    payoff_months:   number;
    total_interest:  number;
    monthly_payment?: number;
    priority?:       string;
  }>;
  strategies?: Record<string, {
    name:          string;
    description:   string;
    best_for:      string;
    payoff_plan:   Array<{
      debt_type:       string;
      payoff_months:   number;
      total_interest:  number;
      monthly_payment?: number;
      priority?:       string;
    }>;
    total_interest:              number;
    total_months:                number;
    interest_saved_vs_minimum:   number;
  }>;
  interest_saved_vs_minimum:  number;
  total_payoff_months:        number;
}

// ── Remaining types ───────────────────────────────────────────────────────────
export interface ChatMessage { role: "user" | "assistant"; content: string; }

export interface Transaction {
  date: string; merchant: string; amount: number;
  currency: string; type: string; category: string;
}

export interface Subscription {
  merchant: string; frequency: string; amount: number;
  currency: string; active: boolean;
}

export interface WasteItem {
  waste_type: string; merchant: string;
  severity: "low" | "medium" | "high";
  monthly_loss: number; recommendation: string;
}

export interface EnrichedSub {
  merchant: string; category: string; icon: string; frequency: string;
  amount: number; monthly_cost: number; annual_cost: number; currency: string;
  usage_score: number; recommendation: "keep" | "cancel" | "switch";
  rec_reason: string; alternative: { name: string; saving: number } | null;
  next_renewal: string; active: boolean;
}

export interface SubIntelligence {
  subscriptions: EnrichedSub[]; total_monthly: number; total_annual: number;
  active_count: number; potential_saving: number; to_cancel_count: number;
  to_switch_count: number; overlap_warning: string | null; currency: string;
}

export interface Goal {
  id: string; name: string; category: string; target_amount: number;
  currency: string; why: string; timeframe_months: number;
  priority: string; progress_percent: number;
  milestones: {
    daily:   { action: string; amount: number };
    weekly:  { action: string; amount: number };
    monthly: { action: string; amount: number };
    yearly:  { action: string; amount: number };
  };
}

export interface GoalPlan {
  goals: Goal[];
  monthly_free_cash: number;
  recommended_allocation: Record<string, number>;
}

export interface SavingsForecast {
  currency: string; monthly_income: number; current_monthly_savings: number;
  current_savings_rate: number; monthly_waste: number;
  scenarios: { current: number; optimised: number; aggressive: number };
  projections: Record<string, Record<string, Record<string, number>>>;
  milestones: Array<{ name: string; target: number; months_away: number; achievable: boolean }>;
  narrative: string;
  investment_products: Array<{ name: string; rate: string; risk: string; min: string; platform: string }>;
}

export interface SmartAlert {
  id: string; type: string; severity: "high" | "medium" | "info" | "success";
  icon: string; title: string; body: string; action: string;
  action_route: string; color: string;
}

export interface SpendingBehaviour {
  currency: string; behaviour_score: number;
  heatmap_dow: Array<{ day: string; amount: number; count: number }>;
  weekly_trend: Array<{ week: string; amount: number }>;
  category_heatmap: Record<string, number[]>;
  patterns: Array<{ id: string; icon: string; title: string; desc: string; color: string }>;
  top_merchants: Array<{ merchant: string; count: number; total: number }>;
  total_transactions: number; avg_transaction: number;
}

export interface GoalActions {
  actions: Array<{
    id: string; timeframe: string; category: string; icon: string;
    title: string; description: string; impact: string;
    impact_amount: number; difficulty: string; currency: string;
  }>;
  weekly_challenge: { title: string; description: string; reward: string };
}

export interface StreakData {
  current_streak: number; best_streak: number; streak_label: string;
  next_milestone: number; points_today: number; level: string;
}

export interface Retention {
  streak: StreakData;
  milestones: Array<{ id: string; title: string; icon: string; achieved: boolean; points: number; description: string }>;
  weekly_digest: {
    title: string; total_spend: number; avg_daily_spend: number;
    top_category: string; top_category_amount: number; transaction_count: number;
    savings_this_period: number; currency: string; highlights: string[];
  };
  bill_calendar: Array<{ merchant: string; due_date: string; days_away: number; amount: number; status: string }>;
  challenges: Array<{ id: string; title: string; description: string; duration: string; reward: string; difficulty: string; active: boolean }>;
  score_trend: { current: number; previous: number | null; change: number; trend: string; message: string };
  report_card: { grade: string; overall: number; savings_rate: number; letter_grades: Record<string, string>; currency: string };
}

export interface ReportComparison {
  spend_change: number; savings_change: number; score_change: number;
  current_score: number; previous_score: number; current_savings: number;
  previous_savings: number; current_spend: number; previous_spend: number;
  currency: string;
}

export interface HistoryEntry {
  statement_id: string; created_at: string; health_score: number;
  grade: string; total_spend: number; net_savings: number; currency: string;
}

// ── Phase 4 types ─────────────────────────────────────────────────────────────

export interface InvestmentAllocation {
  instrument: string; category: string; percent: number; risk: string;
  expected_return: string; rationale: string; platforms: string[];
  current_sentiment: "buy" | "hold" | "sell"; disclaimer: boolean;
  [key: string]: unknown;
}
export interface InvestmentPlan {
  label: string; description?: string; monthly_investment: number;
  target_5y: number; expected_cagr?: string; allocation: InvestmentAllocation[];
  [key: string]: unknown;
}
export interface InvestmentPlans {
  risk_profiles: string[]; plans: Record<string, InvestmentPlan>;
  disclaimer: string; currency: string; generated_for?: string;
  [key: string]: unknown;
}
export interface MarketSection {
  id: string; name: string; icon: string;
  sentiment: "bullish" | "bearish" | "neutral";
  summary: string; ai_view: "buy" | "sell" | "hold"; ai_reasoning: string;
  timeframes: Record<string, string>; risk_level: string;
  key_drivers?: string[]; watch_out_for?: string; disclaimer: string;
  [key: string]: unknown;
}
export interface MarketTrends {
  last_updated: string; currency: string;
  sections: MarketSection[]; global_disclaimer: string;
  [key: string]: unknown;
}
export interface Anomaly {
  id: string; type: string; severity: "critical" | "warning" | "info";
  title: string; detail: string; amount: number; currency: string;
  action: string; merchant: string | null; detected_at: string;
  [key: string]: unknown;
}
export interface AnomalyReport {
  anomalies: Anomaly[]; anomaly_count: number;
  critical_count: number; total_at_risk: number;
  [key: string]: unknown;
}
