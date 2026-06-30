"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import { useState } from "react";

const SEV_LABEL: Record<string,string> = {
  high:"Critical", medium:"Warning", info:"Info", success:"Great news"
};
const SEV_BG: Record<string,string> = {
  high:"rgba(244,63,94,0.08)", medium:"rgba(245,158,11,0.08)",
  info:"rgba(59,130,246,0.08)", success:"rgba(16,185,129,0.08)"
};
const SEV_BORDER: Record<string,string> = {
  high:"rgba(244,63,94,0.25)", medium:"rgba(245,158,11,0.25)",
  info:"rgba(59,130,246,0.25)", success:"rgba(16,185,129,0.25)"
};

export default function AlertsPage() {
  const { report, loading, error } = useReport();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");

  if (loading) return <LoadingSpinner text="Scanning for alerts…" />;
  if (error || !report) return <EmptyState />;

  const alerts: any[] = report.smart_alerts || [];
  const active = alerts.filter(a => !dismissed.has(a.id));
  const filtered = filter === "all" ? active : active.filter(a => a.severity === filter || a.type === filter);

  const counts = {
    high:    active.filter(a => a.severity === "high").length,
    medium:  active.filter(a => a.severity === "medium").length,
    success: active.filter(a => a.severity === "success").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Alerts</h1>
          <p className="text-slate-500 text-sm mt-1">AI-detected financial signals that need your attention</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {counts.high > 0 && (
            <span className="px-2.5 py-1 rounded-full font-bold text-white bg-rose-500">{counts.high} critical</span>
          )}
          {counts.medium > 0 && (
            <span className="px-2.5 py-1 rounded-full font-bold text-white bg-amber-500">{counts.medium} warnings</span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all","high","medium","success"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium capitalize transition-all
              ${filter === f
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            {f === "all" ? `All (${active.length})` : f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-lg font-bold text-emerald-700">All clear!</h2>
          <p className="text-emerald-600 text-sm mt-1">No active alerts. Your finances look healthy.</p>
        </div>
      )}

      {/* Alert cards */}
      <div className="space-y-3">
        {filtered.map((alert, i) => (
          <div key={alert.id}
            className="rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              background: SEV_BG[alert.severity] || "white",
              borderColor: SEV_BORDER[alert.severity] || "#E2E8F0",
              animationDelay: `${i * 0.05}s`
            }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="text-2xl mt-0.5">{alert.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{alert.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                      style={{ background: alert.color }}>
                      {SEV_LABEL[alert.severity]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{alert.body}</p>
                  {alert.action_route && (
                    <Link href={alert.action_route}
                      className="inline-flex items-center gap-1 mt-3 text-xs font-semibold transition-colors"
                      style={{ color: alert.color }}>
                      {alert.action} →
                    </Link>
                  )}
                </div>
              </div>
              <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                className="text-slate-300 hover:text-slate-500 transition-colors text-lg leading-none flex-shrink-0">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
