"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getAnomalies } from "@/lib/report-helpers";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

const SEV: Record<string, { bg: string; border: string; badge: string; label: string; icon: string }> = {
  critical: { bg: "rgba(244,63,94,0.06)",  border: "rgba(244,63,94,0.22)",  badge: "#F43F5E", label: "Critical", icon: "🚨" },
  warning:  { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.22)", badge: "#F59E0B", label: "Warning",  icon: "⚠️"  },
  info:     { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.22)", badge: "#3B82F6", label: "Info",     icon: "ℹ️"  },
};

const TYPE_LABEL: Record<string, string> = {
  duplicate:      "Duplicate charge",
  large_tx:       "Large transaction",
  overspend:      "Overspend",
  new_charge:     "New recurring",
  night_spending: "Night spending",
  weekend_heavy:  "Weekend heavy",
};

export default function AnomaliesPage() {
  // ALL hooks first — before any early returns
  const { report, loading, error } = useReport();
  const [dismissed, setDismissed]  = useState<Set<string>>(new Set());
  const [filter, setFilter]        = useState("all");

  if (loading) return <LoadingSpinner text="Scanning for anomalies…" />;
  if (error || !report) return <EmptyState />;

  const data   = getAnomalies(report);
  const active = data.anomalies.filter(a => !dismissed.has(a.id));
  const shown  = filter === "all" ? active : active.filter(a => a.severity === filter);
  const cur    = report.summary.currency;

  const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Spending Anomalies</h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>
            AI-detected unusual patterns in your transaction data
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {data.critical_count > 0 && (
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", color: "white", background: "#F43F5E" }}>
              {data.critical_count} critical
            </span>
          )}
          {data.total_at_risk > 0 && (
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", color: "#D97706", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              {formatCurrency(data.total_at_risk, cur)} at risk
            </span>
          )}
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        {[
          { label: "Total anomalies",    val: String(data.anomaly_count),             color: "#0F172A" },
          { label: "Critical issues",    val: String(data.critical_count),            color: "#F43F5E" },
          { label: "Amount at risk",     val: formatCurrency(data.total_at_risk,cur), color: "#F59E0B" },
        ].map(m => (
          <div key={m.label} className="card-premium" style={{ padding: "16px" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "5px" }}>{m.label}</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "6px" }}>
        {["all", "critical", "warning", "info"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
            fontSize: "11px", fontWeight: "600", transition: "all 0.15s", textTransform: "capitalize",
            background: filter === f ? "#0F172A" : "white",
            color:      filter === f ? "white"    : "#64748B",
            boxShadow:  filter === f ? "none"     : "0 0 0 1px #E2E8F0",
          }}>
            {f === "all" ? `All (${active.length})` : f}
          </button>
        ))}
      </div>

      {/* All clear */}
      {shown.length === 0 && (
        <div className="card-premium" style={{ padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#10B981" }}>No anomalies detected</h2>
          <p style={{ color: "#64748B", fontSize: "12px", marginTop: "6px" }}>
            Your spending patterns look normal. Keep it up!
          </p>
        </div>
      )}

      {/* Anomaly cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {shown.map(anomaly => {
          const s = SEV[anomaly.severity] ?? SEV.info;
          return (
            <div key={anomaly.id} style={{
              borderRadius: "16px", padding: "18px 20px",
              background: s.bg, border: `1px solid ${s.border}`,
              transition: "transform 0.15s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", gap: "14px", flex: 1 }}>
                  <span style={{ fontSize: "22px", flexShrink: 0 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B" }}>{anomaly.title}</h3>
                      <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", color: "white", background: s.badge }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(0,0,0,0.05)", color: "#64748B" }}>
                        {TYPE_LABEL[anomaly.type] ?? anomaly.type}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.55", marginBottom: "8px" }}>
                      {anomaly.detail}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "10px", background: "rgba(0,0,0,0.04)", width: "fit-content" }}>
                      <span style={{ fontSize: "12px" }}>💡</span>
                      <span style={{ fontSize: "11px", color: "#374151", fontWeight: "500" }}>{anomaly.action}</span>
                    </div>
                    {anomaly.merchant && (
                      <p style={{ fontSize: "10px", color: "#94A3B8", marginTop: "6px" }}>
                        Merchant: {anomaly.merchant} · {new Date(anomaly.detected_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                  {anomaly.amount > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: s.badge }}>
                        {formatCurrency(anomaly.amount, anomaly.currency)}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>at risk</div>
                    </div>
                  )}
                  <button onClick={() => dismiss(anomaly.id)} style={{
                    background: "none", border: "1px solid #E2E8F0", cursor: "pointer",
                    fontSize: "11px", color: "#94A3B8", padding: "4px 10px", borderRadius: "8px",
                  }}>Dismiss</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
