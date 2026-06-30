import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-bold text-white">FinanceAI</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">Beta</span>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-slate-400 text-sm">🇦🇪 UAE · 🇮🇳 India</span>
          <SignedOut>
            <Link href="/sign-in" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">Sign in</Link>
            <Link href="/sign-up" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors">
              Get started free
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors">
              Dashboard →
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          AI-powered · Free to start · No bank login required
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Your AI Personal<br/>Finance Operator
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Upload your bank statement. Get instant AI analysis — health score, categorised expenses,
          subscription intelligence, debt optimiser, and a 36-month savings forecast.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/sign-up"
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl text-lg transition-colors">
            Analyse my finances free →
          </Link>
          <Link href="/sign-in"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl text-lg transition-colors border border-white/10">
            Sign in
          </Link>
        </div>
        <p className="mt-5 text-slate-500 text-sm">PDF, CSV, Excel from any UAE or Indian bank · Takes 60 seconds</p>
      </section>

      {/* Stats bar */}
      <div className="border-y border-slate-800 py-8 mb-16">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-3 gap-8 text-center">
          {[
            { val: "AED 183B",  label: "Annual UAE remittances tracked" },
            { val: "12 agents", label: "AI agents analyse your data" },
            { val: "60 sec",    label: "From upload to full report" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-black text-emerald-400 mb-1">{s.val}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <h2 className="text-center text-3xl font-bold mb-12 text-white">
          Everything your finances need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon:"❤️", title:"Financial Health Score",        desc:"One 0–100 score across spending control, savings rate, debt health, and subscription efficiency.",            color:"#F43F5E" },
            { icon:"🤖", title:"AI Copilot with Memory",        desc:"Ask anything about your finances. Remembers past conversations and learns your patterns over time.",          color:"#10B981" },
            { icon:"🎯", title:"Goal Planner",                  desc:"Daily, weekly, monthly, and yearly milestones for your financial goals — emergency fund, car, home.",       color:"#3B82F6" },
            { icon:"🔁", title:"Subscription Intelligence",     desc:"Cancel or switch recommendations for every subscription with usage scoring and alternative suggestions.",    color:"#8B5CF6" },
            { icon:"💳", title:"Debt Optimizer",                desc:"Avalanche vs snowball strategy with payoff timeline and exact interest saved.",                             color:"#F59E0B" },
            { icon:"📈", title:"36-Month Savings Forecast",     desc:"Three scenarios (current, optimised, aggressive) projected across savings account, FD, and ETF returns.",   color:"#14B8A6" },
          ].map(f => (
            <div key={f.title}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-colors">
              <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-xl"
                style={{ background: f.color + "22" }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bank support */}
      <section className="max-w-4xl mx-auto px-8 pb-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Works with any bank in UAE or India</h2>
        <p className="text-slate-400 text-sm mb-8">Upload your statement as PDF, CSV, or Excel — no bank login, no API keys, no privacy risk</p>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-400">
          {["Emirates NBD","FAB","ADCB","Mashreq","HDFC","ICICI","SBI","Axis Bank","Kotak","Yes Bank","ENBD","DIB"].map(b=>(
            <span key={b} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">{b}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-8 pb-24 text-center">
        <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-3xl p-10">
          <h2 className="text-3xl font-black text-white mb-3">Start for free today</h2>
          <p className="text-slate-400 mb-6">No credit card · No bank login · Results in 60 seconds</p>
          <Link href="/sign-up"
            className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-colors">
            Upload my first statement →
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        FinanceAI · Built for UAE & India · Free AI-powered finance analysis
      </footer>
    </main>
  );
}
