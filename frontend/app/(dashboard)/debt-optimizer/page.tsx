"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getDebtPlan } from "@/lib/report-helpers";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

const STRATEGY_META: Record<string, { icon: string; color: string; bg: string }> = {
  avalanche: { icon: "🏔️", color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
  snowball:  { icon: "❄️", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
  hybrid:    { icon: "⚡", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
};

export default function DebtOptimizerPage() {
  const { report, loading, error } = useReport();
  const [activeStrategy, setStrategy] = useState<"avalanche" | "snowball" | "hybrid">("hybrid");

  if (loading) return <LoadingSpinner text="Optimising your debt…" />;
  if (error || !report) return <EmptyState />;

  const cur  = report.summary.currency;
  const dp   = getDebtPlan(report);

  if (!dp.hasDebts) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Debt Optimizer</h1>
      </div>
      <div className="card-premium" style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎉</div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#10B981", marginBottom: "8px" }}>Zero debt detected!</h2>
        <p style={{ color: "#64748B", fontSize: "13px" }}>Excellent discipline. Keep building your savings and investments.</p>
      </div>
    </div>
  );

  const current = dp.strategies[activeStrategy];
  const meta    = STRATEGY_META[activeStrategy] ?? { icon: "📊", color: "#64748B", bg: "#F8FAFC" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Debt Optimizer</h1>
        <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>Compare 3 payoff strategies side by side</p>
      </div>

      {/* Strategy selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {(["avalanche", "snowball", "hybrid"] as const).map(s => {
          const m  = STRATEGY_META[s];
          const sd = dp.strategies[s];
          const isActive = activeStrategy === s;
          const isRec    = dp.strategy === s;
          return (
            <button key={s} onClick={() => setStrategy(s)} style={{
              padding: "18px", borderRadius: "16px", cursor: "pointer", textAlign: "left",
              border: `2px solid ${isActive ? m.color : "#E2E8F0"}`,
              background: isActive ? m.bg : "white", transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <span style={{ fontSize: "24px" }}>{m.icon}</span>
                {isRec && <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: m.color, color: "white" }}>Recommended</span>}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", textTransform: "capitalize", marginBottom: "4px" }}>{s}</div>
              <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px" }}>{sd?.description ?? ""}</div>
              {(sd?.totalMonths ?? 0) > 0 && (
                <div style={{ fontSize: "12px", fontWeight: "600", color: m.color }}>{sd.totalMonths} months to clear</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Key metrics for selected strategy */}
      {current && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
          {[
            { label: "Payoff time",    val: `${current.totalMonths} months`,             color: "#F43F5E" },
            { label: "Total interest", val: formatCurrency(current.totalInterest, cur),  color: "#F59E0B" },
            { label: "Interest saved", val: formatCurrency(current.saved, cur),          color: "#10B981" },
          ].map(m => (
            <div key={m.label} className="card-premium" style={{ padding: "18px", borderTop: `3px solid ${m.color}` }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "6px" }}>{m.label}</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Strategy tip */}
      {current && (
        <div style={{ padding: "14px 18px", borderRadius: "14px", background: meta.bg, border: `1px solid ${meta.color}30` }}>
          <p style={{ fontSize: "13px", color: meta.color, fontWeight: "500" }}>
            {meta.icon} <strong>{activeStrategy}</strong>: {current.description}
            {current.bestFor ? ` · Best for: ${current.bestFor}` : ""}
          </p>
        </div>
      )}

      {/* Detected debts */}
      <div className="card-premium" style={{ padding: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", marginBottom: "14px" }}>Detected debts</h2>
        {dp.debts.map((d, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", borderBottom: i < dp.debts.length - 1 ? "1px solid #F8FAFC" : "none",
          }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", textTransform: "capitalize" }}>
                {d.type.replace(/_/g, " ")}
              </p>
              <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                Monthly: {formatCurrency(d.monthly, cur)} · Rate: {(d.rate * 100).toFixed(0)}% APR
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "16px", fontWeight: "800", color: "#F43F5E" }}>{formatCurrency(d.balance, cur)}</p>
              <p style={{ fontSize: "10px", color: "#94A3B8" }}>est. balance</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payoff timeline */}
      {current && current.payoffPlan.length > 0 && (
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", marginBottom: "14px" }}>
            Payoff timeline — {activeStrategy}
          </h2>
          {current.payoffPlan.map((p, i) => {
            const pct = dp.totalMonths > 0 ? Math.min(100, (p.months / dp.totalMonths) * 100) : 50;
            return (
              <div key={i} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: "600", color: "#1E293B", textTransform: "capitalize" }}>
                    {p.debtType.replace(/_/g, " ")}
                  </span>
                  <span style={{ color: "#64748B" }}>{p.months} months · {formatCurrency(p.interest, cur)} interest</span>
                </div>
                <div style={{ height: "10px", background: "#F1F5F9", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ height: "10px", borderRadius: "5px", background: meta.color, width: `${pct}%`, transition: "width 1.2s ease" }} />
                </div>
                {p.priority && <p style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px" }}>Priority: {p.priority}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
