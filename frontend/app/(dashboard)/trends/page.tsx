"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getMarketTrends } from "@/lib/report-helpers";
import { useState } from "react";

const SENTIMENT_STYLE = {
  bullish: { color: "#10B981", bg: "rgba(16,185,129,0.1)",  label: "Bullish 📈" },
  bearish: { color: "#F43F5E", bg: "rgba(244,63,94,0.1)",   label: "Bearish 📉" },
  neutral: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  label: "Neutral ➡️" },
};
const VIEW_STYLE = {
  buy:  { color: "#10B981", bg: "rgba(16,185,129,0.12)",  label: "BUY  ✅" },
  sell: { color: "#F43F5E", bg: "rgba(244,63,94,0.12)",   label: "SELL ❌" },
  hold: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  label: "HOLD ⏸️" },
};
const RISK_STYLE: Record<string, { color: string; label: string }> = {
  very_high: { color: "#F43F5E", label: "Very High Risk" },
  high:      { color: "#F97316", label: "High Risk"      },
  medium:    { color: "#F59E0B", label: "Medium Risk"    },
  low:       { color: "#10B981", label: "Low Risk"       },
};
const TF_LABELS: Record<string, string> = {
  minutes: "Intraday (Minutes)",
  hourly:  "Hourly",
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
};

export default function TrendsPage() {
  // ALL hooks before early returns
  const { report, loading } = useReport();
  const [activeTab, setActiveTab]       = useState(0);
  const [expandedTf, setExpandedTf]     = useState<string | null>(null);

  const trends  = getMarketTrends(report);
  const sections = trends.sections;

  if (loading) return <LoadingSpinner text="Loading market trends…" />;

  // Non-dismissable disclaimer banner
  const DisclaimerBanner = () => (
    <div style={{
      padding: "14px 18px", borderRadius: "14px",
      background: "rgba(245,158,11,0.08)", border: "2px solid rgba(245,158,11,0.3)",
      display: "flex", gap: "10px", alignItems: "flex-start",
    }}>
      <span style={{ fontSize: "20px", flexShrink: 0 }}>📡</span>
      <div>
        <p style={{ fontSize: "12px", fontWeight: "700", color: "#D97706", marginBottom: "3px" }}>
          MARKET DATA DISCLAIMER
        </p>
        <p style={{ fontSize: "11px", color: "#92400E", lineHeight: "1.55" }}>
          {trends.global_disclaimer ||
            "Trends and sentiment shown are AI-generated estimates based on general market knowledge — NOT real-time data. This is NOT investment advice. FinanceAI does not own, promote, or accept responsibility for gains or losses from decisions made using this information. Trade and invest at your own risk."}
        </p>
      </div>
    </div>
  );

  if (!sections.length) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Market Trends</h1>
      <DisclaimerBanner />
      <div className="card-premium" style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📡</div>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>Trends not yet generated</h2>
        <p style={{ color: "#64748B", fontSize: "12px", marginTop: "6px" }}>
          Upload a bank statement to generate personalised market trends for your region.
        </p>
      </div>
    </div>
  );

  const active = sections[activeTab] ?? sections[0];
  const sent   = SENTIMENT_STYLE[active.sentiment as keyof typeof SENTIMENT_STYLE] ?? SENTIMENT_STYLE.neutral;
  const view   = VIEW_STYLE[active.ai_view as keyof typeof VIEW_STYLE]             ?? VIEW_STYLE.hold;
  const riskS  = RISK_STYLE[active.risk_level] ?? RISK_STYLE.medium;

  const updated = trends.last_updated
    ? new Date(trends.last_updated).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>Market Trends</h1>
          <p style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px" }}>
            AI sentiment analysis across 7 asset classes · Last updated: {updated}
          </p>
        </div>
        <span style={{
          fontSize: "11px", padding: "5px 12px", borderRadius: "20px", fontWeight: "600",
          background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)",
        }}>🤖 AI-generated</span>
      </div>

      {/* Non-dismissable disclaimer */}
      <DisclaimerBanner />

      {/* Section tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {sections.map((s, i) => (
          <button key={s.id} onClick={() => { setActiveTab(i); setExpandedTf(null); }} style={{
            padding: "8px 14px", borderRadius: "12px", border: "none", cursor: "pointer",
            fontSize: "12px", fontWeight: "600", transition: "all 0.15s",
            background: activeTab === i ? "#0F172A" : "white",
            color:      activeTab === i ? "white"    : "#64748B",
            boxShadow:  activeTab === i ? "none"     : "0 0 0 1px #E2E8F0",
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <span>{s.icon}</span> {s.name}
          </button>
        ))}
      </div>

      {/* Active section card */}
      <div className="card-premium" style={{ padding: "24px" }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "32px" }}>{active.icon}</span>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A" }}>{active.name}</h2>
              <div style={{ display: "flex", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: sent.bg, color: sent.color }}>
                  {sent.label}
                </span>
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: `${riskS.color}18`, color: riskS.color }}>
                  {riskS.label}
                </span>
              </div>
            </div>
          </div>

          {/* AI View badge */}
          <div style={{ textAlign: "center", padding: "14px 20px", borderRadius: "14px", background: view.bg, border: `2px solid ${view.color}40`, minWidth: "100px" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "4px", fontWeight: "600" }}>AI VIEW</div>
            <div style={{ fontSize: "18px", fontWeight: "900", color: view.color }}>{view.label}</div>
          </div>
        </div>

        {/* Summary */}
        <p style={{ fontSize: "13px", color: "#374151", lineHeight: "1.65", marginBottom: "14px" }}>
          {active.summary}
        </p>

        {/* AI Reasoning */}
        <div style={{ padding: "12px 16px", borderRadius: "12px", background: "#F8FAFC", marginBottom: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Reasoning</p>
          <p style={{ fontSize: "12px", color: "#374151", lineHeight: "1.6" }}>{active.ai_reasoning}</p>
        </div>

        {/* Key drivers */}
        {active.key_drivers && active.key_drivers.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Drivers</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {active.key_drivers.map((d, i) => (
                <span key={i} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "20px", background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Watch out for */}
        {active.watch_out_for && (
          <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", marginBottom: "16px", display: "flex", gap: "8px" }}>
            <span>⚠️</span>
            <p style={{ fontSize: "12px", color: "#E11D48", fontWeight: "500" }}>
              Watch out for: {active.watch_out_for}
            </p>
          </div>
        )}

        {/* Timeframe breakdown */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeframe Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(active.timeframes ?? {}).map(([tf, text]) => {
              const isOpen = expandedTf === tf;
              return (
                <div key={tf} style={{ borderRadius: "10px", border: "1px solid #F1F5F9", overflow: "hidden" }}>
                  <button onClick={() => setExpandedTf(isOpen ? null : tf)} style={{
                    width: "100%", padding: "10px 14px", background: isOpen ? "#F8FAFC" : "white",
                    border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between",
                    alignItems: "center", fontSize: "12px", fontWeight: "600", color: "#374151",
                  }}>
                    <span>{TF_LABELS[tf] ?? tf}</span>
                    <span style={{ color: "#94A3B8", fontSize: "14px", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "10px 14px", borderTop: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                      <p style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.55" }}>{text}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section disclaimer */}
        <p style={{ fontSize: "10px", color: "#CBD5E1", marginTop: "16px", lineHeight: "1.5" }}>
          {active.disclaimer}
        </p>
      </div>

      {/* All sections overview grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
        {sections.map((s, i) => {
          const sv = SENTIMENT_STYLE[s.sentiment as keyof typeof SENTIMENT_STYLE] ?? SENTIMENT_STYLE.neutral;
          const vv = VIEW_STYLE[s.ai_view as keyof typeof VIEW_STYLE] ?? VIEW_STYLE.hold;
          return (
            <button key={s.id} onClick={() => { setActiveTab(i); setExpandedTf(null); }} className="card-premium" style={{
              padding: "14px", textAlign: "left", border: activeTab === i ? "2px solid #0F172A" : "1px solid #E2E8F0", cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={{ fontSize: "20px" }}>{s.icon}</span>
                <span style={{ fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "20px", background: vv.bg, color: vv.color }}>
                  {s.ai_view.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#0F172A", marginBottom: "4px" }}>{s.name}</p>
              <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: sv.bg, color: sv.color }}>
                {s.sentiment}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom disclaimer (non-dismissable) */}
      <div style={{ padding: "14px 18px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
        <p style={{ fontSize: "10px", color: "#94A3B8", lineHeight: "1.55" }}>
          {trends.global_disclaimer}
        </p>
      </div>
    </div>
  );
}
