"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { api, ChatMessage } from "@/lib/api";
import { useReport } from "@/hooks/useReport";
import ReactMarkdown from "react-markdown";

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "5px", padding: "10px 14px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="typing-dot" style={{
          width: "7px", height: "7px", borderRadius: "50%", background: "#94A3B8",
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </div>
  );
}

function SuggestionPill({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left", fontSize: "11px", padding: "7px 12px",
      background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px",
      color: "#475569", cursor: "pointer", lineHeight: "1.4", transition: "all 0.15s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F0FDF4"; (e.currentTarget as HTMLElement).style.borderColor = "#10B981"; (e.currentTarget as HTMLElement).style.color = "#059669"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLElement).style.color = "#475569"; }}
    >
      {text}
    </button>
  );
}

// Renders AI reply — supports markdown tables, bullets, and prose
function AiMessage({ content }: { content: string }) {
  return (
    <div style={{ fontSize: "13px", lineHeight: "1.65", color: "#374151" }}>
      <ReactMarkdown
        components={{
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "8px 0" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: "#F8FAFC" }}>{children}</thead>,
          th: ({ children }) => (
            <th style={{ padding: "7px 12px", borderBottom: "2px solid #E2E8F0", textAlign: "left", fontWeight: "700", color: "#0F172A", whiteSpace: "nowrap" }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ padding: "7px 12px", borderBottom: "1px solid #F1F5F9", color: "#374151" }}>
              {children}
            </td>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          ul: ({ children }) => <ul style={{ paddingLeft: "18px", margin: "6px 0" }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
          strong: ({ children }) => <strong style={{ color: "#0F172A", fontWeight: "700" }}>{children}</strong>,
          p: ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const DEFAULT_SUGGESTIONS = [
  "What is my biggest financial risk right now?",
  "Show me a breakdown of my spend by category as a table",
  "Which subscription should I cancel first?",
  "How do I build my emergency fund faster?",
  "Should I pay off debt or invest first?",
  "What is my savings rate this month?",
];

export default function CopilotPage() {
  const { getToken }                = useAuth();
  const { report }                  = useReport();
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [userProfile, setUserProfile] = useState("");
  const [memoryActive, setMemoryActive] = useState(false);
  const [loadingSug, setLoadingSug] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data  = await api.suggestions(token!);
        if (data.suggestions?.length) setSuggestions(data.suggestions);
      } catch {} finally { setLoadingSug(false); }
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
      setMessages(prev => [...prev, { role: "assistant", content: result.reply }]);
      if (result.suggestions?.length) setSuggestions(result.suggestions);
      if (result.user_profile)        setUserProfile(result.user_profile);
      if (result.memory_updated)      setMemoryActive(true);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    } finally { setLoading(false); }
  }, [loading, messages, getToken]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A" }}>AI Financial Copilot</h1>
          {memoryActive && (
            <span style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", fontSize: "10px", fontWeight: "600", color: "#10B981" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} className="animate-pulse" />
              Memory active
            </span>
          )}
          {userProfile && (
            <span style={{ fontSize: "10px", background: "#F1F5F9", color: "#64748B", padding: "4px 10px", borderRadius: "20px", textTransform: "capitalize" }}>
              🎯 {userProfile} profile
            </span>
          )}
        </div>
        <p style={{ color: "#94A3B8", fontSize: "12px", marginTop: "3px" }}>
          Grounded in your real data · Supports tables, lists & analysis · Learns from every conversation
        </p>
      </div>

      {!report && (
        <div style={{ flexShrink: 0, padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", marginBottom: "12px", fontSize: "12px", color: "#D97706" }}>
          ⚠️ No financial data loaded. Upload a bank statement for personalised answers.
        </div>
      )}

      {/* Chat window */}
      <div style={{ flex: 1, background: "white", borderRadius: "20px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: "32px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🤖</div>
              <p style={{ fontWeight: "700", color: "#0F172A", fontSize: "16px", marginBottom: "4px" }}>Your AI Financial Advisor</p>
              <p style={{ color: "#94A3B8", fontSize: "12px", marginBottom: "24px" }}>Ask in any format — tables, lists, or plain questions</p>
              <p style={{ fontSize: "11px", color: "#CBD5E1", marginBottom: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {loadingSug ? "Loading suggestions…" : "Suggested questions"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", maxWidth: "480px", margin: "0 auto" }}>
                {loadingSug
                  ? Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: "38px", borderRadius: "10px" }} />)
                  : suggestions.map(s => <SuggestionPill key={s} text={s} onClick={() => send(s)} />)
                }
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: "8px" }}>
              {m.role === "assistant" && (
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: "white", flexShrink: 0, marginTop: "2px" }}>F</div>
              )}
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? "linear-gradient(135deg,#0F172A,#1E293B)" : "white", color: m.role === "user" ? "white" : "inherit", border: m.role === "assistant" ? "1px solid #E2E8F0" : "none", fontSize: m.role === "user" ? "13px" : "inherit" }}>
                {m.role === "user" ? m.content : <AiMessage content={m.content} />}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: "white", flexShrink: 0 }}>F</div>
              <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "18px 18px 18px 4px" }}><TypingDots /></div>
            </div>
          )}

          {/* Follow-up suggestions after last AI reply */}
          {messages.length > 0 && !loading && suggestions.length > 0 && (
            <div style={{ paddingLeft: "36px" }}>
              <p style={{ fontSize: "10px", color: "#CBD5E1", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Follow-ups</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {suggestions.map(s => <SuggestionPill key={s} text={s} onClick={() => send(s)} />)}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: "1px solid #F1F5F9", padding: "14px 16px", display: "flex", gap: "10px" }}>
          <input ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(input))}
            placeholder="Ask anything — tables, lists, or analysis…"
            style={{ flex: 1, fontSize: "13px", padding: "10px 14px", borderRadius: "12px", border: "1px solid #E2E8F0", outline: "none", background: "#FAFAFA", transition: "all 0.15s" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#10B981"; e.currentTarget.style.background = "white"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#FAFAFA"; }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            style={{ padding: "10px 20px", background: "linear-gradient(135deg,#10B981,#059669)", color: "white", fontSize: "13px", fontWeight: "700", borderRadius: "12px", border: "none", cursor: "pointer", opacity: !input.trim() || loading ? 0.4 : 1, transition: "opacity 0.15s" }}>
            Send →
          </button>
        </div>
      </div>
    </div>
  );
}
