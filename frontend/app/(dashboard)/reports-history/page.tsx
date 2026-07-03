"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { api, HistoryEntry, ReportComparison } from "@/lib/api";

function TrendBadge({ val, invert = false }: { val: number; invert?: boolean }) {
  const positive = invert ? val < 0 : val > 0;
  const color    = positive ? "#10B981" : val === 0 ? "#94A3B8" : "#F43F5E";
  const arrow    = val > 0 ? "↑" : val < 0 ? "↓" : "→";
  return (
    <span style={{ color, fontWeight: "600", fontSize: "12px" }}>
      {arrow} {Math.abs(val).toFixed(1)}%
    </span>
  );
}

export default function ReportsHistoryPage() {
  const { getToken }                          = useAuth();
  const [history, setHistory]                 = useState<HistoryEntry[]>([]);
  const [comparison, setComparison]           = useState<ReportComparison | null>(null);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token   = await getToken();
        const [hRes, cRes] = await Promise.allSettled([
          api.history(token!),
          api.compare(token!),
        ]);
        if (hRes.status === "fulfilled") setHistory(hRes.value.reports ?? []);
        if (cRes.status === "fulfilled") setComparison(cRes.value.comparison ?? null);
      } catch {} finally { setLoading(false); }
    })();
  }, [getToken]);

  if (loading) return <LoadingSpinner text="Loading report history…" />;
  if (!history.length) return (
    <EmptyState message="No report history yet. Upload statements each month to track your progress over time." />
  );

  const cur = history[0]?.currency ?? "AED";

  const gradeColor = (g: string) =>
    g === "A+" || g === "A" ? "#10B981" : g === "B" ? "#3B82F6" : g === "C" ? "#F59E0B" : "#F43F5E";

  const scoreColor = (s: number) =>
    s >= 75 ? "#10B981" : s >= 55 ? "#3B82F6" : s >= 40 ? "#F59E0B" : "#F43F5E";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Report History</h1>
        <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>Track your financial progress over time</p>
      </div>

      {/* Month-over-month comparison */}
      {comparison && (
        <div className="card-premium" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", marginBottom: "16px" }}>
            📊 Month-over-month comparison
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
            {[
              { label: "Health score",  curr: `${comparison.current_score}/100`,             prev: `${comparison.previous_score}/100`,             change: comparison.score_change,   invert: false },
              { label: "Net savings",   curr: formatCurrency(comparison.current_savings, cur), prev: formatCurrency(comparison.previous_savings, cur), change: comparison.savings_change, invert: false },
              { label: "Total spend",   curr: formatCurrency(comparison.current_spend, cur),   prev: formatCurrency(comparison.previous_spend, cur),   change: comparison.spend_change,   invert: true },
              { label: "Reports total", curr: String(history.length),                          prev: "—",                                             change: 0,                         invert: false },
            ].map(m => (
              <div key={m.label} style={{
                padding: "16px", borderRadius: "14px",
                background: m.change === 0 ? "#F8FAFC"
                  : (m.invert ? m.change < 0 : m.change > 0) ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)",
                border: `1px solid ${m.change === 0 ? "#E2E8F0" : (m.invert ? m.change < 0 : m.change > 0) ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`,
              }}>
                <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "6px" }}>{m.label}</p>
                <p style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A" }}>{m.curr}</p>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                  vs {m.prev}
                  {m.change !== 0 && <> · <TrendBadge val={m.change} invert={m.invert} /></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score trend bar chart */}
      <div className="card-premium" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", marginBottom: "16px" }}>Health score trend</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
          {history.map((h, i) => {
            const pct   = h.health_score / 100;
            const color = scoreColor(h.health_score);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", color }}>{h.health_score}</span>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  height: `${Math.max(8, pct * 70)}px`,
                  background: color, transition: "height 0.6s ease",
                }} />
                <span style={{ fontSize: "9px", color: "#94A3B8" }}>
                  {new Date(h.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History list */}
      <div className="card-premium" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A" }}>All reports</h2>
        </div>
        {history.map((h, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", padding: "14px 20px",
            borderBottom: i < history.length - 1 ? "1px solid #F8FAFC" : "none",
            transition: "background 0.1s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = "white")}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
                {new Date(h.created_at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                Spend: {formatCurrency(h.total_spend, h.currency)} · Saved: {formatCurrency(h.net_savings, h.currency)}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: `${scoreColor(h.health_score)}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "15px", fontWeight: "800", color: scoreColor(h.health_score) }}>
                  {h.health_score}
                </span>
              </div>
              <span style={{
                fontSize: "12px", fontWeight: "700", padding: "3px 10px", borderRadius: "6px",
                background: `${gradeColor(h.grade)}18`, color: gradeColor(h.grade),
              }}>
                Grade {h.grade}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
