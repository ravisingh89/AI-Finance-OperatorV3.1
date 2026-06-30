"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { AreaChart,Area,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid } from "recharts";

type Product = "savings_account"|"fd"|"etf_sip";
const PRODUCT_LABELS:Record<Product,string> = {savings_account:"Savings (3.5%)",fd:"Fixed Deposit (5%)",etf_sip:"ETF/SIP (12%)"};
const PRODUCT_COLORS:Record<Product,string> = {savings_account:"#3B82F6",fd:"#10B981",etf_sip:"#8B5CF6"};
const SC_COLORS = {current:"#94A3B8",optimised:"#10B981",aggressive:"#3B82F6"};

export default function SavingsForecastPage() {
  const { report, loading, error } = useReport();
  const [product, setProduct] = useState<Product>("etf_sip");

  if (loading) return <LoadingSpinner text="Building 36-month forecast…"/>;
  if (error||!report) return <EmptyState/>;
  const fc = report.savings_forecast;
  const cur = fc?.currency||report.summary.currency;
  if (!fc) return <EmptyState message="Forecast unavailable. Upload a statement."/>;

  const horizons = ["3m","6m","12m","24m","36m"];
  const chartData = horizons.map(h=>({
    name:h,
    Current:   Math.round(fc.projections?.current?.[h]?.[product]    ||0),
    Optimised: Math.round(fc.projections?.optimised?.[h]?.[product]  ||0),
    Aggressive:Math.round(fc.projections?.aggressive?.[h]?.[product] ||0),
  }));

  const riskColors:Record<string,string> = {none:"#10B981",low:"#3B82F6",medium:"#F59E0B",high:"#F43F5E"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A"}}>Savings Forecast</h1>
        <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"4px"}}>3 scenarios projected over 36 months</p>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {label:"Monthly income",     val:formatCurrency(fc.monthly_income,cur),          color:"#0F172A"},
          {label:"Current savings/mo", val:formatCurrency(fc.current_monthly_savings,cur), color:"#10B981"},
          {label:"Savings rate",        val:`${fc.current_savings_rate}%`,                 color:"#3B82F6"},
          {label:"Monthly waste",       val:formatCurrency(fc.monthly_waste,cur),           color:"#F43F5E"},
        ].map(m=>(
          <div key={m.label} className="card-premium" style={{padding:"16px"}}>
            <div style={{fontSize:"10px",color:"#94A3B8",marginBottom:"5px"}}>{m.label}</div>
            <div style={{fontSize:"18px",fontWeight:"800",color:m.color}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* AI narrative */}
      <div style={{borderRadius:"20px",padding:"22px",background:"linear-gradient(135deg,#0F172A,#1E293B)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
          <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#10B981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"800",color:"white"}}>F</div>
          <span style={{color:"#10B981",fontSize:"12px",fontWeight:"600"}}>AI Forecast Narrative</span>
        </div>
        <p style={{color:"#CBD5E1",fontSize:"13px",lineHeight:"1.7"}}>{fc.narrative}</p>
      </div>

      {/* Scenario chart */}
      <div className="card-premium" style={{padding:"22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
          <div>
            <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A"}}>Projection scenarios</h2>
            <p style={{fontSize:"11px",color:"#94A3B8",marginTop:"2px"}}>Wealth accumulation over 36 months</p>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            {(Object.keys(PRODUCT_LABELS) as Product[]).map(p=>(
              <button key={p} onClick={()=>setProduct(p)} style={{
                padding:"6px 12px",borderRadius:"8px",border:"none",cursor:"pointer",
                fontSize:"11px",fontWeight:"600",transition:"all 0.15s",
                background:product===p?PRODUCT_COLORS[p]:"#F1F5F9",
                color:product===p?"white":"#64748B",
              }}>{p==="savings_account"?"Savings":p==="fd"?"FD":"ETF"}</button>
            ))}
          </div>
        </div>

        <div style={{display:"flex",gap:"16px",marginBottom:"12px",flexWrap:"wrap"}}>
          {(["Current","Optimised","Aggressive"] as const).map(s=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"50%",background:SC_COLORS[s.toLowerCase() as keyof typeof SC_COLORS]}}/>
              <span style={{fontSize:"11px",color:"#64748B"}}>{s}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              {["Current","Optimised","Aggressive"].map((s,i)=>(
                <linearGradient key={s} id={`fc${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={Object.values(SC_COLORS)[i]} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={Object.values(SC_COLORS)[i]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
            <XAxis dataKey="name" tick={{fontSize:11}}/>
            <YAxis tick={{fontSize:11}} tickFormatter={v=>v>=1000?`${Math.round(v/1000)}k`:String(v)}/>
            <Tooltip formatter={(v:number)=>formatCurrency(v,cur)}/>
            <Area type="monotone" dataKey="Current"    stroke={SC_COLORS.current}    fill="url(#fc0)" strokeWidth={2}/>
            <Area type="monotone" dataKey="Optimised"  stroke={SC_COLORS.optimised}  fill="url(#fc1)" strokeWidth={2.5}/>
            <Area type="monotone" dataKey="Aggressive" stroke={SC_COLORS.aggressive} fill="url(#fc2)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones */}
      <div className="card-premium" style={{padding:"20px"}}>
        <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginBottom:"14px"}}>Financial milestones</h2>
        {fc.milestones?.map((m:any,i:number)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"10px 14px",borderRadius:"12px",marginBottom:"8px",
            background:m.achievable?"rgba(16,185,129,0.06)":"rgba(148,163,184,0.06)",
            border:`1px solid ${m.achievable?"rgba(16,185,129,0.15)":"rgba(148,163,184,0.1)"}`,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"18px"}}>{m.achievable?"🎯":"⏳"}</span>
              <div>
                <p style={{fontSize:"12px",fontWeight:"600",color:"#1E293B"}}>{m.name}</p>
                <p style={{fontSize:"11px",color:"#94A3B8"}}>{formatCurrency(m.target,cur)}</p>
              </div>
            </div>
            <div style={{fontSize:"13px",fontWeight:"700",color:m.achievable?"#10B981":"#94A3B8"}}>
              {m.months_away>60?"60+ mo":`${m.months_away} mo`}
            </div>
          </div>
        ))}
      </div>

      {/* Investment products */}
      <div className="card-premium" style={{padding:"20px"}}>
        <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginBottom:"14px"}}>Recommended products</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          {fc.investment_products?.map((p:any,i:number)=>(
            <div key={i} style={{padding:"14px",borderRadius:"12px",border:"1px solid #F1F5F9",background:"#FAFAFA"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <p style={{fontSize:"12px",fontWeight:"700",color:"#0F172A"}}>{p.name}</p>
                <span style={{fontSize:"11px",fontWeight:"700",color:"#10B981",background:"rgba(16,185,129,0.1)",padding:"2px 8px",borderRadius:"20px"}}>{p.rate}</span>
              </div>
              <div style={{display:"flex",gap:"6px",marginBottom:"6px"}}>
                <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"20px",fontWeight:"600",color:"white",background:riskColors[p.risk]||"#94A3B8"}}>{p.risk} risk</span>
                <span style={{fontSize:"10px",color:"#94A3B8"}}>Min: {p.min}</span>
              </div>
              <p style={{fontSize:"10px",color:"#94A3B8"}}>{p.platform}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
