"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RetentionPage() {
  const { getToken }   = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"challenges"|"milestones"|"calendar"|"digest">("challenges");
  const [activatingId, setActivatingId] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BASE}/api/v1/retention`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch {} finally { setLoading(false); }
    })();
  }, [getToken]);

  const activateChallenge = async (id: string) => {
    setActivatingId(id);
    try {
      const token = await getToken();
      await fetch(`${BASE}/api/v1/retention/challenge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: id, status: "active" }),
      });
      setData((prev: any) => ({
        ...prev,
        retention: {
          ...prev.retention,
          challenges: prev.retention.challenges.map((c: any) =>
            c.id === id ? { ...c, active: true } : c
          ),
        },
      }));
    } catch {} finally { setActivatingId(null); }
  };

  if (loading) return <LoadingSpinner text="Loading your challenges…" />;
  if (!data?.retention) return <EmptyState message="Upload a statement to unlock challenges and streaks." />;

  const { retention, streak: savedStreak } = data;
  const streak     = retention.streak || {};
  const milestones = retention.milestones || [];
  const challenges = retention.challenges || [];
  const calendar   = retention.bill_calendar || [];
  const digest     = retention.weekly_digest || {};
  const reportCard = retention.report_card || {};
  const scoreTrend = retention.score_trend || {};

  const TABS = [
    { id:"challenges", label:"Challenges", icon:"🏋️" },
    { id:"milestones", label:"Milestones",  icon:"🏆" },
    { id:"calendar",   label:"Bill Calendar",icon:"📅" },
    { id:"digest",     label:"Weekly Digest",icon:"📊" },
  ];

  const diffColor = (d: string) =>
    d==="easy" ? "#10B981" : d==="medium" ? "#F59E0B" : "#F43F5E";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:"800",color:"#0F172A"}}>Challenges & Gamification</h1>
        <p style={{color:"#94A3B8",fontSize:"13px",marginTop:"4px"}}>Build financial habits through challenges and track your milestones</p>
      </div>

      {/* Streak hero */}
      <div style={{
        borderRadius:"20px",padding:"24px",
        background:"linear-gradient(135deg,#0F172A,#1E293B)",
        display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"20px",alignItems:"center",
      }}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
            <span style={{fontSize:"32px"}}>🔥</span>
            <div>
              <div style={{fontSize:"28px",fontWeight:"900",color:"white"}}>
                {streak.current_streak || 0} day streak
              </div>
              <div style={{fontSize:"12px",color:"#64748B"}}>
                Best: {streak.best_streak || 0} days · Level: {streak.level || "Bronze"}
              </div>
            </div>
          </div>
          {scoreTrend.trend !== "new" && (
            <div style={{
              display:"inline-flex",alignItems:"center",gap:"6px",
              padding:"5px 12px",borderRadius:"20px",marginTop:"8px",
              background: scoreTrend.trend==="up" ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
            }}>
              <span style={{color: scoreTrend.trend==="up"?"#10B981":"#F43F5E",fontSize:"12px",fontWeight:"600"}}>
                {scoreTrend.trend==="up"?"📈":"📉"} {scoreTrend.message}
              </span>
            </div>
          )}
        </div>

        {/* Report card grades */}
        {Object.keys(reportCard.letter_grades||{}).slice(0,3).map((key: string) => (
          <div key={key} style={{textAlign:"center"}}>
            <div style={{
              width:"52px",height:"52px",borderRadius:"14px",
              background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"22px",fontWeight:"900",
              color: reportCard.letter_grades[key]==="A+"||reportCard.letter_grades[key]==="A" ? "#10B981" :
                     reportCard.letter_grades[key]==="B" ? "#3B82F6" :
                     reportCard.letter_grades[key]==="C" ? "#F59E0B" : "#F43F5E",
            }}>
              {reportCard.letter_grades[key]}
            </div>
            <div style={{fontSize:"10px",color:"#64748B",marginTop:"5px",textTransform:"capitalize"}}>{key}</div>
          </div>
        ))}

        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"11px",color:"#64748B",marginBottom:"4px"}}>Today's points</div>
          <div style={{fontSize:"24px",fontWeight:"800",color:"#F59E0B"}}>+{streak.points_today||10}</div>
          <div style={{fontSize:"10px",color:"#64748B",marginTop:"2px"}}>pts</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"6px",background:"#F1F5F9",borderRadius:"12px",padding:"4px"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id as any)}
            style={{
              flex:1,padding:"8px 12px",borderRadius:"9px",border:"none",cursor:"pointer",
              fontSize:"12px",fontWeight:"600",transition:"all 0.15s",
              background:activeTab===t.id?"white":"transparent",
              color:activeTab===t.id?"#0F172A":"#64748B",
              boxShadow:activeTab===t.id?"0 1px 6px rgba(0,0,0,0.08)":"none",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Challenges */}
      {activeTab==="challenges" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
          {challenges.map((ch: any) => (
            <div key={ch.id} className="card-premium" style={{padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                <h3 style={{fontSize:"14px",fontWeight:"700",color:"#0F172A"}}>{ch.title}</h3>
                <span style={{
                  fontSize:"10px",fontWeight:"600",padding:"3px 8px",borderRadius:"6px",color:"white",
                  background:diffColor(ch.difficulty),
                }}>{ch.difficulty}</span>
              </div>
              <p style={{fontSize:"12px",color:"#64748B",lineHeight:"1.5",marginBottom:"12px"}}>{ch.description}</p>
              <div style={{
                padding:"8px 12px",borderRadius:"10px",background:"rgba(16,185,129,0.08)",
                border:"1px solid rgba(16,185,129,0.15)",marginBottom:"14px",
              }}>
                <span style={{fontSize:"11px",color:"#10B981",fontWeight:"600"}}>🎁 {ch.reward}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"11px",color:"#94A3B8"}}>⏱ {ch.duration}</span>
                {ch.active ? (
                  <span style={{
                    fontSize:"11px",fontWeight:"600",color:"#10B981",
                    padding:"5px 12px",borderRadius:"8px",background:"rgba(16,185,129,0.1)",
                  }}>✓ Active</span>
                ) : (
                  <button onClick={()=>activateChallenge(ch.id)}
                    disabled={activatingId===ch.id}
                    style={{
                      fontSize:"12px",fontWeight:"600",color:"white",padding:"6px 14px",
                      borderRadius:"9px",border:"none",cursor:"pointer",
                      background:"linear-gradient(135deg,#10B981,#059669)",
                      opacity:activatingId===ch.id?0.6:1,
                    }}>
                    {activatingId===ch.id?"Starting…":"Start →"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Milestones */}
      {activeTab==="milestones" && (
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {milestones.map((m: any) => (
            <div key={m.id} className="card-premium" style={{
              padding:"16px 20px",display:"flex",alignItems:"center",gap:"16px",
              opacity:m.achieved?1:0.65,
            }}>
              <div style={{
                width:"48px",height:"48px",borderRadius:"14px",flexShrink:0,
                background:m.achieved?"rgba(16,185,129,0.1)":"rgba(148,163,184,0.1)",
                border:`2px solid ${m.achieved?"rgba(16,185,129,0.3)":"rgba(148,163,184,0.2)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",
              }}>{m.icon}</div>
              <div style={{flex:1}}>
                <p style={{fontSize:"13px",fontWeight:"600",color:"#0F172A"}}>{m.title}</p>
                <p style={{fontSize:"11px",color:"#94A3B8",marginTop:"2px"}}>{m.description}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{
                  fontSize:"13px",fontWeight:"700",
                  color:m.achieved?"#F59E0B":"#94A3B8",
                }}>+{m.points} pts</div>
                {m.achieved && (
                  <div style={{fontSize:"10px",color:"#10B981",marginTop:"3px",fontWeight:"600"}}>✓ Achieved</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill Calendar */}
      {activeTab==="calendar" && (
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {calendar.length===0 && (
            <div className="card-premium" style={{padding:"40px",textAlign:"center",color:"#94A3B8"}}>
              No upcoming bills detected. Upload more months of statements for better predictions.
            </div>
          )}
          {calendar.map((bill: any, i: number) => {
            const statusColor =
              bill.status==="overdue"  ? "#F43F5E" :
              bill.status==="due_soon" ? "#F59E0B" : "#10B981";
            const statusBg =
              bill.status==="overdue"  ? "rgba(244,63,94,0.08)" :
              bill.status==="due_soon" ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.05)";
            return (
              <div key={i} className="card-premium" style={{
                padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",
                background:statusBg,border:`1px solid ${statusColor}25`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  <div style={{
                    width:"40px",height:"40px",borderRadius:"10px",flexShrink:0,
                    background:statusColor+"18",border:`1px solid ${statusColor}30`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"11px",fontWeight:"700",color:statusColor,
                    lineHeight:"1.2",textAlign:"center",
                  }}>
                    {bill.days_away===0?"TODAY":bill.days_away<0?`${Math.abs(bill.days_away)}d\noverdue`:`${bill.days_away}d`}
                  </div>
                  <div>
                    <p style={{fontSize:"13px",fontWeight:"600",color:"#0F172A"}}>{bill.merchant}</p>
                    <p style={{fontSize:"11px",color:"#94A3B8"}}>{bill.due_date}</p>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:"15px",fontWeight:"700",color:"#0F172A"}}>
                    {digest.currency||"AED"} {bill.amount}
                  </p>
                  <span style={{
                    fontSize:"10px",fontWeight:"600",padding:"2px 8px",borderRadius:"6px",
                    background:statusColor+"18",color:statusColor,
                  }}>{bill.status.replace("_"," ")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Digest */}
      {activeTab==="digest" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div style={{
            borderRadius:"20px",padding:"24px",
            background:"linear-gradient(135deg,#0F172A,#1E293B)",
          }}>
            <h2 style={{color:"white",fontSize:"16px",fontWeight:"700",marginBottom:"4px"}}>
              📊 {digest.title}
            </h2>
            <p style={{color:"#64748B",fontSize:"12px",marginBottom:"20px"}}>Your financial summary</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
              {[
                {label:"Total spend",   val:formatCurrency(digest.total_spend||0, digest.currency||"AED"), color:"#F43F5E"},
                {label:"Daily average", val:formatCurrency(digest.avg_daily_spend||0, digest.currency||"AED"), color:"#F59E0B"},
                {label:"Saved",         val:formatCurrency(digest.savings_this_period||0, digest.currency||"AED"), color:"#10B981"},
              ].map(m=>(
                <div key={m.label} style={{
                  padding:"14px",borderRadius:"12px",background:"rgba(255,255,255,0.06)",
                  border:"1px solid rgba(255,255,255,0.08)",
                }}>
                  <p style={{fontSize:"10px",color:"#64748B",marginBottom:"5px"}}>{m.label}</p>
                  <p style={{fontSize:"16px",fontWeight:"800",color:m.color}}>{m.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-premium" style={{padding:"20px"}}>
            <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginBottom:"14px"}}>Highlights</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {(digest.highlights||[]).map((h: string, i: number) => (
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:"10px",
                  padding:"10px 14px",borderRadius:"10px",background:"#F8FAFC",
                }}>
                  <span style={{fontSize:"16px"}}>{i===0?"📱":i===1?"🏷️":"📆"}</span>
                  <p style={{fontSize:"12px",color:"#374151"}}>{h}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-premium" style={{padding:"20px"}}>
            <h2 style={{fontSize:"14px",fontWeight:"600",color:"#0F172A",marginBottom:"14px"}}>
              Top category: <span style={{color:"#3B82F6",textTransform:"capitalize"}}>{digest.top_category}</span>
            </h2>
            <div style={{height:"8px",background:"#F1F5F9",borderRadius:"4px",overflow:"hidden"}}>
              <div style={{
                height:"8px",borderRadius:"4px",background:"linear-gradient(90deg,#3B82F6,#6366F1)",
                width:`${Math.min(100, ((digest.top_category_amount||0)/(digest.total_spend||1))*100)}%`,
                transition:"width 1.2s ease",
              }}/>
            </div>
            <p style={{fontSize:"11px",color:"#94A3B8",marginTop:"6px"}}>
              {formatCurrency(digest.top_category_amount||0, digest.currency||"AED")} of {formatCurrency(digest.total_spend||0, digest.currency||"AED")} total
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
