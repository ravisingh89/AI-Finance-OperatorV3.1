"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { api, ChatMessage } from "@/lib/api";
import { useReport } from "@/hooks/useReport";

function TypingDots() {
  return (
    <div className="flex gap-1.5 px-4 py-3">
      {[0,1,2].map(i=>(
        <div key={i} className="w-2 h-2 rounded-full bg-slate-300 typing-dot" style={{animationDelay:`${i*0.2}s`}}/>
      ))}
    </div>
  );
}

function SuggestionPill({ text, onClick }: { text:string; onClick:()=>void }) {
  return (
    <button onClick={onClick}
      className="text-left text-xs px-3 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-slate-600 hover:text-emerald-700 transition-all leading-snug">
      {text}
    </button>
  );
}

export default function CopilotPage() {
  const { getToken }       = useAuth();
  const { report }         = useReport();
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState("");
  const [loadingSug, setLoadingSug]   = useState(true);
  const [memoryActive, setMemoryActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, loading]);

  // Load smart suggestions on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data  = await api.suggestions(token!);
        setSuggestions(data.suggestions);
      } catch { setSuggestions(DEFAULT_SUGGESTIONS); }
      finally { setLoadingSug(false); }
    })();
  }, [getToken]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      const token  = await getToken();
      const result = await api.chat(text, [...messages, userMsg], token!);

      setMessages(prev => [...prev, { role:"assistant", content: result.reply }]);
      if (result.suggestions?.length) setSuggestions(result.suggestions);
      if (result.user_profile)        setUserProfile(result.user_profile);
      if (result.memory_updated)      setMemoryActive(true);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"Sorry, I couldn't connect. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, getToken]);

  const hasReport = !!report;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 80px)"}}>
      {/* Header */}
      <div className="flex-shrink-0 mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">AI Financial Copilot</h1>
            {memoryActive && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                Memory active
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Answers grounded in your real financial data · Learns from every conversation
          </p>
        </div>
        {userProfile && (
          <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full capitalize">
            🎯 {userProfile} profile
          </div>
        )}
      </div>

      {!hasReport && (
        <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
          ⚠️ No financial data uploaded yet — upload a bank statement for personalised advice.
        </div>
      )}

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🤖</div>
              <p className="font-semibold text-slate-800 mb-1">Your AI Financial Advisor</p>
              <p className="text-slate-400 text-sm mb-6">
                Powered by your real data · Remembers past conversations
              </p>

              {/* Smart suggestions */}
              <div className="max-w-lg mx-auto">
                <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">
                  {loadingSug ? "Loading personalised suggestions…" : "Suggested questions for you"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {loadingSug
                    ? Array(6).fill(0).map((_,i)=>(
                        <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse"/>
                      ))
                    : suggestions.map(s=>(
                        <SuggestionPill key={s} text={s} onClick={()=>send(s)} />
                      ))
                  }
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              {m.role==="assistant" && (
                <div className="w-7 h-7 rounded-full gradient-emerald flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">F</div>
              )}
              <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed
                ${m.role==="user"?"chat-bubble-user":"chat-bubble-ai text-slate-700"}`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full gradient-emerald flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">F</div>
              <div className="chat-bubble-ai"><TypingDots /></div>
            </div>
          )}

          {/* Live suggestions after each AI reply */}
          {messages.length > 0 && !loading && suggestions.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-2 ml-9">Suggested follow-ups:</p>
              <div className="flex flex-wrap gap-2 ml-9">
                {suggestions.map(s=>(
                  <SuggestionPill key={s} text={s} onClick={()=>send(s)} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-100 p-4 flex gap-3">
          <input ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send(input))}
            placeholder="Ask anything about your finances…"
            className="flex-1 text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition-colors"
          />
          <button onClick={()=>send(input)} disabled={!input.trim()||loading}
            className="px-5 py-2.5 gradient-emerald text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            Send →
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SUGGESTIONS = [
  "What is my biggest financial risk?",
  "Which subscription should I cancel?",
  "How do I build an emergency fund?",
  "Should I pay debt or invest first?",
  "Am I spending too much on dining?",
  "What is my savings rate?",
];
