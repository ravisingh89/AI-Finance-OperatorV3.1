import json
import re
from groq import Groq
from app.config import settings


class GroqService:
    """
    Free LLM service using Groq (Llama 3.3 70B).
    Groq free tier: 30 req/min, 6000 tokens/min — plenty for MVP.
    """

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL

    def complete(self, system: str, user: str, max_tokens: int = 1500) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.1,  # low temp = consistent JSON
        )
        return response.choices[0].message.content

    def extract_json(self, system: str, user: str, retries: int = 3) -> dict:
        """Call LLM and extract JSON from response, with retry."""
        for attempt in range(retries):
            try:
                raw = self.complete(system, user)
                # Strip markdown fences if present
                raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
                # Find first { or [ in case there's preamble
                start = min(
                    (raw.find("{") if raw.find("{") != -1 else len(raw)),
                    (raw.find("[") if raw.find("[") != -1 else len(raw)),
                )
                raw = raw[start:]
                return json.loads(raw)
            except Exception as e:
                if attempt == retries - 1:
                    raise ValueError(f"JSON extraction failed after {retries} attempts: {e}\nRaw: {raw[:300]}")
        return {}
