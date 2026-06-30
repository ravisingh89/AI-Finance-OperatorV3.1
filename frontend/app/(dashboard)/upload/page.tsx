"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const STEPS = [
  "Uploading file…","Parsing transactions…","Classifying with AI…","Detecting subscriptions…",
  "Calculating health score…","Building budget plan…","Optimising debt strategy…",
  "Forecasting savings…","Generating smart alerts…","Finalising report…",
];

export default function UploadPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File|null>(null);
  const [currency, setCurrency] = useState("AED");
  const [region, setRegion] = useState("UAE");
  const [status, setStatus] = useState<"idle"|"uploading"|"processing"|"done"|"error">("idle");
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setStatus("idle"); setErrorMsg(""); }
  },[]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {"application/pdf":[".pdf"],"text/csv":[".csv"],"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"]},
    maxSize: 15*1024*1024, multiple: false,
  });

  const handleSubmit = async () => {
    if (!file) return;
    setStatus("uploading"); setStep(0); setProgress(5);
    try {
      const token = await getToken();
      const { statement_id } = await api.upload(file, currency, region, token!);
      setStatus("processing"); setProgress(15);

      let stepIdx = 1;
      const stepTimer = setInterval(()=>{
        if (stepIdx < STEPS.length-1) { setStep(stepIdx); setProgress(15+(stepIdx/STEPS.length)*75); stepIdx++; }
      },1600);

      let done = false;
      for (let i=0;i<80&&!done;i++) {
        await new Promise(r=>setTimeout(r,2500));
        try {
          const { status:s } = await api.status(statement_id, token!);
          if (s==="done") done=true;
          if (s==="failed") throw new Error("Analysis failed. Please try again.");
        } catch(pollErr:any) { if (pollErr.message?.includes("failed")) throw pollErr; }
      }
      clearInterval(stepTimer);

      if (!done) {
        throw new Error("This is taking longer than expected. Your statement is still processing — check back on the dashboard in a minute, or try uploading a smaller file.");
      }

      setStep(STEPS.length-1); setProgress(100); setStatus("done");
      setTimeout(()=>router.push("/dashboard"),800);
    } catch(e:any) {
      setStatus("error"); setErrorMsg(e.message||"Something went wrong.");
    }
  };

  const isRunning = status==="uploading"||status==="processing";

  return (
    <div style={{maxWidth:"540px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"20px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A"}}>Upload Statement</h1>
        <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"4px"}}>PDF, CSV, or Excel · Up to 15MB · Any UAE or Indian bank</p>
      </div>

      <div style={{display:"flex",gap:"10px"}}>
        {[{label:"🇦🇪 UAE (AED)",r:"UAE",c:"AED"},{label:"🇮🇳 India (INR)",r:"India",c:"INR"}].map(opt=>(
          <button key={opt.r} onClick={()=>{setRegion(opt.r);setCurrency(opt.c);}} style={{
            flex:1,padding:"12px",borderRadius:"14px",cursor:"pointer",
            border:`1.5px solid ${region===opt.r?"#10B981":"#E2E8F0"}`,
            background:region===opt.r?"rgba(16,185,129,0.06)":"white",
            color:region===opt.r?"#059669":"#64748B",
            fontSize:"13px",fontWeight:"600",transition:"all 0.15s",
          }}>{opt.label}</button>
        ))}
      </div>

      {!isRunning && (
        <div {...getRootProps()} style={{
          border:`2px dashed ${isDragActive?"#10B981":file?"#34D399":"#E2E8F0"}`,
          borderRadius:"20px",padding:"48px 24px",textAlign:"center",cursor:"pointer",
          background:isDragActive?"rgba(16,185,129,0.04)":file?"rgba(16,185,129,0.02)":"white",
          transition:"all 0.2s",
        }}>
          <input {...getInputProps()}/>
          <div style={{fontSize:"40px",marginBottom:"14px"}}>{file?"✅":"📁"}</div>
          {file ? (
            <>
              <p style={{fontWeight:"700",color:"#059669",fontSize:"14px"}}>{file.name}</p>
              <p style={{fontSize:"12px",color:"#94A3B8",marginTop:"4px"}}>{(file.size/1024).toFixed(0)} KB · Click to change</p>
            </>
          ) : (
            <>
              <p style={{fontWeight:"600",color:"#374151",fontSize:"14px"}}>Drop your bank statement here</p>
              <p style={{fontSize:"12px",color:"#94A3B8",marginTop:"4px"}}>or click to browse</p>
            </>
          )}
        </div>
      )}

      {isRunning && (
        <div className="card-premium" style={{padding:"24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#10B981,#059669)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:"16px",height:"16px",border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            </div>
            <p style={{fontSize:"13px",fontWeight:"600",color:"#1E293B"}}>{STEPS[step]}</p>
          </div>
          <div style={{height:"8px",background:"#F1F5F9",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{height:"8px",borderRadius:"4px",background:"linear-gradient(90deg,#10B981,#059669)",width:`${progress}%`,transition:"width 0.7s ease"}}/>
          </div>
          <p style={{fontSize:"11px",color:"#94A3B8",marginTop:"8px",textAlign:"right"}}>{Math.round(progress)}%</p>
          <div style={{marginTop:"14px",display:"flex",flexDirection:"column",gap:"5px"}}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"11px",
                color:i<step?"#10B981":i===step?"#1E293B":"#CBD5E1",
                fontWeight:i===step?"600":"400"}}>
                <span>{i<step?"✓":i===step?"→":"·"}</span>{s}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isRunning && (
        <button onClick={handleSubmit} disabled={!file} className="btn-primary" style={{
          padding:"16px",fontSize:"14px",border:"none",cursor:file?"pointer":"not-allowed",
          opacity:file?1:0.4,
        }}>Analyse my finances →</button>
      )}

      {status==="error" && (
        <div style={{padding:"14px 16px",borderRadius:"12px",background:"rgba(244,63,94,0.06)",border:"1px solid rgba(244,63,94,0.2)"}}>
          <p style={{fontSize:"12px",color:"#F43F5E"}}>❌ {errorMsg}</p>
        </div>
      )}

      {!isRunning && (
        <div className="card-premium" style={{padding:"18px",background:"#F8FAFC",border:"none"}}>
          <p style={{fontSize:"11px",fontWeight:"700",color:"#374151",marginBottom:"10px"}}>Tips for best results</p>
          <div style={{display:"flex",flexDirection:"column",gap:"6px",fontSize:"11px",color:"#64748B"}}>
            <p>✓ Use text-based PDFs (not scanned photos)</p>
            <p>✓ CSV exports from your bank app work best</p>
            <p>✓ Include at least 1 month of transactions</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
