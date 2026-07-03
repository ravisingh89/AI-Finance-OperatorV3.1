"use client";
import { useReport } from "@/hooks/useReport";
import { formatCurrency } from "@/lib/utils";
import { HealthScore, SmartAlert, StreakData } from "@/lib/api";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const CAT_COLORS = ["#10B981","#3B82F6","#F59E0B","#F43F5E","#8B5CF6","#EC4899","#14B8A6","#F97316"];

/* ── Animated Score Ring ───────────────────────────────────────────────────── */
function ScoreRing({ score, color, size = 150 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={color} />
          <stop offset="100%" stopColor={color + "88"} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth="10"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size / 4.5} fontWeight="800" fill={color}>{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={size / 14} fill="#94A3B8">/100</text>
    </svg>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card-premium p-5">
      <div className="skeleton h-3 w-20 mb-3" />
      <div className="skeleton h-8 w-32 mb-2" />
      <div className="skeleton h-2 w-16" />
    </div>
  );
}

/* ── Mini Copilot ──────────────────────────────────────────────────────────── */
function MiniCopilot() {
  return (
    <Link href="/copilot" className="card-premium p-5 block"
      style={{ background: "linear-gradient(135deg,#0F172A,#1E293B)", textDecoration: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          background: "linear-gradient(135deg,#10B981,#059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", fontWeight: "800", color: "white", flexShrink: 0,
        }}>F</div>
        <div>
          <div style={{ color: "white", fontWeight: "600", fontSize: "12px" }}>AI Copilot</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }}
              className="animate-pulse" />
            <span style={{ color: "#10B981", fontSize: "10px" }}>Online · Memory active</span>
          </div>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px" }}>
        <p style={{ color: "#CBD5E1", fontSize: "11px", lineHeight: "1.5" }}>
          &quot;Ask me anything about your finances. I remember your past conversations.&quot;
        </p>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {["Can I afford a car?", "Best debt strategy?", "Save more?"].map(s => (
          <span key={s} style={{
            fontSize: "10px", padding: "4px 8px", borderRadius: "20px",
            background: "rgba(16,185,129,0.15)", color: "#10B981",
            border: "1px solid rgba(16,185,129,0.2)",
          }}>{s}</span>
        ))}
      </div>
    </Link>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { report, loading } = useReport();

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
        {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="skeleton" style={{ height: "192px", borderRadius: "16px" }} />
    </div>
  );

  if (!report) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: "64px", marginBottom: "16px" }}>📁</div>
      <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0F172A", marginBottom: "8px" }}>No data yet</h2>
      <p style={{ color: "#64748B", marginBottom: "24px", fontSize: "14px" }}>
        Upload your bank statement to get your complete financial analysis
      </p>
      <Link href="/upload" className="btn-primary"
        style={{ padding: "12px 28px", display: "inline-block", textDecoration: "none" }}>
        Upload Statement →
      </Link>
    </div>
  );

  /* ── Typed, null-safe locals ─────────────────────────────────────────────── */
  const cur     = report.summary.currency;

  // HealthScore is optional — extract with a typed local, never cast to {}
  const hs: HealthScore | undefined = report.health_score;
  const hsScore  = hs?.overall_score ?? 0;
  const hsColor  = hs?.color ?? "#10B981";
  const hsLabel  = hs?.label ?? "—";
  const hsGrade  = hs?.grade ?? "—";
  const hsSubScores = hs?.sub_scores ?? {};
  const radarData   = hs?.radar_data ?? [];        // radar_data is optional on HealthScore

  // StreakData is optional inside Retention which is optional
  const streak: StreakData | undefined = report.retention?.streak;
  const streakCount = streak?.current_streak ?? 0;

  // SmartAlert[] is optional
  const allAlerts: SmartAlert[] = report.smart_alerts ?? [];
  const criticalAlerts = allAlerts.filter(a => a.severity === "high").slice(0, 3);

  // waste_items is optional
  const wasteItems = report.waste_items ?? [];
  const totalWaste = wasteItems.reduce((acc, w) => acc + w.monthly_loss, 0);

  // category_breakdown always present but typed as Record
  const catBreakdown = report.category_breakdown ?? {};
  const pieData = Object.entries(catBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  const subCount = report.subscriptions?.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.5px" }}>
            Financial Overview
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "3px" }}>
            {report.summary.region} · {cur} · Latest statement
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {streakCount > 0 && (
            <div style={{
              padding: "6px 12px", background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)", borderRadius: "20px",
              display: "flex", alignItems: "center", gap: "5px",
            }}>
              <span>🔥</span>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#D97706" }}>
                {streakCount} day streak
              </span>
            </div>
          )}
          <Link href="/upload" className="btn-primary"
            style={{ padding: "8px 18px", fontSize: "13px", textDecoration: "none", display: "inline-block" }}>
            + Upload
          </Link>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
        {[
          { label: "Monthly income",  val: formatCurrency(report.summary.total_income, cur),  color: "#10B981", icon: "💵" },
          { label: "Monthly spend",   val: formatCurrency(report.summary.total_spend,   cur),  color: "#F43F5E", icon: "💸" },
          { label: "Net savings",     val: formatCurrency(report.summary.net_savings,   cur),  color: "#3B82F6", icon: "💰" },
          { label: "Subscriptions",   val: `${subCount} active`,                               color: "#8B5CF6", icon: "🔁" },
        ].map(c => (
          <div key={c.label} className="card-premium" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "500" }}>{c.label}</span>
              <span style={{ fontSize: "18px" }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Health Score + Radar + Mini Copilot */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 240px", gap: "14px", alignItems: "start" }}>

        {/* Score ring — only render if we have a health score */}
        <Link href="/health-score" className="card-premium" style={{
          padding: "24px", display: "flex", flexDirection: "column",
          alignItems: "center", minWidth: "200px", textDecoration: "none",
        }}>
          <ScoreRing score={hsScore} color={hsColor} size={150} />
          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <span style={{ fontSize: "18px", fontWeight: "800", color: hsColor }}>{hsLabel}</span>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "3px" }}>Grade {hsGrade}</div>
          </div>
          {Object.keys(hsSubScores).length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center", marginTop: "12px" }}>
              {Object.entries(hsSubScores).slice(0, 4).map(([k, ss]) => (
                <div key={k} style={{
                  fontSize: "10px", padding: "3px 7px", borderRadius: "6px",
                  background: `${hsColor}18`, color: hsColor, fontWeight: "500",
                }}>
                  {ss.label.split(" ")[0]}: {ss.score}
                </div>
              ))}
            </div>
          )}
        </Link>

        {/* Radar chart — only render when we have data points */}
        {radarData.length > 0 ? (
          <div className="card-premium" style={{ padding: "20px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "4px" }}>Health radar</h2>
            <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "12px" }}>7 subscores at a glance</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <Radar name="Score" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* placeholder card so layout doesn't break when no radar data */
          <div className="card-premium" style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#94A3B8", fontSize: "12px", textAlign: "center" }}>
              Upload a statement to<br />see your health radar
            </p>
          </div>
        )}

        <MiniCopilot />
      </div>

      {/* Alerts + Category chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

        {/* Critical alerts */}
        <div className="card-premium" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A" }}>🔔 Critical alerts</h2>
            <Link href="/alerts" style={{ fontSize: "11px", color: "#10B981", textDecoration: "none", fontWeight: "500" }}>
              View all →
            </Link>
          </div>
          {criticalAlerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#94A3B8", fontSize: "12px" }}>
              ✅ All clear — no critical alerts
            </div>
          ) : criticalAlerts.map(a => (
            <div key={a.id} className="alert-card" style={{
              padding: "12px", marginBottom: "8px", borderRadius: "12px",
              background: `${a.color}0D`, border: `1px solid ${a.color}30`,
            }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "18px" }}>{a.icon}</span>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#1E293B" }}>{a.title}</p>
                  <p style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", lineHeight: "1.4" }}>{a.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Spend pie */}
        <div className="card-premium" style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "4px" }}>
            Spend by category
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={85} innerRadius={45}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, cur)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#94A3B8", fontSize: "12px" }}>No spend data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
        {[
          { href: "/spending-behaviour",         icon: "🧠", label: "Behaviour",  sub: "Heatmap & patterns" },
          { href: "/debt-optimizer",             icon: "💳", label: "Debt",       sub: "3 strategies" },
          { href: "/goals",                      icon: "🎯", label: "Goals",      sub: "Daily to yearly" },
          { href: "/savings-forecast",           icon: "📈", label: "Forecast",   sub: "36-month view" },
          { href: "/subscription-intelligence",  icon: "🔁", label: "Subs",       sub: "Cancel & switch" },
          { href: "/reports-history",            icon: "📋", label: "History",    sub: "Past reports" },
          { href: "/retention",                  icon: "🏆", label: "Challenges", sub: "Build streaks" },
          { href: "/actions",                    icon: "⚡", label: "Actions",    sub: "Do this now" },
        ].map(l => (
          <Link key={l.href} href={l.href} className="card-premium"
            style={{ padding: "14px", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>{l.icon}</div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#1E293B" }}>{l.label}</div>
            <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>{l.sub}</div>
          </Link>
        ))}
      </div>

      {/* Waste banner — fully null-safe */}
      {wasteItems.length > 0 && (
        <div style={{
          padding: "14px 18px", borderRadius: "14px",
          background: "linear-gradient(135deg,rgba(244,63,94,0.08),rgba(239,68,68,0.05))",
          border: "1px solid rgba(244,63,94,0.2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: "600", color: "#F43F5E", fontSize: "13px" }}>
            🗑️ {wasteItems.length} waste items — {formatCurrency(totalWaste, cur)}/month leaking
          </span>
          <Link href="/insights" style={{
            fontSize: "12px", fontWeight: "600", color: "#F43F5E", textDecoration: "none",
            padding: "6px 14px", background: "rgba(244,63,94,0.1)", borderRadius: "8px",
          }}>Fix now →</Link>
        </div>
      )}

    </div>
  );
}
