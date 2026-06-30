import pdfplumber
from app.services.groq_service import GroqService
from app.schemas.transaction import TransactionList, TransactionSchema


class PDFParser:
    SYSTEM = (
        "You are a bank statement parser. Extract ALL transactions as JSON. "
        "Return ONLY valid JSON — no explanation, no markdown. "
        'Format: {"transactions":[{"date":"YYYY-MM-DD","merchant":"string",'
        '"amount":0.0,"currency":"AED","type":"debit|credit","description":"string"}]}'
    )

    def __init__(self):
        self.groq = GroqService()

    def parse(self, file_bytes: bytes, currency: str = "AED") -> TransactionList:
        text = self._extract_text(file_bytes)
        if len(text.strip()) < 50:
            raise ValueError("Could not extract text from PDF. Try a text-based PDF or convert to CSV.")
        return self._llm_parse(text, currency)

    def _extract_text(self, file_bytes: bytes) -> str:
        import io
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
        return text

    def _llm_parse(self, text: str, currency: str) -> TransactionList:
        # Truncate to fit Groq context (keep first 6000 chars — enough for ~3 months)
        truncated = text[:6000]
        user_msg = (
            f"Bank statement text (currency: {currency}):\n\n{truncated}\n\n"
            f"Extract all transactions. Use currency={currency}."
        )
        data = self.groq.extract_json(self.SYSTEM, user_msg)
        txs = [TransactionSchema(**t) for t in data.get("transactions", [])]
        return TransactionList(transactions=txs)
