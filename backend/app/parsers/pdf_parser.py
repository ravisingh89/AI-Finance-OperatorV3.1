import pdfplumber
from app.services.groq_service import GroqService
from app.schemas.transaction import TransactionList, TransactionSchema


class PDFParser:
    # Salary / large credit detection keywords common across UAE & India banks
    SALARY_KEYWORDS = [
        "salary", "sal ", "payroll", "wages", "wps",          # UAE WPS
        "neft", "imps", "rtgs",                                # India bank transfers
        "credited by", "trf from", "transfer from",
        "opening balance", "od transfer",
    ]
    DEBIT_KEYWORDS = [
        "pos ", "purchase", "withdrawal", "atm", "payment to",
        "debit", "dr ", "w/d",
    ]

    SYSTEM = (
        "You are a bank statement parser for UAE and India banks. "
        "Extract ALL transactions. Rules:\n"
        "1. Salary/income = type:credit. Look for: WPS, NEFT, RTGS, IMPS, salary, payroll, "
        "   credited, TRF FROM, employer name credits, opening balance transfers.\n"
        "2. The LARGEST credit in the statement is almost certainly salary — mark it type:credit category:salary.\n"
        "3. ATM, POS, purchase, payment = type:debit.\n"
        "4. If DR/CR column exists, use it.\n"
        "5. Return ONLY valid JSON, no markdown:\n"
        '{"transactions":['
        '{"date":"YYYY-MM-DD","merchant":"string","amount":0.0,'
        '"currency":"AED","type":"debit|credit","description":"string"}'
        "]}"
    )

    def __init__(self):
        self.groq = GroqService()

    def parse(self, file_bytes: bytes, currency: str = "AED") -> TransactionList:
        text = self._extract_text(file_bytes)
        if len(text.strip()) < 50:
            raise ValueError(
                "Could not extract text from PDF. Use a text-based PDF or export as CSV from your bank app."
            )
        return self._llm_parse(text, currency)

    def _extract_text(self, file_bytes: bytes) -> str:
        import io
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
        return text

    def _llm_parse(self, text: str, currency: str) -> TransactionList:
        # Increased to 12,000 chars — covers ~3 months of most bank statements
        # Process in pages if very long to avoid missing salary entry
        chunks = self._smart_chunk(text, max_chars=12000)
        all_txs = []

        for chunk in chunks:
            user_msg = (
                f"Bank: unknown | Currency: {currency} | Region: {'UAE' if currency=='AED' else 'India'}\n\n"
                f"Statement text:\n{chunk}\n\n"
                "Important: The single largest credit amount is almost certainly salary. "
                "Tag it type:credit. Extract ALL transactions shown."
            )
            try:
                data = self.groq.extract_json(self.SYSTEM, user_msg, retries=3)
                raw_txs = data.get("transactions", [])
                for t in raw_txs:
                    try:
                        tx = TransactionSchema(**t)
                        all_txs.append(tx)
                    except Exception:
                        pass
            except Exception:
                pass

        if not all_txs:
            raise ValueError("No transactions found. Check the PDF is a bank statement.")

        # Post-process: largest credit = salary if not already tagged
        all_txs = self._fix_salary_detection(all_txs)
        return TransactionList(transactions=all_txs)

    def _smart_chunk(self, text: str, max_chars: int = 12000) -> list:
        """Split by pages rather than arbitrary cutoff to avoid splitting a transaction line."""
        pages = text.split("\n\n")  # pdfplumber adds double newlines between pages
        chunks, current = [], ""
        for page in pages:
            if len(current) + len(page) > max_chars:
                if current:
                    chunks.append(current)
                current = page
            else:
                current += "\n\n" + page
        if current:
            chunks.append(current)
        return chunks or [text[:max_chars]]

    def _fix_salary_detection(self, transactions: list) -> list:
        """
        Post-LLM correction:
        1. Any transaction whose merchant matches salary keywords → type:credit
        2. The single largest credit (by amount) in the statement is salary
        """
        # Fix keyword matches
        for tx in transactions:
            desc = (tx.merchant + " " + tx.description).lower()
            if any(kw in desc for kw in self.SALARY_KEYWORDS):
                tx.type = "credit"
            elif any(kw in desc for kw in self.DEBIT_KEYWORDS) and tx.type == "credit":
                # LLM sometimes flips POS purchases to credit — fix it
                if tx.amount < 5000:  # Salary is never a small amount
                    tx.type = "debit"

        # Identify the largest credit — extremely likely to be salary
        credits = [t for t in transactions if t.type == "credit"]
        if credits:
            max_credit = max(credits, key=lambda t: t.amount)
            # Only auto-tag if it's significantly larger than average credit
            avg_credit = sum(t.amount for t in credits) / len(credits)
            if max_credit.amount > avg_credit * 2.5 and "salary" not in max_credit.merchant.lower():
                max_credit.merchant = f"{max_credit.merchant} (Salary)"

        return transactions
