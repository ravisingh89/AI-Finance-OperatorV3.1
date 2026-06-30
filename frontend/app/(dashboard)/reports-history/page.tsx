"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";

interface HistoryEntry {
  statement_id: string;
  created_at: string;
  health_score: number;
  grade: string;
  total_spend: number;
  net_savings: number;
  currency: string;
}

interface Comparison {
  spend_change: number;
  savings_change: number;
  score_change: number;
  current_score: number;
  previous_score: number;
  current_savings: number;
  previous_savings: number;
  current_spend: number;
  previous_spend: number;
  currency: string;
}

function TrendBadge({ val, invert=false }: { val:number; invert?:boolean }) {
  const positive = invert ? val < 0 : val > 0;
  const color    = positive ? "#10B981" : val === 0 ? "#94A3B8" : "#F43F5E";
  const arrow    = val > 0 ? "↑" : val < 0 ? "↓" : "→";
  return (
    <span style={{color,fontWeight:"600",fontSize:"12px"}}>
      {arrow} {Math.abs(val).toFixed(1)}%
    </span>
  );
}

export default function ReportsHistoryPage() {
  const { getToken }     = useAuth();
  const [history, setHistory]       = useState<HistoryEntry[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading]       = useState(true);
  const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [hr, cr] = await Promise.allSettled([
          fetch(`${BASE}/api/v1/reports/history`, { headers }).then(r => r.json()),
          fetch(`${BASE}/api/v1/reports/compare`, { headers }).then(r => r.json()),
        ]);
        if (hr.status === "fulfilled") setHistory(hr.value.reports || []);
        if (cr.status === "fulfilled" && cr.value.comparison) setComparison(cr.value.comparison);
      } catch {} finally { setLoading(false); }
    })();
  }, [getToken]);

  if (loading) return <LoadingSpinner text="Loading report history…" />;
  if (!history.length) return <EmptyState message="No report history yet. Upload statements each month to track your progress." />;

  const cur = history[0]?.currency || "AED";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A"}}>Report History</h1>
        <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"4px"}}>Track your financial progress over time</p>
      </div>

      {/* Month-over-month comparison */}
      {comparison && (
        <div className="card-premium" style={{padding:"24px"}}>
          <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginBottom:"16px"}}>
            📊 Month-over-month comparison
          </h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
            {[
              {label:"Health score",   curr:comparison.current_score,   prev:comparison.previous_score,  change:comparison.score_change,        isScore:true,  invert:false},
              {label:"Net savings",    curr:comparison.current_savings,  prev:comparison.previous_savings, change:comparison.savings_change,      isScore:false, invert:false},
              {label:"Total spend",    curr:comparison.current_spend,    prev:comparison.previous_spend,   change:comparison.spend_change,        isScore:false, invert:true},
            ].map(m=>(
              <div key={m.label} style={{
                padding:"16px",borderRadius:"14px",
                background: m.change === 0 ? "#F8FAFC" : (m.invert ? m.change < 0 : m.change > 0) ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)",
                border:`1px solid ${m.change===0?"#E2E8F0":(m.invert?m.change<0:m.change>0)?"rgba(16,185,129,0.2)":"rgba(244,63,94,0.2)"}`,
              }}>
                <p style={{fontSize:"11px",color:"#94A3B8",marginBottom:"6px"}}>{m.label}</p>
                <p style={{fontSize:"18px",fontWeight:"800",color:"#0F172A"}}>
                  {m.isScore ? `${m.curr}/100` : formatCurrency(m.curr,cur)}
                </p>
                <div style={{fontSize:"11px",color:"#94A3B8",marginTop:"4px"}}>
                  vs {m.isScore ? `${m.prev}/100` : formatCurrency(m.prev,cur)} · <TrendBadge val={m.change} invert={m.invert}/>
                </div>
              </div>
            ))}
            <div style={{padding:"16px",borderRadius:"14px",background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.2)"}}>
              <p style={{fontSize:"11px",color:"#94A3B8",marginBottom:"6px"}}>Reports tracked</p>
              <p style={{fontSize:"18px",fontWeight:"800",color:"#0F172A"}}>{history.length}</p>
              <p style={{fontSize:"11px",color:"#94A3B8",marginTop:"4px"}}>Keep uploading monthly</p>
            </div>
          </div>
        </div>
      )}

      {/* Score trend line */}
      <div className="card-premium" style={{padding:"24px"}}>
        <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginBottom:"16px"}}>Health score trend</h2>
        <div style={{display:"flex",alignItems:"flex-end",gap:"8px",height:"80px"}}>
          {history.map((h,i)=>{
            const pct = h.health_score / 100;
            const color = h.health_score>=75?"#10B981":h.health_score>=55?"#3B82F6":h.health_score>=40?"#F59E0B":"#F43F5E";
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                <span style={{fontSize:"10px",fontWeight:"700",color}}>{h.health_score}</span>
                <div style={{
                  width:"100%",borderRadius:"4px 4px 0 0",
                  height:`${Math.max(8,pct*70)}px`,background:color,
                  transition:"height 0.6s ease",
                }}/>
                <span style={{fontSize:"9px",color:"#94A3B8"}}>
                  {new Date(h.created_at).toLocaleDateString("en",{month:"short",day:"numeric"})}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History table */}
      <div className="card-premium" style={{padding:"0",overflow:"hidden"}}>
        <div style={{padding:"18px 20px",borderBottom:"1px solid #F1F5F9"}}>
          <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A"}}>All reports</h2>
        </div>
        {history.map((h,i)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",padding:"14px 20px",
            borderBottom:i<history.length-1?"1px solid #F8FAFC":"none",
            transition:"background 0.1s",
          }}>
            <div style={{flex:1}}>
              <p style={{fontSize:"13px",fontWeight:"600",color:"#1E293B"}}>
                {new Date(h.created_at).toLocaleDateString("en",{year:"numeric",month:"long",day:"numeric"})}
              </p>
              <p style={{fontSize:"11px",color:"#94A3B8",marginTop:"2px"}}>
                Spend: {formatCurrency(h.total_spend,h.currency)} · Saved: {formatCurrency(h.net_savings,h.currency)}
              </p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <div style={{
                width:"40px",height:"40px",borderRadius:"50%",
                background:h.health_score>=75?"rgba(16,185,129,0.1)":h.health_score>=55?"rgba(59,130,246,0.1)":"rgba(245,158,11,0.1)",
                display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",
              }}>
                <span style={{
                  fontSize:"14px",fontWeight:"800",
                  color:h.health_score>=75?"#10B981":h.health_score>=55?"#3B82F6":"#F59E0B",
                }}>{h.health_score}</span>
              </div>
              <span style={{
                fontSize:"12px",fontWeight:"700",padding:"3px 9px",borderRadius:"6px",
                background:h.grade==="A"||h.grade==="A+"?"rgba(16,185,129,0.1)":"rgba(245,158,11,0.1)",
                color:h.grade==="A"||h.grade==="A+"?"#10B981":"#D97706",
              }}>Grade {h.grade}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
