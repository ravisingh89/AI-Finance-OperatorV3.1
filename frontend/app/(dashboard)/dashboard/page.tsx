"use client";
import { useReport } from "@/hooks/useReport";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
         RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const CAT_COLORS = ["#10B981","#3B82F6","#F59E0B","#F43F5E","#8B5CF6","#EC4899","#14B8A6","#F97316"];

/* ── Animated Score Ring ─────────────────────────────────────────── */
function ScoreRing({ score, color, size=140 }: { score:number; color:string; size?:number }) {
  const r = size/2 - 10, cx = size/2, cy = size/2;
  const circ  = 2 * Math.PI * r;
  const offset= circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={color+"99"}/>
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="10"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth="10"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="score-ring-animated"/>
      <text x={cx} y={cy-6} textAnchor="middle" fontSize={size/5} fontWeight="800" fill={color}>{score}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize={size/14} fill="#94A3B8">/100</text>
    </svg>
  );
}

/* ── Skeleton Card ───────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card-premium p-5">
      <div className="skeleton h-3 w-20 mb-3"/>
      <div className="skeleton h-8 w-32 mb-2"/>
      <div className="skeleton h-2 w-16"/>
    </div>
  );
}

/* ── Mini Copilot Card ───────────────────────────────────────────── */
function MiniCopilot() {
  return (
    <Link href="/copilot" className="card-premium p-5 block cursor-pointer hover:shadow-lg transition-shadow"
      style={{background:"linear-gradient(135deg,#0F172A,#1E293B)"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
        <div style={{width:"32px",height:"32px",borderRadius:"50%",
          background:"linear-gradient(135deg,#10B981,#059669)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"14px",fontWeight:"800",color:"white",flexShrink:0}}>F</div>
        <div>
          <div style={{color:"white",fontWeight:"600",fontSize:"12px"}}>AI Copilot</div>
          <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#10B981"}}
              className="animate-pulse"/>
            <span style={{color:"#10B981",fontSize:"10px"}}>Online · Memory active</span>
          </div>
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:"10px",padding:"10px 12px",marginBottom:"10px"}}>
        <p style={{color:"#CBD5E1",fontSize:"11px",lineHeight:"1.5"}}>
          "Ask me anything about your finances. I remember your past conversations and learn from them."
        </p>
      </div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        {["Can I afford a car?","Best debt strategy?","Save more?"].map(s=>(
          <span key={s} style={{
            fontSize:"10px",padding:"4px 8px",borderRadius:"20px",
            background:"rgba(16,185,129,0.15)",color:"#10B981",
            border:"1px solid rgba(16,185,129,0.2)",
          }}>{s}</span>
        ))}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { report, loading } = useReport();

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_,i)=><SkeletonCard key={i}/>)}</div>
      <div className="skeleton h-48 rounded-2xl"/>
    </div>
  );

  if (!report) return (
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{fontSize:"64px",marginBottom:"16px"}}>📁</div>
      <h2 style={{fontSize:"20px",fontWeight:"700",color:"#0F172A",marginBottom:"8px"}}>No data yet</h2>
      <p style={{color:"#64748B",marginBottom:"24px",fontSize:"14px"}}>Upload your bank statement to get your complete financial analysis</p>
      <Link href="/upload" className="btn-primary" style={{padding:"12px 28px",display:"inline-block",textDecoration:"none"}}>
        Upload Statement →
      </Link>
    </div>
  );

  const { summary, category_breakdown={}, health_score, smart_alerts=[], retention } = report;
  const cur      = summary.currency;
  const hs       = health_score || {};
  const streak   = retention?.streak || {};
  const alerts   = smart_alerts.filter((a:any) => a.severity === "high").slice(0,3);
  const radarData= hs.radar_data || [];

  const pieData = Object.entries(category_breakdown)
    .sort((a,b)=>(b[1] as number)-(a[1] as number)).slice(0,7)
    .map(([name,value])=>({name,value:Math.round(Number(value))}));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A",letterSpacing:"-0.5px"}}>
            Financial Overview
          </h1>
          <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"3px"}}>
            {summary.region} · {cur} · Latest statement
          </p>
        </div>
        <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
          {streak.current_streak > 0 && (
            <div style={{padding:"6px 12px",background:"rgba(245,158,11,0.1)",
              border:"1px solid rgba(245,158,11,0.2)",borderRadius:"20px",
              display:"flex",alignItems:"center",gap:"5px"}}>
              <span>🔥</span>
              <span style={{fontSize:"12px",fontWeight:"600",color:"#D97706"}}>{streak.current_streak} day streak</span>
            </div>
          )}
          <Link href="/upload" className="btn-primary"
            style={{padding:"8px 18px",fontSize:"13px",textDecoration:"none",display:"inline-block"}}>
            + Upload
          </Link>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        {[
          {label:"Monthly income",  val:formatCurrency(summary.total_income,cur),  color:"#10B981", icon:"💵"},
          {label:"Monthly spend",   val:formatCurrency(summary.total_spend,cur),   color:"#F43F5E", icon:"💸"},
          {label:"Net savings",     val:formatCurrency(summary.net_savings,cur),   color:"#3B82F6", icon:"💰"},
          {label:"Subscriptions",   val:`${report.subscriptions?.length||0} active`,color:"#8B5CF6",icon:"🔁"},
        ].map(c=>(
          <div key={c.label} className="card-premium" style={{padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
              <span style={{fontSize:"11px",color:"#94A3B8",fontWeight:"500"}}>{c.label}</span>
              <span style={{fontSize:"18px"}}>{c.icon}</span>
            </div>
            <div style={{fontSize:"20px",fontWeight:"800",color:c.color}} className="count-animate">{c.val}</div>
          </div>
        ))}
      </div>

      {/* Health Score + Radar + Mini Copilot */}
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr 240px",gap:"14px",alignItems:"start"}}>
        {/* Score ring */}
        <Link href="/health-score" className="card-premium" style={{
          padding:"24px",display:"flex",flexDirection:"column",alignItems:"center",
          minWidth:"200px",textDecoration:"none",
        }}>
          <ScoreRing score={hs.overall_score||0} color={hs.color||"#10B981"} size={150}/>
          <div style={{marginTop:"12px",textAlign:"center"}}>
            <span style={{fontSize:"18px",fontWeight:"800",color:hs.color}}>{hs.label}</span>
            <div style={{fontSize:"11px",color:"#94A3B8",marginTop:"3px"}}>Grade {hs.grade}</div>
          </div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"center",marginTop:"12px"}}>
            {Object.entries(hs.sub_scores||{}).slice(0,4).map(([k,ss]:any)=>(
              <div key={k} style={{fontSize:"10px",padding:"3px 7px",borderRadius:"6px",
                background:`${hs.color}18`,color:hs.color,fontWeight:"500"}}>
                {ss.label.split(" ")[0]}: {ss.score}
              </div>
            ))}
          </div>
        </Link>

        {/* Radar chart */}
        {radarData.length > 0 && (
          <div className="card-premium" style={{padding:"20px"}}>
            <h2 style={{fontSize:"13px",fontWeight:"600",color:"#0F172A",marginBottom:"4px"}}>Health radar</h2>
            <p style={{fontSize:"11px",color:"#94A3B8",marginBottom:"12px"}}>7 subscores at a glance</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0"/>
                <PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:"#94A3B8"}}/>
                <Radar name="Score" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.18} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mini copilot */}
        <MiniCopilot/>
      </div>

      {/* Alerts + Category chart */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
        {/* Critical alerts */}
        <div className="card-premium" style={{padding:"20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
            <h2 style={{fontSize:"13px",fontWeight:"600",color:"#0F172A"}}>🔔 Critical alerts</h2>
            <Link href="/alerts" style={{fontSize:"11px",color:"#10B981",textDecoration:"none",fontWeight:"500"}}>
              View all →
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div style={{textAlign:"center",padding:"20px",color:"#94A3B8",fontSize:"12px"}}>
              ✅ All clear — no critical alerts
            </div>
          ) : alerts.map((a:any)=>(
            <div key={a.id} className="alert-card" style={{
              padding:"12px",marginBottom:"8px",borderRadius:"12px",
              background:`${a.color}0D`,border:`1px solid ${a.color}30`,
            }}>
              <div style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                <span style={{fontSize:"18px"}}>{a.icon}</span>
                <div>
                  <p style={{fontSize:"12px",fontWeight:"600",color:"#1E293B"}}>{a.title}</p>
                  <p style={{fontSize:"11px",color:"#64748B",marginTop:"2px",lineHeight:"1.4"}}>{a.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Spend pie */}
        <div className="card-premium" style={{padding:"20px"}}>
          <h2 style={{fontSize:"13px",fontWeight:"600",color:"#0F172A",marginBottom:"4px"}}>Spend by category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={85} innerRadius={45}
                label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false}>
                {pieData.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v:number)=>formatCurrency(v,cur)}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick links grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
        {[
          {href:"/spending-behaviour",        icon:"🧠",label:"Behaviour",   sub:"Heatmap & patterns"},
          {href:"/debt-optimizer",            icon:"💳",label:"Debt",        sub:"3 strategies"},
          {href:"/goals",                     icon:"🎯",label:"Goals",       sub:"Daily to yearly"},
          {href:"/savings-forecast",          icon:"📈",label:"Forecast",    sub:"36-month view"},
          {href:"/subscription-intelligence", icon:"🔁",label:"Subs",        sub:"Cancel & switch"},
          {href:"/reports-history",           icon:"📋",label:"History",     sub:"Past reports"},
          {href:"/retention",                 icon:"🏆",label:"Challenges",  sub:"Build streaks"},
          {href:"/actions",                   icon:"⚡",label:"Actions",     sub:"Do this now"},
        ].map(l=>(
          <Link key={l.href} href={l.href} className="card-premium"
            style={{padding:"14px",textDecoration:"none",display:"block"}}>
            <div style={{fontSize:"22px",marginBottom:"6px"}}>{l.icon}</div>
            <div style={{fontSize:"12px",fontWeight:"600",color:"#1E293B"}}>{l.label}</div>
            <div style={{fontSize:"10px",color:"#94A3B8",marginTop:"2px"}}>{l.sub}</div>
          </Link>
        ))}
      </div>

      {/* Waste alert banner */}
      {(report.waste_items?.length||0) > 0 && (
        <div style={{
          padding:"14px 18px",borderRadius:"14px",
          background:"linear-gradient(135deg,rgba(244,63,94,0.08),rgba(239,68,68,0.05))",
          border:"1px solid rgba(244,63,94,0.2)",
          display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <div>
            <span style={{fontWeight:"600",color:"#F43F5E",fontSize:"13px"}}>
              🗑️ {report.waste_items.length} waste items — {formatCurrency(
                report.waste_items.reduce((a:number,w:any)=>a+w.monthly_loss,0),cur
              )}/month leaking
            </span>
          </div>
          <Link href="/insights" style={{
            fontSize:"12px",fontWeight:"600",color:"#F43F5E",textDecoration:"none",
            padding:"6px 14px",background:"rgba(244,63,94,0.1)",borderRadius:"8px",
          }}>Fix now →</Link>
        </div>
      )}
    </div>
  );
}
