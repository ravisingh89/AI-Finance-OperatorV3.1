"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getGoalPlan } from "@/lib/report-helpers";
import { GoalCard } from "@/components/goals/GoalCard";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

export default function GoalsPage() {
  const { report, loading, error } = useReport();
  const { getToken }               = useAuth();
  const [goals, setGoals]          = useState<any[] | null>(null);
  const [saving, setSaving]        = useState<string | null>(null);

  if (loading) return <LoadingSpinner text="Loading your goals…" />;
  if (error || !report) return <EmptyState />;

  const gp          = getGoalPlan(report);
  const cur         = report.summary.currency;
  const activeGoals = goals ?? gp.goals;

  if (!activeGoals.length) return (
    <EmptyState message="No goals generated yet. Upload a statement to create your goal plan." />
  );

  const handleProgress = async (id: string, pct: number) => {
    setGoals(prev => (prev ?? gp.goals).map((g: any) =>
      g.id === id ? { ...g, progress_percent: pct } : g
    ));
    setSaving(id);
    try {
      const token = await getToken();
      await api.updateGoal(id, pct, token!);
    } catch {} finally { setSaving(null); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Goal Planner</h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>Daily, weekly, monthly, and yearly milestones</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#94A3B8" }}>Free monthly cash</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#10B981" }}>
            {formatCurrency(gp.monthly_free_cash, cur)}
          </div>
        </div>
      </div>

      {Object.keys(gp.recommended_allocation).length > 0 && (
        <div className="card-premium" style={{ padding: "18px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "12px" }}>Recommended monthly allocation</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
            {Object.entries(gp.recommended_allocation).map(([k, v]) => (
              <div key={k} style={{ textAlign: "center", padding: "10px", borderRadius: "10px", background: "#F8FAFC" }}>
                <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "4px", textTransform: "capitalize" }}>
                  {k.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>
                  {formatCurrency(v, cur)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {activeGoals.map((goal: any) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            cur={cur}
            saving={saving === goal.id}
            onProgress={handleProgress}
          />
        ))}
      </div>
    </div>
  );
}
