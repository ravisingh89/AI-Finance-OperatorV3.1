"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getAlerts } from "@/lib/report-helpers";
import Link from "next/link";
import { useState } from "react";

const SEV_LABEL: Record<string, string> = {
  high: "Critical", medium: "Warning", info: "Info", success: "Great news",
};
const SEV_BG: Record<string, string> = {
  high:    "rgba(244,63,94,0.07)",
  medium:  "rgba(245,158,11,0.07)",
  info:    "rgba(59,130,246,0.07)",
  success: "rgba(16,185,129,0.07)",
};
const SEV_BORDER: Record<string, string> = {
  high:    "rgba(244,63,94,0.25)",
  medium:  "rgba(245,158,11,0.25)",
  info:    "rgba(59,130,246,0.25)",
  success: "rgba(16,185,129,0.25)",
};

export default function AlertsPage() {
  const { report, loading, error } = useReport();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter]       = useState("all");

  if (loading) return <LoadingSpinner text="Scanning for alerts…" />;
  if (error || !report) return <EmptyState />;

  const allAlerts = getAlerts(report);
  const active    = allAlerts.filter(a => !dismissed.has(a.id));
  const filtered  = filter === "all"
    ? active
    : active.filter(a => a.severity === filter || a.type === filter);

  const counts = {
    high:    active.filter(a => a.severity === "high").length,
    medium:  active.filter(a => a.severity === "medium").length,
    success: active.filter(a => a.severity === "success").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Smart Alerts</h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>
            AI-detected financial signals that need your attention
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {counts.high > 0 && (
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "11px", color: "white", background: "#F43F5E" }}>
              {counts.high} critical
            </span>
          )}
          {counts.medium > 0 && (
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "11px", color: "white", background: "#F59E0B" }}>
              {counts.medium} warnings
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {["all", "high", "medium", "success", "info"].map(f => (
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

      {filtered.length === 0 && (
        <div className="card-premium" style={{ padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#10B981" }}>All clear!</h2>
          <p style={{ color: "#64748B", fontSize: "12px", marginTop: "4px" }}>No active alerts. Your finances look healthy.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map(alert => (
          <div key={alert.id} className="alert-card" style={{
            borderRadius: "16px", padding: "18px",
            background:   SEV_BG[alert.severity]     ?? "white",
            border:       `1px solid ${SEV_BORDER[alert.severity] ?? "#E2E8F0"}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>{alert.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B" }}>{alert.title}</h3>
                    <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", color: "white", background: alert.color }}>
                      {SEV_LABEL[alert.severity] ?? alert.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.5" }}>{alert.body}</p>
                  {alert.action_route && (
                    <Link href={alert.action_route} style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      marginTop: "10px", fontSize: "11px", fontWeight: "600",
                      color: alert.color, textDecoration: "none",
                    }}>
                      {alert.action} →
                    </Link>
                  )}
                </div>
              </div>
              <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
