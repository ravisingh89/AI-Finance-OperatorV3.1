"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getGoalActions } from "@/lib/report-helpers";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

const TF_COLOR: Record<string, string> = {
  today:      "#F43F5E",
  this_week:  "#F59E0B",
  this_month: "#3B82F6",
};
const TF_BG: Record<string, string> = {
  today:      "rgba(244,63,94,0.08)",
  this_week:  "rgba(245,158,11,0.08)",
  this_month: "rgba(59,130,246,0.08)",
};
const DIFF_COLOR: Record<string, string> = {
  easy: "#10B981", medium: "#F59E0B", hard: "#F43F5E",
};

export default function ActionsPage() {
  const { report, loading, error } = useReport();
  const [done, setDone]     = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");

  if (loading) return <LoadingSpinner text="Generating your action plan…" />;
  if (error || !report) return <EmptyState />;

  // All data via contract layer — no raw report access
  const ga      = getGoalActions(report);
  const actions = ga.actions;
  const cur     = report.summary.currency;

  if (!actions.length) return (
    <EmptyState message="No actions generated yet. Upload a statement to get your personalised action plan." />
  );

  const challenge    = ga.weekly_challenge;
  const filtered     = filter === "all" ? actions : actions.filter(a => a.timeframe === filter);
  const doneCount    = actions.filter(a => done.has(a.id)).length;
  const totalImpact  = actions.reduce((sum, a) => sum + (a.impact_amount ?? 0), 0);

  const toggleDone = (id: string) => {
    setDone(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Goal-Driven Actions</h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>
            Specific things to do now to hit your financial goals
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#94A3B8" }}>Potential monthly impact</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#10B981" }}>
            {formatCurrency(totalImpact, cur)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card-premium" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#0F172A" }}>
            {doneCount}/{actions.length} actions completed
          </span>
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>
            {Math.round((doneCount / actions.length) * 100)}%
          </span>
        </div>
        <div style={{ height: "8px", background: "#F1F5F9", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "8px", borderRadius: "4px",
            background: "linear-gradient(90deg,#10B981,#059669)",
            width: `${(doneCount / actions.length) * 100}%`,
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>

      {/* Weekly challenge */}
      {challenge.title && (
        <div style={{
          borderRadius: "20px", padding: "20px",
          background: "linear-gradient(135deg,#7C3AED,#5B21B6)",
        }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "28px" }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ color: "white", fontWeight: "700", fontSize: "14px" }}>{challenge.title}</span>
                <span style={{
                  fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                  background: "rgba(255,255,255,0.15)", color: "white", fontWeight: "600",
                }}>Weekly Challenge</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", lineHeight: "1.5", marginBottom: "10px" }}>
                {challenge.description}
              </p>
              {challenge.reward && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.12)",
                }}>
                  <span style={{ fontSize: "12px" }}>🎁</span>
                  <span style={{ color: "#FDE68A", fontSize: "12px", fontWeight: "600" }}>{challenge.reward}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "6px" }}>
        {["all", "today", "this_week", "this_month"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: "600", transition: "all 0.15s",
            background: filter === f ? "#0F172A" : "white",
            color:      filter === f ? "white"    : "#64748B",
            boxShadow:  filter === f ? "none"     : "0 0 0 1px #E2E8F0",
          }}>
            {f === "all" ? "All" : f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Action cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map(action => {
          const isDone    = done.has(action.id);
          const tfColor   = TF_COLOR[action.timeframe]   ?? "#64748B";
          const tfBg      = TF_BG[action.timeframe]      ?? "#F1F5F9";
          const diffColor = DIFF_COLOR[action.difficulty] ?? "#64748B";
          return (
            <div key={action.id} className="card-premium" style={{
              padding: "16px 20px", display: "flex", gap: "14px", alignItems: "flex-start",
              opacity: isDone ? 0.55 : 1, background: isDone ? "#F8FAFC" : "white",
            }}>
              {/* Checkbox */}
              <button onClick={() => toggleDone(action.id)} style={{
                width: "24px", height: "24px", borderRadius: "6px", flexShrink: 0,
                border: `2px solid ${isDone ? "#10B981" : "#E2E8F0"}`,
                background: isDone ? "#10B981" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", marginTop: "2px", transition: "all 0.15s",
              }}>
                {isDone && <span style={{ color: "white", fontSize: "13px", fontWeight: "700" }}>✓</span>}
              </button>

              <span style={{ fontSize: "24px", flexShrink: 0 }}>{action.icon}</span>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "5px" }}>
                  <h3 style={{
                    fontSize: "13px", fontWeight: "700", color: "#0F172A",
                    textDecoration: isDone ? "line-through" : "none",
                  }}>{action.title}</h3>
                  <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: tfBg, color: tfColor }}>
                    {action.timeframe.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: `${diffColor}18`, color: diffColor }}>
                    {action.difficulty}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.5" }}>{action.description}</p>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#10B981" }}>
                  +{formatCurrency(action.impact_amount ?? 0, cur)}
                </div>
                <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>impact</div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8", fontSize: "13px" }}>
          No actions for this timeframe
        </div>
      )}
    </div>
  );
}
