"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

function HeatCell({ amount, max }: { amount: number; max: number }) {
  const intensity = max > 0 ? amount / max : 0;
  const bg = intensity === 0
    ? "#F1F5F9"
    : intensity < 0.3
    ? "#DCFCE7"
    : intensity < 0.6
    ? "#FEF3C7"
    : intensity < 0.85
    ? "#FED7AA"
    : "#FECACA";
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-110"
      style={{ background: bg, color: intensity > 0.6 ? "#374151" : "#6B7280" }}>
      {amount > 0 ? Math.round(amount) : "—"}
    </div>
  );
}

export default function SpendingBehaviourPage() {
  const { report, loading, error } = useReport();
  if (loading) return <LoadingSpinner text="Analysing spending behaviour…" />;
  if (error || !report) return <EmptyState />;

  const beh = report.spending_behaviour;
  const cur = beh?.currency || report.summary.currency;
  if (!beh?.heatmap_dow?.length) return <EmptyState message="Upload a statement to see spending behaviour." />;

  const maxDow = Math.max(...beh.heatmap_dow.map((d: any) => d.amount));

  const catColors: Record<string,string> = {
    groceries:"#10B981", dining:"#F59E0B", transport:"#3B82F6",
    shopping:"#8B5CF6", utilities:"#14B8A6", entertainment:"#F43F5E",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Spending Behaviour</h1>
        <p className="text-slate-500 text-sm mt-1">Patterns, heatmaps, and behavioural insights from your data</p>
      </div>

      {/* Behaviour score + patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-6">
          <div className="relative">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="10"/>
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={beh.behaviour_score >= 70 ? "#10B981" : beh.behaviour_score >= 45 ? "#F59E0B" : "#F43F5E"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*42}`}
                strokeDashoffset={`${2*Math.PI*42*(1 - beh.behaviour_score/100)}`}
                transform="rotate(-90 50 50)"
                style={{transition:"stroke-dashoffset 1.2s ease"}}/>
              <text x="50" y="46" textAnchor="middle" fontSize="22" fontWeight="800"
                fill={beh.behaviour_score >= 70 ? "#10B981" : beh.behaviour_score >= 45 ? "#F59E0B" : "#F43F5E"}>
                {beh.behaviour_score}
              </text>
              <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94A3B8">/100</text>
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Behaviour score</p>
            <p className="text-lg font-bold text-slate-900">
              {beh.behaviour_score >= 70 ? "Healthy spender" : beh.behaviour_score >= 45 ? "Room to improve" : "Needs attention"}
            </p>
            <p className="text-xs text-slate-400 mt-1">{beh.total_transactions} transactions · Avg {cur} {beh.avg_transaction}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 text-sm mb-3">Behaviour patterns</h2>
          <div className="space-y-2">
            {beh.patterns?.length === 0 && (
              <p className="text-slate-400 text-sm">No strong patterns detected — balanced spending.</p>
            )}
            {beh.patterns?.map((p: any) => (
              <div key={p.id} className="flex items-start gap-2.5 p-2.5 rounded-xl"
                style={{ background: p.color + "14" }}>
                <span className="text-base">{p.icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: p.color }}>{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day-of-week heatmap */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-1 text-sm">Day-of-week spending heatmap</h2>
        <p className="text-xs text-slate-400 mb-5">Darker = higher spend. Hover to see amounts.</p>
        <div className="flex gap-3 items-end">
          {beh.heatmap_dow.map((d: any) => (
            <div key={d.day} className="flex flex-col items-center gap-2 flex-1">
              <HeatCell amount={d.amount} max={maxDow} />
              <span className="text-xs text-slate-400">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-xs text-slate-400">Low</span>
          {["#DCFCE7","#FEF3C7","#FED7AA","#FECACA"].map(c => (
            <div key={c} className="w-4 h-4 rounded" style={{ background: c }}/>
          ))}
          <span className="text-xs text-slate-400">High</span>
        </div>
      </div>

      {/* Category heatmap grid */}
      {Object.keys(beh.category_heatmap || {}).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-5 text-sm">Category × Day heatmap</h2>
          <div className="space-y-3">
            {Object.entries(beh.category_heatmap).map(([cat, vals]: [string, any]) => {
              const maxVal = Math.max(...vals);
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 capitalize w-20 text-right flex-shrink-0">{cat}</span>
                  <div className="flex gap-1.5 flex-1">
                    {vals.map((v: number, i: number) => {
                      const intensity = maxVal > 0 ? v / maxVal : 0;
                      const color = catColors[cat] || "#6366F1";
                      return (
                        <div key={i} className="flex-1 h-7 rounded-md transition-all"
                          style={{ background: color + Math.round(intensity * 255).toString(16).padStart(2,"0") }}
                          title={`${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}: ${cur} ${v}`}/>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end gap-1.5 mt-1">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <span key={d} className="flex-1 text-center text-xs text-slate-300">{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly trend */}
      {beh.weekly_trend?.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 text-sm">Weekly spending trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={beh.weekly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="week" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v/1000)}k`}/>
              <Tooltip formatter={(v: number) => `${cur} ${v.toLocaleString()}`}/>
              <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2.5} dot={{ fill:"#10B981", r:4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top merchants */}
      {beh.top_merchants?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 text-sm">Top merchants by spend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={beh.top_merchants} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v)}`}/>
              <YAxis type="category" dataKey="merchant" width={100} tick={{ fontSize: 11 }}/>
              <Tooltip formatter={(v: number) => `${cur} ${v.toLocaleString()}`}/>
              <Bar dataKey="total" fill="#3B82F6" radius={[0, 6, 6, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
