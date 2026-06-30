"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useReport } from "@/hooks/useReport";

const NAV = [
  { href:"/dashboard",                 label:"Overview",           icon:"📊", group:"main" },
  { href:"/health-score",              label:"Health Score",       icon:"❤️",  group:"main" },
  { href:"/alerts",                    label:"Smart Alerts",       icon:"🔔", group:"main", badge:"alerts" },
  { href:"/upload",                    label:"Upload",             icon:"📁", group:"main" },
  { href:"/copilot",                   label:"AI Copilot",         icon:"🤖", group:"ai" },
  { href:"/goals",                     label:"Goals",              icon:"🎯", group:"ai" },
  { href:"/actions",                   label:"Goal Actions",       icon:"⚡", group:"ai" },
  { href:"/spending-behaviour",        label:"Spending Behaviour", icon:"🧠", group:"insights" },
  { href:"/subscription-intelligence", label:"Subscriptions",      icon:"🔁", group:"insights" },
  { href:"/debt-optimizer",            label:"Debt Optimizer",     icon:"💳", group:"insights" },
  { href:"/savings-forecast",          label:"Savings Forecast",   icon:"📈", group:"insights" },
  { href:"/insights",                  label:"Transactions",       icon:"💡", group:"insights" },
  { href:"/reports-history",           label:"Report History",     icon:"📋", group:"insights" },
  { href:"/retention",                 label:"Challenges",         icon:"🏆", group:"retention" },
];

const GROUPS: Record<string,string> = {
  main:"Core", ai:"AI Features", insights:"Insights", retention:"Gamification",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path            = usePathname();
  const { report }      = useReport();
  const alertCount      = report?.smart_alerts?.filter((a:any) => a.severity === "high").length || 0;
  const streak          = report?.retention?.streak?.current_streak || 0;

  const grouped = NAV.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof NAV>);

  return (
    <div style={{display:"flex",height:"100vh",background:"#F8FAFC"}}>
      {/* Sidebar */}
      <aside style={{
        width:"220px", background:"#0F172A", display:"flex",
        flexDirection:"column", flexShrink:0, overflowY:"auto",
      }}>
        {/* Logo */}
        <div style={{padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"10px",
              background:"linear-gradient(135deg,#10B981,#059669)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"14px",fontWeight:"800",color:"white"}}>F</div>
            <div>
              <div style={{color:"white",fontWeight:"700",fontSize:"14px",letterSpacing:"-0.3px"}}>FinanceAI</div>
              <div style={{color:"#10B981",fontSize:"10px",fontWeight:"500"}}>Phase 3 · v3.0</div>
            </div>
          </div>
          {streak > 0 && (
            <div style={{marginTop:"10px",padding:"6px 10px",
              background:"rgba(16,185,129,0.12)",borderRadius:"8px",
              border:"1px solid rgba(16,185,129,0.2)",
              display:"flex",alignItems:"center",gap:"6px"}}>
              <span style={{fontSize:"14px"}}>🔥</span>
              <span style={{color:"#10B981",fontSize:"11px",fontWeight:"600"}}>{streak} day streak</span>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <nav style={{flex:1,padding:"8px 8px"}}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{marginBottom:"4px"}}>
              <div style={{
                fontSize:"9px",fontWeight:"700",letterSpacing:"0.08em",
                color:"#475569",padding:"10px 8px 5px",textTransform:"uppercase",
              }}>{GROUPS[group]}</div>
              {items.map(item => {
                const active = path === item.href;
                return (
                  <Link key={item.href} href={item.href} style={{
                    display:"flex",alignItems:"center",gap:"8px",
                    padding:"7px 10px",borderRadius:"10px",
                    marginBottom:"1px",textDecoration:"none",
                    fontSize:"12px",fontWeight:active?"600":"400",
                    color: active ? "#10B981" : "#94A3B8",
                    background: active ? "rgba(16,185,129,0.12)" : "transparent",
                    borderRight: active ? "2px solid #10B981" : "2px solid transparent",
                    transition:"all 0.15s ease",
                  }}>
                    <span style={{fontSize:"14px"}}>{item.icon}</span>
                    <span style={{flex:1}}>{item.label}</span>
                    {item.badge === "alerts" && alertCount > 0 && (
                      <span style={{
                        background:"#F43F5E",color:"white",
                        fontSize:"9px",fontWeight:"700",
                        padding:"1px 5px",borderRadius:"10px",minWidth:"16px",textAlign:"center",
                      }}>{alertCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <UserButton afterSignOutUrl="/" />
            <span style={{color:"#64748B",fontSize:"11px"}}>Account</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflowY:"auto"}}>
        <div style={{padding:"32px",maxWidth:"1100px",margin:"0 auto"}}>
          {children}
        </div>
      </main>
    </div>
  );
}
