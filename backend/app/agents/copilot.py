"""
AI Financial Copilot — with session memory, self-learning, and smart suggestions.
"""
from app.services.groq_service import GroqService
from app.db.database import get_copilot_memory, save_copilot_memory
import json, re
from datetime import datetime

SYSTEM = """You are FinanceAI Copilot, a world-class personal financial advisor for UAE and India.

You have the user's complete financial data AND memory of past conversations below.

CORE RULES:
- Answer with SPECIFIC numbers from their data — never generic advice
- Never invent numbers not in the data. If data is missing, say so clearly.
- Reference past conversations naturally when relevant
- Be warm, direct, and encouraging — like a trusted CFO, not a robot

FORMATTING RULES (critical — follow exactly):
- If the user asks for a table, comparison, or breakdown → use a clean markdown table
- If the user asks for a list → use bullet points
- If the user asks a conversational question → 2-4 sentences max
- NEVER repeat the same sentence or phrase twice in a response
- NEVER trail off or loop — end cleanly after your answer
- Do not add filler phrases like "I hope this helps" or "Feel free to ask"

ANOMALY DETECTION:
- Proactively flag if you spot: unusual spike in a category, a new recurring charge, a month where spend > income, duplicate transactions, or a charge that doesn't match the user's normal patterns
- Only flag anomalies you can justify with numbers from the data

SUGGESTIONS LINE:
After your answer, on a NEW LINE write exactly:
SUGGESTIONS: ["question1","question2","question3"]
Questions must be specific to this user's data and the current topic."""

LEARNING_SYSTEM = """You are a financial pattern analyser. Given conversation history, extract 3-5 key learnings about this user's financial concerns, goals, and personality. Return JSON only:
{
  "concerns": ["string"],
  "goals": ["string"],
  "personality": "saver|spender|investor|anxious|confident",
  "recurring_topics": ["string"],
  "key_facts_learned": ["string"]
}"""


class CopilotAgent:
    def __init__(self):
        self.groq = GroqService()

    def chat(self, user_id: str, message: str, report: dict,
             session_history: list = None) -> dict:
        """
        Full chat with memory, learning, and suggestions.
        Returns: { reply, suggestions, memory_updated }
        """
        # Load persistent memory
        memory = get_copilot_memory(user_id)

        # Build context
        context = self._build_context(report, memory)

        # Build messages
        messages = [{"role": "system", "content": f"{SYSTEM}\n\n{context}"}]

        # Add session history (current conversation, last 8 turns)
        if session_history:
            for h in session_history[-8:]:
                messages.append({"role": h["role"], "content": h["content"]})

        messages.append({"role": "user", "content": message})

        try:
            response = self.groq.client.chat.completions.create(
                model=self.groq.model,
                max_tokens=800,       # Enough for a full table response
                messages=messages,
                temperature=0.5,      # Higher = less repetitive, more natural
                frequency_penalty=0.6, # Directly penalises repeating tokens
                presence_penalty=0.3,  # Encourages covering new ground
            )
            raw = response.choices[0].message.content

            # Parse reply and suggestions
            reply, suggestions = self._parse_response(raw)

            # Update memory asynchronously (extract learnings every 4 *lifetime*
            # exchanges, not session-scoped — so it works correctly even if the
            # user refreshes the page or returns the next day).
            lifetime_exchanges = memory.get("exchange_count", 0) + 1
            memory["exchange_count"] = lifetime_exchanges
            memory_updated = False
            if lifetime_exchanges % 4 == 0:
                memory = self._update_memory(user_id, message, reply, session_history, memory)
                memory_updated = True

            # Always log this exchange to memory
            self._log_exchange(user_id, message, reply, memory)

            return {
                "reply":          reply,
                "suggestions":    suggestions,
                "memory_updated": memory_updated,
                "user_profile":   memory.get("personality", ""),
            }

        except Exception as e:
            return {
                "reply":          f"I'm having trouble connecting. Please try again. ({str(e)[:60]})",
                "suggestions":    ["What is my savings rate?", "Which subscription costs the most?", "How can I save more?"],
                "memory_updated": False,
                "user_profile":   "",
            }

    def get_smart_suggestions(self, user_id: str, report: dict) -> list:
        """
        Generate contextually smart suggestions based on user data + memory.
        Called on page load — no user input needed.
        """
        memory  = get_copilot_memory(user_id)
        summary = report.get("summary", {}) if report else {}
        cur     = summary.get("currency", "AED")

        suggestions = []

        # Memory-based suggestions
        if memory.get("concerns"):
            for concern in memory["concerns"][:2]:
                suggestions.append(f"Update on {concern}?")

        # Data-based suggestions
        if report:
            waste = report.get("waste_items", [])
            if waste:
                top_waste = waste[0]
                suggestions.append(f"How much can I save by fixing {top_waste.get('waste_type','').replace('_',' ')}?")

            subs = report.get("subscription_intelligence", {})
            if subs.get("to_cancel_count", 0) > 0:
                suggestions.append(f"Which of my {subs['to_cancel_count']} unused subscriptions should I cancel?")

            debt = report.get("debt_plan", {})
            if debt.get("detected_debts"):
                suggestions.append(f"What is my fastest debt payoff path?")

            savings_rate = summary.get("net_savings", 0) / max(summary.get("total_income", 1), 1) * 100
            if savings_rate < 10:
                suggestions.append(f"My savings rate is only {savings_rate:.0f}%. What's the fastest way to improve it?")
            elif savings_rate > 25:
                suggestions.append(f"I'm saving {savings_rate:.0f}% of my income. Where should I invest the surplus?")

            cb = report.get("category_breakdown", {})
            if cb:
                top_cat = max(cb, key=cb.get)
                suggestions.append(f"Is my {top_cat} spend of {cur} {cb[top_cat]:.0f} reasonable?")

        # Fill up to 6 with generic good ones if needed
        fallback = [
            "Can I afford a major purchase right now?",
            "What should my next financial priority be?",
            "How do I build an emergency fund faster?",
            "Should I pay off debt or invest first?",
        ]
        for f in fallback:
            if len(suggestions) >= 6: break
            if f not in suggestions:
                suggestions.append(f)

        return suggestions[:6]

    def _build_context(self, report: dict, memory: dict) -> str:
        if not report:
            return "USER DATA: No statement uploaded yet. Answer general financial questions."

        summary = report.get("summary", {})
        cur = summary.get("currency", "AED")
        hs  = report.get("health_score", {})

        # Past memory context
        memory_ctx = ""
        if memory.get("concerns") or memory.get("recurring_topics"):
            memory_ctx = f"""
MEMORY FROM PAST CONVERSATIONS:
User's main concerns: {', '.join(memory.get('concerns', []))}
Recurring topics: {', '.join(memory.get('recurring_topics', []))}
Key facts learned: {', '.join(memory.get('key_facts_learned', []))}
User personality type: {memory.get('personality', 'unknown')}
Last talked: {memory.get('last_session', 'First session')}
"""

        # Format anomalies for context
        anomaly_data = report.get("anomalies", {})
        anomaly_list = anomaly_data.get("anomalies", [])
        anomaly_ctx  = ""
        if anomaly_list:
            critical = [a for a in anomaly_list if a.get("severity") == "critical"]
            anomaly_ctx = f"""
SPENDING ANOMALIES DETECTED ({anomaly_data.get('anomaly_count',0)} total, {anomaly_data.get('critical_count',0)} critical):
{chr(10).join(f"- [{a['severity'].upper()}] {a['title']}: {a['detail']}" for a in anomaly_list[:4])}
"""

        return f"""
{memory_ctx}
CURRENT FINANCIAL DATA ({cur}):
Health Score: {hs.get('overall_score', 'N/A')}/100 ({hs.get('label', '')})
Monthly income: {summary.get('total_income', 0):,.0f} {cur}
Monthly spend:  {summary.get('total_spend', 0):,.0f} {cur}
Net savings:    {summary.get('net_savings', 0):,.0f} {cur}
Savings rate:   {round(summary.get('net_savings',0)/max(summary.get('total_income',1),1)*100,1)}%

Category spend: {json.dumps(report.get('category_breakdown',{}), indent=2)}

Subscriptions ({len(report.get('subscriptions',[]))} total):
{self._fmt_subs(report.get('subscriptions',[]), cur)}

Waste identified:
{self._fmt_waste(report.get('waste_items',[]), cur)}

Debt: {report.get('debt_plan',{}).get('recommended_strategy','none')} strategy
Projected annual savings: {report.get('savings_forecast',{}).get('projections',{}).get('optimised',{}).get('12m',{}).get('etf_sip',0):,.0f} {cur}

Goals: {len(report.get('goals',{}).get('goals',[]))} active goals
{anomaly_ctx}
"""

    def _parse_response(self, raw: str) -> tuple:
        """Split LLM output into reply text and suggestions list."""
        suggestions = []
        reply       = raw

        # Extract SUGGESTIONS: [...] line
        match = re.search(r'SUGGESTIONS:\s*(\[.*?\])', raw, re.DOTALL)
        if match:
            try:
                suggestions = json.loads(match.group(1))
                reply = raw[:match.start()].strip()
            except Exception:
                pass

        # Fallback suggestions
        if not suggestions:
            suggestions = [
                "What's my biggest financial risk right now?",
                "How can I increase my savings rate?",
                "What should I do with my surplus cash?",
            ]

        return reply.strip(), suggestions[:3]

    def _update_memory(self, user_id: str, message: str, reply: str,
                       history: list, current_memory: dict) -> dict:
        """Use LLM to extract learnings from the conversation."""
        try:
            history_text = "\n".join(
                f"{h['role'].upper()}: {h['content']}" for h in history[-10:]
            )
            history_text += f"\nUSER: {message}\nAI: {reply}"

            data = self.groq.extract_json(LEARNING_SYSTEM, history_text, retries=2)

            # Merge with existing memory
            updated = {
                "concerns":         list(set(current_memory.get("concerns",[]) + data.get("concerns",[]))),
                "goals":            list(set(current_memory.get("goals",[])    + data.get("goals",[]))),
                "personality":      data.get("personality", current_memory.get("personality","unknown")),
                "recurring_topics": list(set(current_memory.get("recurring_topics",[]) + data.get("recurring_topics",[]))),
                "key_facts_learned":list(set(current_memory.get("key_facts_learned",[]) + data.get("key_facts_learned",[]))),
                "last_session":     datetime.now().strftime("%Y-%m-%d"),
                "session_count":    current_memory.get("session_count", 0) + 1,
                "exchange_count":   current_memory.get("exchange_count", 0),
                "exchanges":        current_memory.get("exchanges", []),
            }
            # Keep only last 20 entries per list
            for k in ["concerns","goals","recurring_topics","key_facts_learned"]:
                updated[k] = updated[k][-20:]

            save_copilot_memory(user_id, updated)
            return updated
        except Exception as e:
            print(f"[WARN] Memory update failed: {e}")
            return current_memory

    def _log_exchange(self, user_id: str, message: str, reply: str, memory: dict):
        """Log every exchange for memory context."""
        try:
            exchanges = memory.get("exchanges", [])
            exchanges.append({
                "date":    datetime.now().strftime("%Y-%m-%d %H:%M"),
                "user":    message[:200],
                "ai":      reply[:200],
            })
            memory["exchanges"] = exchanges[-30:]  # Keep last 30
            memory["last_session"] = datetime.now().strftime("%Y-%m-%d")
            save_copilot_memory(user_id, memory)
        except Exception as e:
            print(f"[WARN] Exchange log failed: {e}")

    def _fmt_subs(self, subs: list, cur: str) -> str:
        if not subs: return "None detected"
        return "\n".join(f"- {s.get('merchant')}: {cur} {s.get('amount')}/{s.get('frequency')}" for s in subs[:6])

    def _fmt_waste(self, waste: list, cur: str) -> str:
        if not waste: return "None detected"
        return "\n".join(f"- {w.get('waste_type')}: {cur} {w.get('monthly_loss')}/mo — {w.get('recommendation')}" for w in waste[:5])
