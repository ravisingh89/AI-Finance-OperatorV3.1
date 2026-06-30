const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export const api = {
  upload: async (file: File, currency: string, region: string, token: string) => {
    const form = new FormData();
    form.append("file", file); form.append("currency", currency); form.append("region", region);
    return req<{ statement_id: string; status: string }>("/api/v1/statements/upload", token, { method: "POST", body: form });
  },
  status:      (id: string, token: string) => req<{ status: string }>(`/api/v1/statements/${id}/status`, token),
  report:      (token: string) => req<{ report: FinancialReport }>("/api/v1/reports/latest", token),
  chat:        (message: string, history: ChatMessage[], token: string) =>
    req<{ reply: string; suggestions: string[]; user_profile: string }>("/api/v1/copilot/chat", token, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    }),
  suggestions: (token: string) => req<{ suggestions: string[] }>("/api/v1/copilot/suggestions", token),
  getGoals:    (token: string) => req<{ goals: GoalPlan }>("/api/v1/goals", token),
  updateGoal:  (goal_id: string, progress: number, token: string) =>
    req<{ success: boolean }>("/api/v1/goals/progress", token, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_id, progress_percent: progress }),
    }),
};

export interface ChatMessage { role: "user" | "assistant"; content: string; }
export interface FinancialReport {
  summary: { total_income:number;total_spend:number;net_savings:number;waste_score:number;savings_score:number;currency:string;region:string };
  category_breakdown: Record<string,number>;
  classified_transactions: Transaction[];
  subscriptions: Subscription[];
  subscription_intelligence: SubIntelligence;
  waste_items: WasteItem[];
  budget_plan: BudgetPlan;
  debt_plan: DebtPlan;
  savings_plan: SavingsPlan;
  health_score: HealthScore;
  goals: GoalPlan;
  savings_forecast: SavingsForecast;
}
export interface Transaction { date:string;merchant:string;amount:number;currency:string;type:string;category:string; }
export interface Subscription { merchant:string;frequency:string;amount:number;currency:string;active:boolean; }
export interface SubIntelligence {
  subscriptions:EnrichedSub[];total_monthly:number;total_annual:number;active_count:number;
  potential_saving:number;to_cancel_count:number;to_switch_count:number;overlap_warning:string|null;currency:string;
}
export interface EnrichedSub {
  merchant:string;category:string;icon:string;frequency:string;amount:number;monthly_cost:number;
  annual_cost:number;currency:string;usage_score:number;recommendation:"keep"|"cancel"|"switch";
  rec_reason:string;alternative:{name:string;saving:number}|null;next_renewal:string;active:boolean;
}
export interface WasteItem { waste_type:string;merchant:string;severity:"low"|"medium"|"high";monthly_loss:number;recommendation:string; }
export interface BudgetPlan {
  framework:string;recommended_budget:{needs:Record<string,number>;wants:Record<string,number>;savings:Record<string,number>};
  monthly_target_savings:number;emergency_fund_target:number;insights:string[];
}
export interface DebtPlan {
  recommended_strategy:string;strategy_reason:string;
  detected_debts:Array<{type:string;estimated_balance:number;monthly_payment:number;interest_rate:number}>;
  payoff_plan:Array<{debt_type:string;payoff_months:number;total_interest:number}>;
  interest_saved_vs_minimum:number;total_payoff_months:number;
}
export interface SavingsPlan {
  current_savings_rate:number;target_savings_rate:number;
  opportunities:Array<{type:string;description:string;monthly_impact:number;priority:string}>;
  investment_recommendations:Array<{product:string;allocation_percent:number;expected_return:string;rationale:string}>;
  projected_annual_savings:number;
}
export interface HealthScore {
  overall_score:number;grade:string;label:string;color:string;
  sub_scores:Record<string,{score:number;max:number;label:string}>;
  metrics:{income:number;spend:number;savings:number;savings_rate:number;debt_ratio:number;spending_ratio:number};
  insights:Array<{type:string;msg:string}>;currency:string;
}
export interface Goal {
  id:string;name:string;category:string;target_amount:number;currency:string;
  why:string;timeframe_months:number;priority:string;progress_percent:number;
  milestones:{daily:{action:string;amount:number};weekly:{action:string;amount:number};monthly:{action:string;amount:number};yearly:{action:string;amount:number}};
}
export interface GoalPlan { goals:Goal[];monthly_free_cash:number;recommended_allocation:Record<string,number>; }
export interface SavingsForecast {
  currency:string;monthly_income:number;current_monthly_savings:number;current_savings_rate:number;monthly_waste:number;
  scenarios:{current:number;optimised:number;aggressive:number};
  projections:Record<string,Record<string,Record<string,number>>>;
  milestones:Array<{name:string;target:number;months_away:number;achievable:boolean}>;
  narrative:string;
  investment_products:Array<{name:string;rate:string;risk:string;min:string;platform:string}>;
}
