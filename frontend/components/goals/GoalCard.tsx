"use client";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

const CAT_META: Record<string, { color: string; bg: string; icon: string }> = {
  savings:    { color: "#10B981", bg: "rgba(16,185,129,0.08)", icon: "💰" },
  debt:       { color: "#F43F5E", bg: "rgba(244,63,94,0.08)",  icon: "💳" },
  investment: { color: "#3B82F6", bg: "rgba(59,130,246,0.08)", icon: "📈" },
  emergency:  { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", icon: "🛡️" },
  spending:   { color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", icon: "🛒" },
};
const PRIO_COLOR: Record<string, string> = { high: "#F43F5E", medium: "#F59E0B", low: "#10B981" };
type Tab = "daily" | "weekly" | "monthly" | "yearly";

interface Props {
  goal: any;
  cur: string;
  saving: boolean;
  onProgress: (id: string, pct: number) => void;
}

export function GoalCard({ goal, cur, saving, onProgress }: Props) {
  const [tab, setTab] = useState<Tab>("monthly");
  const meta = CAT_META[goal.category] || { color: "#64748B", bg: "#F8FAFC", icon: "🎯" };
  const pct  = Math.min(100, Math.max(0, goal.progress_percent || 0));

  return (
    <div className="card-premium" style={{ padding: "20px", borderTop: `3px solid ${meta.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "12px", background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0,
          }}>{meta.icon}</div>
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A" }}>{goal.name}</h3>
            <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{goal.why}</p>
          </div>
        </div>
        <span style={{
          fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px",
          color: "white", background: PRIO_COLOR[goal.priority] || "#64748B", flexShrink: 0,
        }}>{goal.priority}</span>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
          <span style={{ color: "#94A3B8" }}>Progress</span>
          <span style={{ fontWeight: "700", color: meta.color }}>{pct}%</span>
        </div>
        <div style={{ height: "8px", background: "#F1F5F9", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "8px", borderRadius: "4px", background: meta.color, width: `${pct}%`, transition: "width 1s ease" }} />
        </div>
        <input type="range" min={0} max={100} value={pct}
          onChange={e => onProgress(goal.id, parseInt(e.target.value))}
          style={{ width: "100%", marginTop: "6px", accentColor: meta.color, height: "4px" }} />
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", padding: "8px 12px",
        borderRadius: "10px", background: meta.bg, marginBottom: "12px",
      }}>
        <span style={{ fontSize: "11px", color: "#94A3B8" }}>Target</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: meta.color }}>{formatCurrency(goal.target_amount, cur)}</span>
        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{goal.timeframe_months} months</span>
      </div>

      <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "3px", display: "flex", marginBottom: "10px" }}>
        {(["daily", "weekly", "monthly", "yearly"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "5px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontSize: "10px", fontWeight: "600", transition: "all 0.15s",
            background: tab === t ? "white" : "transparent",
            color: tab === t ? "#0F172A" : "#94A3B8",
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
          }}>{t}</button>
        ))}
      </div>

      {goal.milestones && goal.milestones[tab] && (
        <div style={{ padding: "10px 12px", borderRadius: "10px", background: "#F8FAFC" }}>
          <p style={{ fontSize: "11px", fontWeight: "600", color: "#374151", marginBottom: "3px" }}>
            {goal.milestones[tab].action}
          </p>
          <p style={{ fontSize: "13px", fontWeight: "700", color: meta.color }}>
            {formatCurrency(goal.milestones[tab].amount || 0, cur)}
          </p>
        </div>
      )}

      {saving && <p style={{ fontSize: "10px", color: "#94A3B8", marginTop: "8px", textAlign: "center" }}>Saving…</p>}
    </div>
  );
}
