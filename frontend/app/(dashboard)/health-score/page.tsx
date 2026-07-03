"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { getHealthScore } from "@/lib/report-helpers";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

function AnimatedRing({ score, color, size = 160 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 12, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={`hs-grad-${score}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color + "88"} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth="12" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#hs-grad-${score})`} strokeWidth="12"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size / 4.2} fontWeight="900" fill={color}>{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={size / 14} fill="#94A3B8">out of 100</text>
    </svg>
  );
}

function SubScoreBar({ label, icon, score, max }: { label: string; icon: string; score: number; max: number }) {
  const pct   = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 75 ? "#10B981" : pct >= 55 ? "#3B82F6" : pct >= 35 ? "#F59E0B" : "#F43F5E";
  const bg    = pct >= 75 ? "rgba(16,185,129,0.06)" : pct >= 55 ? "rgba(59,130,246,0.06)" : pct >= 35 ? "rgba(245,158,11,0.06)" : "rgba(244,63,94,0.06)";
  return (
    <div style={{ padding: "14px 16px", borderRadius: "14px", background: bg, marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>{icon}</span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>{label}</span>
        </div>
        <span style={{ fontSize: "15px", fontWeight: "800", color }}>
          {score}<span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "400" }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: "8px", background: "rgba(0,0,0,0.06)", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ height: "8px", borderRadius: "4px", background: color, width: `${pct}%`, transition: "width 1.3s ease" }} />
      </div>
    </div>
  );
}

export default function HealthScorePage() {
  const { report, loading, error } = useReport();
  if (loading) return <LoadingSpinner text="Calculating health score…" />;
  if (error || !report) return <EmptyState />;
  if (!report.health_score) return <EmptyState message="Health score unavailable. Upload a statement." />;

  // All data comes through the contract layer — no raw report access
  const hs = getHealthScore(report);

  const typeBg:    Record<string, string> = { success: "rgba(16,185,129,0.08)", warning: "rgba(245,158,11,0.08)", danger: "rgba(244,63,94,0.08)" };
  const typeColor: Record<string, string> = { success: "#10B981", warning: "#D97706", danger: "#F43F5E" };
  const typeIcon:  Record<string, string> = { success: "✅", warning: "⚠️", danger: "🚨" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Financial Health Score</h1>
        <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>7-dimension financial fitness analysis</p>
      </div>

      {/* Hero: ring + radar + metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "24px", alignItems: "start" }}>
        {/* Ring */}
        <div className="card-premium" style={{ padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px" }}>
          <AnimatedRing score={hs.score} color={hs.color} size={160} />
          <div style={{ marginTop: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "900", color: hs.color }}>{hs.label}</div>
            <div style={{
              marginTop: "8px", display: "inline-block", padding: "4px 14px", borderRadius: "20px",
              background: `${hs.color}18`, border: `1px solid ${hs.color}30`,
              fontSize: "13px", fontWeight: "700", color: hs.color,
            }}>Grade {hs.grade}</div>
          </div>
        </div>

        {/* Radar */}
        {hs.radarData.length > 0 && (
          <div className="card-premium" style={{ padding: "20px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "3px" }}>Score radar</h2>
            <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "10px" }}>All 7 dimensions at a glance</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={hs.radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <Radar name="Score" dataKey="score" stroke={hs.color} fill={hs.color} fillOpacity={0.18} strokeWidth={2.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Key metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "160px" }}>
          {[
            { label: "Monthly income",   val: `${hs.currency} ${hs.income.toLocaleString()}`,  color: "#10B981" },
            { label: "Savings rate",     val: `${hs.savingsRate}%`,                            color: "#3B82F6" },
            { label: "Debt burden",      val: `${hs.debtRatio}%`,                              color: hs.debtRatio > 30 ? "#F43F5E" : "#F59E0B" },
            { label: "Investment ratio", val: `${hs.investRatio}%`,                            color: "#8B5CF6" },
          ].map(m => (
            <div key={m.label} className="card-premium" style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "3px" }}>{m.label}</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7 sub-scores */}
      {hs.subScores.length > 0 && (
        <div className="card-premium" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", marginBottom: "16px" }}>7-dimension breakdown</h2>
          {hs.subScores.map(ss => (
            <SubScoreBar key={ss.key} label={ss.label} icon={ss.icon} score={ss.score} max={ss.max} />
          ))}
        </div>
      )}

      {/* AI insights */}
      {hs.insights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A" }}>AI insights</h2>
          {hs.insights.map((ins, i) => (
            <div key={i} style={{
              padding: "14px 16px", borderRadius: "14px",
              background: typeBg[ins.type] ?? "#F8FAFC",
              border: `1px solid ${typeColor[ins.type] ?? "#E2E8F0"}22`,
            }}>
              <p style={{ fontSize: "13px", fontWeight: "500", color: typeColor[ins.type] ?? "#374151" }}>
                {typeIcon[ins.type] ?? "ℹ️"} {ins.msg}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Top improvement suggestions */}
      {hs.suggestions.length > 0 && (
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", marginBottom: "14px" }}>Top improvements</h2>
          {hs.suggestions.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "10px 0",
              borderBottom: i < hs.suggestions.length - 1 ? "1px solid #F8FAFC" : "none",
            }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(244,63,94,0.08)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "800", color: "#F43F5E",
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "#1E293B", textTransform: "capitalize" }}>
                  {s.subscore.replace(/_/g, " ")}
                </p>
                <p style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{s.tip}</p>
              </div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#F43F5E" }}>+{s.gap} pts</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
