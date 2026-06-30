"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

const REC_STYLE: Record<string,{bg:string;border:string;badge:string;label:string}> = {
  cancel: {bg:"rgba(244,63,94,0.06)", border:"rgba(244,63,94,0.2)",  badge:"#F43F5E", label:"Cancel"},
  switch: {bg:"rgba(245,158,11,0.06)",border:"rgba(245,158,11,0.2)", badge:"#F59E0B", label:"Switch"},
  keep:   {bg:"rgba(16,185,129,0.06)",border:"rgba(16,185,129,0.2)", badge:"#10B981", label:"Keep"},
};

export default function SubscriptionIntelligencePage() {
  const { report, loading, error } = useReport();
  const [filter, setFilter] = useState<"all"|"cancel"|"switch"|"keep">("all");

  if (loading) return <LoadingSpinner text="Analysing subscriptions…"/>;
  if (error||!report) return <EmptyState/>;
  const intel = report.subscription_intelligence;
  if (!intel?.subscriptions?.length) return <EmptyState message="No subscriptions detected."/>;

  const cur = intel.currency;
  const subs = filter==="all" ? intel.subscriptions : intel.subscriptions.filter((s:any)=>s.recommendation===filter);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A"}}>Subscription Intelligence</h1>
        <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"4px"}}>Deep analysis with cancel & switch recommendations</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {label:"Monthly total",    val:formatCurrency(intel.total_monthly,cur),    color:"#0F172A"},
          {label:"Annual total",     val:formatCurrency(intel.total_annual,cur),     color:"#F43F5E"},
          {label:"Potential saving", val:formatCurrency(intel.potential_saving,cur), color:"#10B981"},
          {label:"Action needed",    val:`${intel.to_cancel_count+intel.to_switch_count} subs`, color:"#F59E0B"},
        ].map(c=>(
          <div key={c.label} className="card-premium" style={{padding:"16px"}}>
            <div style={{fontSize:"10px",color:"#94A3B8",marginBottom:"5px"}}>{c.label}</div>
            <div style={{fontSize:"17px",fontWeight:"800",color:c.color}}>{c.val}</div>
          </div>
        ))}
      </div>

      {intel.overlap_warning && (
        <div style={{padding:"12px 16px",borderRadius:"12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
          <p style={{fontSize:"12px",color:"#D97706",fontWeight:"500"}}>⚠️ {intel.overlap_warning}</p>
        </div>
      )}

      <div style={{display:"flex",gap:"6px"}}>
        {(["all","cancel","switch","keep"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"7px 14px",borderRadius:"20px",border:"none",cursor:"pointer",
            fontSize:"11px",fontWeight:"600",transition:"all 0.15s",textTransform:"capitalize",
            background:filter===f?"#0F172A":"white",
            color:filter===f?"white":"#64748B",
            boxShadow:filter===f?"none":"0 0 0 1px #E2E8F0",
          }}>{f} {f!=="all"&&`(${intel.subscriptions.filter((s:any)=>s.recommendation===f).length})`}</button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
        {subs.map((sub:any)=>{
          const style = REC_STYLE[sub.recommendation]||REC_STYLE.keep;
          return (
            <div key={sub.merchant} className="card-premium" style={{padding:"18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"24px"}}>{sub.icon}</span>
                  <div>
                    <p style={{fontSize:"13px",fontWeight:"700",color:"#0F172A"}}>{sub.merchant}</p>
                    <p style={{fontSize:"11px",color:"#94A3B8",textTransform:"capitalize"}}>{sub.category} · {sub.frequency}</p>
                  </div>
                </div>
                <span style={{fontSize:"10px",fontWeight:"700",padding:"3px 10px",borderRadius:"20px",color:"white",background:style.badge}}>{style.label}</span>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
                <div style={{padding:"8px",borderRadius:"8px",background:"#F8FAFC",textAlign:"center"}}>
                  <div style={{fontSize:"9px",color:"#94A3B8"}}>Monthly</div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:"#1E293B"}}>{formatCurrency(sub.monthly_cost,cur)}</div>
                </div>
                <div style={{padding:"8px",borderRadius:"8px",background:"#F8FAFC",textAlign:"center"}}>
                  <div style={{fontSize:"9px",color:"#94A3B8"}}>Annual</div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:"#1E293B"}}>{formatCurrency(sub.annual_cost,cur)}</div>
                </div>
              </div>

              <div style={{marginBottom:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"4px"}}>
                  <span style={{color:"#94A3B8"}}>Usage score</span>
                  <span style={{fontWeight:"700",color:sub.usage_score>=70?"#10B981":sub.usage_score>=45?"#F59E0B":"#F43F5E"}}>{sub.usage_score}/100</span>
                </div>
                <div style={{height:"6px",background:"#F1F5F9",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"6px",borderRadius:"3px",width:`${sub.usage_score}%`,
                    background:sub.usage_score>=70?"#10B981":sub.usage_score>=45?"#F59E0B":"#F43F5E",
                    transition:"width 1s ease"}}/>
                </div>
              </div>

              <div style={{padding:"10px 12px",borderRadius:"10px",fontSize:"11px",background:style.bg,border:`1px solid ${style.border}`,color:"#374151"}}>
                {sub.rec_reason}
              </div>

              {sub.alternative && (
                <div style={{marginTop:"8px",display:"flex",justifyContent:"space-between",fontSize:"11px",
                  background:"rgba(16,185,129,0.06)",borderRadius:"8px",padding:"8px 12px",color:"#10B981"}}>
                  <span>Switch to <strong>{sub.alternative.name}</strong></span>
                  <span style={{fontWeight:"700"}}>Save {formatCurrency(sub.alternative.saving,cur)}/mo</span>
                </div>
              )}

              <div style={{marginTop:"8px",fontSize:"10px",color:"#94A3B8"}}>
                Next renewal: {sub.next_renewal!=="Unknown"?sub.next_renewal:"—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
