"""Market Trends Agent — AI sentiment for 7 asset classes."""
from app.services.groq_service import GroqService
from datetime import datetime

GLOBAL_DISCLAIMER = ("📡 MARKET DATA DISCLAIMER: Trends shown are AI-generated estimates "
    "based on general market knowledge — NOT real-time data. This is NOT investment advice. "
    "FinanceAI does not own, promote, or accept responsibility for gains or losses from "
    "decisions made using this data. Trade and invest at your own risk.")

SEC_DISCLAIMER = "For informational purposes only. Not investment advice. Invest at your own risk."

SYSTEM = """You are a market analyst. Return ONLY valid JSON — no markdown:
{"last_updated":"ISO string","sections":[{"id":"string","name":"string","icon":"emoji",
"sentiment":"bullish|bearish|neutral","summary":"2 sentences","ai_view":"buy|sell|hold",
"ai_reasoning":"2 sentences","timeframes":{"minutes":"string","hourly":"string","daily":"string",
"weekly":"string","monthly":"string"},"risk_level":"very_high|high|medium|low",
"key_drivers":["string","string"],"watch_out_for":"string","disclaimer":"string"}],
"global_disclaimer":"string"}
Rules: balanced view, never endorse specific companies, include risks."""


class MarketTrendsAgent:
    SECTIONS = [("crypto","Cryptocurrency","₿","very_high"),("equities","Stock Market","📈","high"),
        ("mutual_funds","Mutual Funds / ETF","🏦","medium"),("real_estate","Real Estate","🏠","medium"),
        ("gold_silver","Gold & Silver","🥇","low"),("fixed_income","FD / RD / Bonds","🏛️","low"),
        ("forex","Forex / Remittance","💱","high")]

    def __init__(self, region: str = "UAE", currency: str = "AED"):
        self.groq = GroqService(); self.region = region; self.currency = currency

    def run(self) -> dict:
        is_uae = self.region == "UAE"
        msg = (f"Generate current market sentiment for {self.region} investors for these 7 sectors:\n"
            f"1. Crypto (BTC,ETH,major altcoins)\n"
            f"2. Stocks ({'UAE DFM/ADX' if is_uae else 'BSE/NSE Nifty/Sensex'})\n"
            f"3. Mutual Funds/ETFs ({'global ETFs via Sarwa/StashAway' if is_uae else 'Nifty index funds'})\n"
            f"4. Real Estate ({'Dubai/Abu Dhabi' if is_uae else 'Indian residential/commercial'})\n"
            f"5. Gold & Silver (global spot, {'DGCX' if is_uae else 'MCX'})\n"
            f"6. Fixed Income ({'UAE FD 4-5%' if is_uae else 'India FD/PPF/RD'})\n"
            f"7. Forex ({'AED/USD peg, USD/INR remittance' if is_uae else 'INR/USD, RBI policy'})\n"
            f"Use ids: crypto,equities,mutual_funds,real_estate,gold_silver,fixed_income,forex\n"
            f"Base on 2024-2025 market knowledge. disclaimer:\"{SEC_DISCLAIMER}\" on every section.")
        try:
            data = self.groq.extract_json(SYSTEM, msg, retries=3)
            data["last_updated"] = datetime.utcnow().isoformat()
            data["currency"] = self.currency
            data["global_disclaimer"] = GLOBAL_DISCLAIMER
            for s in data.get("sections", []): s["disclaimer"] = SEC_DISCLAIMER
            return data
        except Exception as e:
            print(f"[MarketTrends] Fallback: {e}")
            return self._fallback()

    def _fallback(self) -> dict:
        sections = []
        for sid, name, icon, risk in self.SECTIONS:
            sections.append({"id":sid,"name":name,"icon":icon,"sentiment":"neutral",
                "summary":f"{name} markets showing mixed signals. Monitor key indicators before acting.",
                "ai_view":"hold","ai_reasoning":"Global uncertainty warrants caution until clearer trend emerges.",
                "timeframes":{"minutes":"High volatility — use stop-loss.","hourly":"No clear directional bias.",
                    "daily":"Consolidation phase. Watch for breakout.","weekly":"Range-bound. Wait for volume.",
                    "monthly":"Long-term trend intact. Review quarterly allocation."},
                "risk_level":risk,"key_drivers":["Global macro uncertainty","Interest rate outlook"],
                "watch_out_for":"Sudden liquidity events or central bank policy changes.",
                "disclaimer":SEC_DISCLAIMER})
        return {"last_updated":datetime.utcnow().isoformat(),"currency":self.currency,
                "sections":sections,"global_disclaimer":GLOBAL_DISCLAIMER}
