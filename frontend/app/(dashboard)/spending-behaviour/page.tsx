"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getBehaviour } from "@/lib/report-helpers";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export default function SpendingBehaviourPage() {
  const { report, loading, error } = useReport();
  if (loading) return <LoadingSpinner text="Analysing spending behaviour…" />;
  if (error || !report) return <EmptyState />;
  if (!report.spending_behaviour) return <EmptyState message="Upload a statement to see spending behaviour." />;

  const beh = getBehaviour(report);
  const cur = beh.currency;
  const maxDow = Math.max(...beh.heatmap_dow.map(d => d.amount), 1);

  const catColors: Record<string, string> = {
    groceries: "#10B981", dining: "#F59E0B", transport: "#3B82F6",
    shopping: "#8B5CF6", utilities: "#14B8A6", entertainment: "#F43F5E",
  };

  function HeatCell({ amount }: { amount: number }) {
    const intensity = amount / maxDow;
    const bg = intensity === 0 ? "#F1F5F9"
      : intensity < 0.3 ? "#DCFCE7"
      : intensity < 0.6 ? "#FEF3C7"
      : intensity < 0.85 ? "#FED7AA" : "#FECACA";
    return (
      <div className="heat-cell" style={{
        width: "40px", height: "40px", borderRadius: "8px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "10px", fontWeight: "500", background: bg, color: "#374151",
      }}>
        {amount > 0 ? Math.round(amount) : "—"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Spending Behaviour</h1>
        <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>Patterns, heatmaps, and behavioural insights</p>
      </div>

      {/* Score + patterns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div className="card-premium" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none"
              stroke={beh.behaviour_score >= 70 ? "#10B981" : beh.behaviour_score >= 45 ? "#F59E0B" : "#F43F5E"}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - beh.behaviour_score / 100)}`}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 1.2s ease" }} />
            <text x="50" y="46" textAnchor="middle" fontSize="22" fontWeight="800"
              fill={beh.behaviour_score >= 70 ? "#10B981" : beh.behaviour_score >= 45 ? "#F59E0B" : "#F43F5E"}>
              {beh.behaviour_score}
            </text>
            <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94A3B8">/100</text>
          </svg>
          <div>
            <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>Behaviour score</p>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>
              {beh.behaviour_score >= 70 ? "Healthy spender" : beh.behaviour_score >= 45 ? "Room to improve" : "Needs attention"}
            </p>
            <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
              {beh.total_transactions} transactions · Avg {cur} {beh.avg_transaction}
            </p>
          </div>
        </div>
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "12px" }}>Behaviour patterns</h2>
          {beh.patterns.length === 0
            ? <p style={{ color: "#94A3B8", fontSize: "12px" }}>No strong patterns detected — balanced spending.</p>
            : beh.patterns.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px", borderRadius: "10px", background: p.color + "14", marginBottom: "6px" }}>
                <span>{p.icon}</span>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: "600", color: p.color }}>{p.title}</p>
                  <p style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>{p.desc}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Day-of-week heatmap */}
      {beh.heatmap_dow.length > 0 && (
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "4px" }}>Day-of-week heatmap</h2>
          <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "14px" }}>Darker = higher spend</p>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            {beh.heatmap_dow.map(d => (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1 }}>
                <HeatCell amount={d.amount} />
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category heatmap */}
      {Object.keys(beh.category_heatmap).length > 0 && (
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "14px" }}>Category × Day heatmap</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(beh.category_heatmap).map(([cat, vals]) => {
              const maxVal = Math.max(...vals, 1);
              const color  = catColors[cat] ?? "#6366F1";
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#64748B", width: "80px", textAlign: "right", textTransform: "capitalize", flexShrink: 0 }}>{cat}</span>
                  <div style={{ display: "flex", gap: "4px", flex: 1 }}>
                    {vals.map((v, i) => (
                      <div key={i} style={{
                        flex: 1, height: "24px", borderRadius: "4px",
                        background: color + Math.round((v / maxVal) * 255).toString(16).padStart(2, "0"),
                      }} title={`${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}: ${cur} ${v}`} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: "4px", marginLeft: "90px" }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <span key={d} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "#94A3B8" }}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly trend */}
      {beh.weekly_trend.length > 1 && (
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "14px" }}>Weekly spending trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={beh.weekly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
              <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top merchants */}
      {beh.top_merchants.length > 0 && (
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "14px" }}>Top merchants by spend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={beh.top_merchants} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="merchant" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
              <Bar dataKey="total" fill="#3B82F6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
