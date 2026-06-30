"use client";
import { useReport } from "@/hooks/useReport";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";

const CAT_COLORS: Record<string,{bg:string;text:string}> = {
  groceries:{bg:"#DCFCE7",text:"#15803D"},transport:{bg:"#DBEAFE",text:"#1D4ED8"},
  dining:{bg:"#FEF3C7",text:"#D97706"},subscriptions:{bg:"#F3E8FF",text:"#7C3AED"},
  shopping:{bg:"#FCE7F3",text:"#BE185D"},rent:{bg:"#FEE2E2",text:"#DC2626"},
  salary:{bg:"#DCFCE7",text:"#15803D"},utilities:{bg:"#CFFAFE",text:"#0E7490"},
  debt:{bg:"#FEE2E2",text:"#DC2626"},investments:{bg:"#EDE9FE",text:"#5B21B6"},
  healthcare:{bg:"#CCFBF1",text:"#0F766E"},entertainment:{bg:"#FDF4FF",text:"#A21CAF"},
  other:{bg:"#F1F5F9",text:"#475569"},
};

export default function TransactionsPage() {
  const { report, loading, error } = useReport();
  const [search, setSearch]   = useState("");
  const [catFilter, setCat]   = useState("all");
  const [typeFilter, setType] = useState("all");
  const [sortBy, setSortBy]   = useState<"date"|"amount">("date");

  if (loading) return <LoadingSpinner text="Loading transactions…" />;
  if (error || !report) return <EmptyState />;

  const txs: any[] = report.classified_transactions || [];
  const cur = report.summary.currency;
  const cats = useMemo(()=>["all",...Array.from(new Set(txs.map((t:any)=>t.category||"other")))],[txs]);

  const filtered = useMemo(()=>txs
    .filter(t=>(catFilter==="all"||t.category===catFilter)&&
                (typeFilter==="all"||t.type===typeFilter)&&
                (search===""||t.merchant?.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b)=>sortBy==="amount"?b.amount-a.amount:new Date(b.date).getTime()-new Date(a.date).getTime())
  ,[txs,catFilter,typeFilter,search,sortBy]);

  const totalSpend  = filtered.filter((t:any)=>t.type==="debit").reduce((s:number,t:any)=>s+t.amount,0);
  const totalCredit = filtered.filter((t:any)=>t.type==="credit").reduce((s:number,t:any)=>s+t.amount,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A"}}>Transactions</h1>
        <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"4px"}}>{txs.length} total · {filtered.length} shown</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
        {[
          {label:"Filtered spend", val:formatCurrency(totalSpend,cur), color:"#F43F5E"},
          {label:"Filtered income",val:formatCurrency(totalCredit,cur),color:"#10B981"},
          {label:"Shown",          val:String(filtered.length),        color:"#3B82F6"},
        ].map(m=>(
          <div key={m.label} className="card-premium" style={{padding:"14px 16px"}}>
            <div style={{fontSize:"10px",color:"#94A3B8",marginBottom:"5px"}}>{m.label}</div>
            <div style={{fontSize:"18px",fontWeight:"800",color:m.color}}>{m.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:"180px"}}>
          <span style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",fontSize:"14px"}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search merchant…"
            style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:"10px",border:"1px solid #E2E8F0",fontSize:"12px",outline:"none",background:"white"}}/>
        </div>
        <div style={{display:"flex",background:"#F1F5F9",borderRadius:"10px",padding:"3px"}}>
          {["all","debit","credit"].map(t=>(
            <button key={t} onClick={()=>setType(t)} style={{
              padding:"6px 12px",borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"600",
              background:typeFilter===t?"white":"transparent",color:typeFilter===t?"#0F172A":"#64748B",
              boxShadow:typeFilter===t?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s",
            }}>{t==="all"?"All":t==="debit"?"Spend":"Income"}</button>
          ))}
        </div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)}
          style={{padding:"8px 12px",borderRadius:"10px",border:"1px solid #E2E8F0",fontSize:"12px",background:"white",cursor:"pointer",outline:"none"}}>
          <option value="date">Latest first</option>
          <option value="amount">Highest amount</option>
        </select>
      </div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        {cats.map(c=>{const s=CAT_COLORS[c]||CAT_COLORS.other;const active=catFilter===c;return(
          <button key={c} onClick={()=>setCat(c)} style={{
            padding:"4px 12px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"600",
            background:active?s.bg:"white",color:active?s.text:"#94A3B8",
            boxShadow:active?`0 0 0 1.5px ${s.text}`:"0 0 0 1px #E2E8F0",transition:"all 0.15s",
          }}>{c}</button>
        );})}
      </div>
      <div className="card-premium" style={{padding:"0",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"110px 1fr 100px 90px 70px",gap:"10px",
          padding:"10px 20px",background:"#F8FAFC",borderBottom:"1px solid #F1F5F9",
          fontSize:"10px",fontWeight:"700",color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em"}}>
          <span>Date</span><span>Merchant</span><span>Category</span>
          <span style={{textAlign:"right"}}>Amount</span><span style={{textAlign:"right"}}>Type</span>
        </div>
        {filtered.slice(0,200).map((tx:any,i:number)=>{
          const s=CAT_COLORS[tx.category||"other"]||CAT_COLORS.other;
          return(
          <div key={i} style={{display:"grid",gridTemplateColumns:"110px 1fr 100px 90px 70px",gap:"10px",
            padding:"10px 20px",alignItems:"center",borderBottom:i<filtered.length-1?"1px solid #F8FAFC":"none",transition:"background 0.1s"}}
            onMouseEnter={e=>(e.currentTarget.style.background="#F8FAFC")}
            onMouseLeave={e=>(e.currentTarget.style.background="white")}>
            <span style={{fontSize:"11px",color:"#94A3B8"}}>{tx.date}</span>
            <span style={{fontSize:"13px",fontWeight:"500",color:"#1E293B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.merchant||"Unknown"}</span>
            <span style={{fontSize:"10px",fontWeight:"600",padding:"3px 8px",borderRadius:"6px",background:s.bg,color:s.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}}>{tx.category||"other"}</span>
            <span style={{fontSize:"13px",fontWeight:"700",textAlign:"right",color:tx.type==="credit"?"#10B981":"#1E293B"}}>
              {tx.type==="credit"?"+":""}{formatCurrency(tx.amount,tx.currency||cur)}
            </span>
            <span style={{fontSize:"10px",fontWeight:"600",textAlign:"right",color:tx.type==="credit"?"#10B981":"#64748B"}}>{tx.type}</span>
          </div>
        );})}
        {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#94A3B8",fontSize:"13px"}}>No transactions match your filters</div>}
      </div>
    </div>
  );
}
