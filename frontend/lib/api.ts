/**
 * API client — built for a dynamic AI backend.
 *
 * Design principle: The backend is LLM-driven and returns new fields over time.
 * Rather than rigid interfaces that break on schema drift, we use:
 *   - `Record<string, unknown>` for LLM-generated sub-objects
 *   - Optional fields (?) for everything Phase 2+ added
 *   - Safe accessor helpers (safeNum, safeStr, safeArr) for all data reads
 *   - TypeScript only enforces the fields we *know* are always present
 *
 * Frontend pages should always use safe accessors, never direct dot-access
 * on LLM-generated fields.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Core request helper ───────────────────────────────────────────────────────

async function req<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Safe accessor helpers — use these in pages, not direct field access ───────

/** Safely read a number, defaulting to 0 */
export function safeNum(obj: unknown, key: string, fallback = 0): number {
  if (!obj || typeof obj !== "object") return fallback;
  const val = (obj as Record<string, unknown>)[key];
  return typeof val === "number" ? val : fallback;
}

/** Safely read a string, defaulting to "" */
export function safeStr(obj: unknown, key: string, fallback = ""): string {
  if (!obj || typeof obj !== "object") return fallback;
  const val = (obj as Record<string, unknown>)[key];
  return typeof val === "string" ? val : fallback;
}

/** Safely read an array, defaulting to [] */
export function safeArr<T = unknown>(obj: unknown, key: string): T[] {
  if (!obj || typeof obj !== "object") return [];
  const val = (obj as Record<string, unknown>)[key];
  return Array.isArray(val) ? (val as T[]) : [];
}

/** Safely read a nested object, defaulting to {} */
export function safeObj(obj: unknown, key: string): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  const val = (obj as Record<string, unknown>)[key];
  return val && typeof val === "object" && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : {};
}

// ── API surface ───────────────────────────────────────────────────────────────

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

  status: (id: string, token: string) =>
    req<{ status: string }>(`/api/v1/statements/${id}/status`, token),

  report: (token: string) =>
    req<{ report: FinancialReport }>("/api/v1/reports/latest", token),

  history: (token: string) =>
    req<{ reports: HistoryEntry[] }>("/api/v1/reports/history", token),

  compare: (token: string) =>
    req<{ comparison: ReportComparison }>("/api/v1/reports/compare", token),

  chat: (message: string, history: ChatMessage[], token: string) =>
    req<{ reply: string; suggestions: string[]; user_profile: string; memory_updated: boolean }>(
      "/api/v1/copilot/chat", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      }
    ),

  suggestions: (token: string) =>
    req<{ suggestions: string[] }>("/api/v1/copilot/suggestions", token),

  getGoals: (token: string) =>
    req<{ goals: GoalPlan }>("/api/v1/goals", token),

  updateGoal: (goal_id: string, progress: number, token: string) =>
    req<{ success: boolean }>("/api/v1/goals/progress", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_id, progress_percent: progress }),
    }),

  getActions: (token: string) =>
    req<{ goal_actions: GoalActions }>("/api/v1/actions", token),

  getRetention: (token: string) =>
    req<{ retention: Retention; streak: StreakData }>("/api/v1/retention", token),

  updateChallenge: (challenge_id: string, status: string, token: string) =>
    req<{ success: boolean }>("/api/v1/retention/challenge", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id, status }),
    }),
};

// ── Type definitions ──────────────────────────────────────────────────────────
//
// Rule: Only the SUMMARY is fully typed (always present, never LLM-generated).
// Everything else uses Record<string, unknown> for LLM-driven sub-objects,
// with optional fields for fields added across phases.
// Pages use safeNum/safeStr/safeArr to read these safely.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// The top-level report shape — all fields optional except summary
export interface FinancialReport {
  // Always present — computed, not LLM-generated
  summary: ReportSummary;
  category_breakdown: Record<string, number>;
  classified_transactions: Transaction[];

  // Phase 1 — may be empty arrays/objects but always present after v1
  subscriptions?: Subscription[];
  waste_items?: WasteItem[];
  budget_plan?: Record<string, unknown>;    // LLM-generated, use safeObj/safeArr
  debt_plan?: DebtPlan;
  savings_plan?: Record<string, unknown>;   // LLM-generated

  // Phase 2
  subscription_intelligence?: SubIntelligence;
  // health_score?: HealthScore;
  health_score?: {
    overall_score?: number;
    radar_data?: Array<{
      subject: string;
      score: number;
      }>;
  };
  goals?: GoalPlan;
  savings_forecast?: SavingsForecast;

  // Phase 3 — added in v3, optional so old reports don't break
  smart_alerts?: SmartAlert[];
  spending_behaviour?: SpendingBehaviour;
  goal_actions?: GoalActions;
  retention?: Retention;
  report_comparison?: ReportComparison | null;

  // Safety valve — any future fields the backend adds won't break the build
  [key: string]: unknown;
}

// ── Strictly typed sub-interfaces (computed, not LLM-driven) ─────────────────

export interface ReportSummary {
  total_income: number;
  total_spend: number;
  net_savings: number;
  waste_score: number;
  savings_score: number;
  currency: string;
  region: string;
}

export interface Transaction {
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  type: string;
  category: string;
  confidence?: number;
  reason?: string;
}

export interface Subscription {
  merchant: string;
  frequency: string;
  amount: number;
  currency: string;
  active: boolean;
}

export interface EnrichedSub {
  merchant: string;
  category: string;
  icon: string;
  frequency: string;
  amount: number;
  monthly_cost: number;
  annual_cost: number;
  currency: string;
  usage_score: number;
  recommendation: "keep" | "cancel" | "switch";
  rec_reason: string;
  alternative: { name: string; saving: number } | null;
  next_renewal: string;
  active: boolean;
}

export interface SubIntelligence {
  subscriptions: EnrichedSub[];
  total_monthly: number;
  total_annual: number;
  active_count: number;
  potential_saving: number;
  to_cancel_count: number;
  to_switch_count: number;
  overlap_warning: string | null;
  currency: string;
}

export interface WasteItem {
  waste_type: string;
  merchant: string;
  severity: "low" | "medium" | "high";
  monthly_loss: number;
  recommendation: string;
}

export interface DebtPlan {
  recommended_strategy: string;
  strategy_reason?: string;
  detected_debts: Array<{
    type: string;
    estimated_balance: number;
    monthly_payment: number;
    interest_rate: number;
  }>;
  payoff_plan: Array<{
    debt_type: string;
    payoff_months: number;
    total_interest: number;
    priority?: string;
  }>;
  // Phase 3: three-strategy comparison
  strategies?: Record<string, {
    name: string;
    description: string;
    best_for: string;
    payoff_plan: Array<{debt_type:string;payoff_months:number;total_interest:number;monthly_payment?:number;priority?:string}>;
    total_interest: number;
    total_months: number;
    interest_saved_vs_minimum: number;
  }>;
  interest_saved_vs_minimum: number;
  total_payoff_months: number;
  message?: string;
}

export interface HealthScore {
  overall_score: number;
  grade: string;
  label: string;
  color: string;
  sub_scores: Record<string, {
    score: number;
    max: number;
    label: string;
    icon?: string;
  }>;
  // Phase 3: radar chart data
  radar_data?: Array<{ subject: string; score: number; full: number }>;
  metrics: {
    income: number;
    spend: number;
    savings: number;
    savings_rate: number;
    debt_ratio: number;
    spending_ratio: number;
    investment_ratio?: number;
  };
  insights: Array<{ type: string; msg: string }>;
  suggestions?: Array<{ subscore: string; gap: number; tip: string }>;
  currency: string;
}

export interface Goal {
  id: string;
  name: string;
  category: string;
  target_amount: number;
  currency: string;
  why: string;
  timeframe_months: number;
  priority: string;
  progress_percent: number;
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
  currency: string;
  monthly_income: number;
  current_monthly_savings: number;
  current_savings_rate: number;
  monthly_waste: number;
  scenarios: { current: number; optimised: number; aggressive: number };
  projections: Record<string, Record<string, Record<string, number>>>;
  milestones: Array<{
    name: string;
    target: number;
    months_away: number;
    achievable: boolean;
  }>;
  narrative: string;
  investment_products: Array<{
    name: string;
    rate: string;
    risk: string;
    min: string;
    platform: string;
  }>;
}

// Phase 3 types

export interface SmartAlert {
  id: string;
  type: string;
  severity: "high" | "medium" | "info" | "success";
  icon: string;
  title: string;
  body: string;
  action: string;
  action_route: string;
  color: string;
}

export interface SpendingBehaviour {
  currency: string;
  behaviour_score: number;
  heatmap_dow: Array<{ day: string; amount: number; count: number }>;
  weekly_trend: Array<{ week: string; amount: number }>;
  category_heatmap: Record<string, number[]>;
  patterns: Array<{
    id: string;
    icon: string;
    title: string;
    desc: string;
    color: string;
  }>;
  top_merchants: Array<{ merchant: string; count: number; total: number }>;
  total_transactions: number;
  avg_transaction: number;
}

export interface GoalActions {
  actions: Array<{
    id: string;
    timeframe: string;
    category: string;
    icon: string;
    title: string;
    description: string;
    impact: string;
    impact_amount: number;
    difficulty: string;
    currency: string;
  }>;
  weekly_challenge: {
    title: string;
    description: string;
    reward: string;
  };
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  streak_label: string;
  next_milestone: number;
  points_today: number;
  level: string;
}

export interface Retention {
  streak: StreakData;
  milestones: Array<{
    id: string;
    title: string;
    icon: string;
    achieved: boolean;
    points: number;
    description: string;
  }>;
  weekly_digest: {
    title: string;
    total_spend: number;
    avg_daily_spend: number;
    top_category: string;
    top_category_amount: number;
    transaction_count: number;
    savings_this_period: number;
    currency: string;
    highlights: string[];
  };
  bill_calendar: Array<{
    merchant: string;
    due_date: string;
    days_away: number;
    amount: number;
    status: string;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    reward: string;
    difficulty: string;
    active: boolean;
  }>;
  score_trend: {
    current: number;
    previous: number | null;
    change: number;
    trend: string;
    message: string;
  };
  report_card: {
    grade: string;
    overall: number;
    savings_rate: number;
    letter_grades: Record<string, string>;
    currency: string;
  };
}

export interface ReportComparison {
  spend_change: number;
  savings_change: number;
  score_change: number;
  current_score: number;
  previous_score: number;
  current_savings: number;
  previous_savings: number;
  current_spend: number;
  previous_spend: number;
  currency: string;
}

export interface HistoryEntry {
  statement_id: string;
  created_at: string;
  health_score: number;
  grade: string;
  total_spend: number;
  net_savings: number;
  currency: string;
}
