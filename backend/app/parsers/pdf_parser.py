import io
import re
import json
from datetime import datetime
from collections import defaultdict

import pdfplumber
from app.services.groq_service import GroqService
from app.schemas.transaction import TransactionList, TransactionSchema


SYSTEM_PROMPT = """You are a bank statement parser. Extract ALL transactions from the text below.

Return ONLY valid JSON — no markdown, no explanation, nothing else:
{"transactions":[{"date":"YYYY-MM-DD","merchant":"string","amount":0.00,"currency":"AED","type":"debit|credit","description":"string"}]}

Critical rules:
- date: use YYYY-MM-DD format. Guess the year if not shown (use current year).
- merchant: the payee or narration text (keep it short, max 60 chars)
- amount: positive number only, no currency symbols
- type: "credit" for money IN (salary, refund, transfer in), "debit" for money OUT
- The LARGEST single credit is almost always salary — mark it credit
- WPS / NEFT / RTGS / IMPS credits = type:credit
- ATM / POS / purchase = type:debit
- If a DR/CR column exists, use it directly
- Extract EVERY row you can see — do not skip any
- If you are unsure about a field, make your best guess — do NOT return empty transactions"""

SYSTEM_SIMPLE = """Extract bank transactions from this text. Return JSON only:
{"transactions":[{"date":"YYYY-MM-DD","merchant":"string","amount":0.0,"currency":"AED","type":"debit|credit","description":""}]}
Rules: amount is always positive. type is debit or credit. Extract everything you can see."""


class PDFParser:
    SALARY_KW = ["salary","sal ","payroll","wages","wps","neft","imps","rtgs",
                  "credited by","trf from","transfer from","opening balance"]
    DEBIT_KW  = ["pos ","purchase","withdrawal","atm","payment to","debit","dr ","w/d"]

    # Regex patterns for rule-based fallback
    # Matches: date, description, optional debit, optional credit
    DATE_PAT   = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{2,4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+\w{3}\s+\d{2,4})\b'
    AMOUNT_PAT = r'[\d,]+\.\d{2}'

    def __init__(self):
        self.groq = GroqService()

    def parse(self, file_bytes: bytes, currency: str = "AED") -> TransactionList:
        text = self._extract_text(file_bytes)
        print(f"[PDFParser] Extracted {len(text)} chars from PDF")
        print(f"[PDFParser] Text preview: {text[:300]!r}")

        if len(text.strip()) < 30:
            raise ValueError(
                "Could not extract text from this PDF. "
                "Please use a text-based PDF (not a scanned image) "
                "or export your statement as CSV from your bank's app."
            )

        # Strategy 1: LLM with full prompt
        txs = self._llm_parse(text, currency, SYSTEM_PROMPT, "full")

        # Strategy 2: LLM with simplified prompt on smaller chunk
        if not txs:
            print("[PDFParser] Strategy 1 returned 0 txs — trying simplified LLM")
            txs = self._llm_parse(text[:6000], currency, SYSTEM_SIMPLE, "simple")

        # Strategy 3: Rule-based regex fallback
        if not txs:
            print("[PDFParser] LLM strategies returned 0 — falling back to rule-based parser")
            txs = self._rule_based_parse(text, currency)

        if not txs:
            raise ValueError(
                "Could not find any transactions in this PDF. "
                "Possible reasons: (1) The PDF is a scanned image — please use a digital PDF. "
                "(2) The statement format is unusual — try exporting as CSV instead. "
                "(3) The file may be password-protected."
            )

        print(f"[PDFParser] Extracted {len(txs)} transactions")
        txs = self._fix_salary(txs)
        return TransactionList(transactions=txs)

    # ── Text extraction ───────────────────────────────────────────────────────
    def _extract_text(self, file_bytes: bytes) -> str:
        text_parts = []
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for i, page in enumerate(pdf.pages):
                    # Try normal text extraction first
                    t = page.extract_text() or ""
                    if len(t.strip()) < 20:
                        # Try extracting words directly (better for some layouts)
                        words = page.extract_words() or []
                        t = " ".join(w["text"] for w in words)
                    if t.strip():
                        text_parts.append(t)
                    print(f"[PDFParser] Page {i+1}: {len(t)} chars")
        except Exception as e:
            raise ValueError(f"Could not open PDF: {e}. Make sure it is a valid, unencrypted PDF.")

        return "\n\n".join(text_parts)

    # ── Strategy 1 & 2: LLM parsing ──────────────────────────────────────────
    def _llm_parse(self, text: str, currency: str,
                   system: str, label: str) -> list:
        chunks  = self._chunk(text, max_chars=10000)
        all_txs = []

        for i, chunk in enumerate(chunks):
            user_msg = (
                f"Currency: {currency} | "
                f"Region: {'UAE' if currency=='AED' else 'India'}\n\n"
                f"Bank statement text (chunk {i+1}/{len(chunks)}):\n{chunk}"
            )
            for attempt in range(2):  # 2 attempts per chunk
                try:
                    raw = self.groq.complete(system, user_msg, max_tokens=2000)
                    print(f"[PDFParser] LLM {label} chunk {i+1} attempt {attempt+1}: {raw[:120]!r}")

                    # Strip markdown
                    raw = re.sub(r'```(?:json)?', '', raw).strip().rstrip('`').strip()
                    start = raw.find('{')
                    if start == -1:
                        continue
                    data  = json.loads(raw[start:])
                    raw_txs = data.get("transactions", [])

                    for t in raw_txs:
                        tx = self._to_schema(t, currency)
                        if tx:
                            all_txs.append(tx)

                    if raw_txs:
                        break  # success for this chunk
                except Exception as e:
                    print(f"[PDFParser] LLM {label} chunk {i+1} attempt {attempt+1} error: {e}")

        return all_txs

    # ── Strategy 3: Rule-based regex fallback ────────────────────────────────
    def _rule_based_parse(self, text: str, currency: str) -> list:
        """
        Regex-based parser that works on common bank statement formats.
        Looks for date + description + amount patterns.
        """
        txs    = []
        lines  = text.split('\n')
        year   = datetime.now().year

        for line in lines:
            line = line.strip()
            if len(line) < 10:
                continue

            # Find all amounts in the line
            amounts = re.findall(self.AMOUNT_PAT, line)
            if not amounts:
                continue

            # Find date
            date_match = re.search(self.DATE_PAT, line)
            if not date_match:
                continue

            date_str = self._normalise_date(date_match.group(1), year)
            if not date_str:
                continue

            # Get the largest amount (usually the transaction amount)
            amount_strs = [a.replace(',','') for a in amounts]
            try:
                amount = max(float(a) for a in amount_strs)
            except Exception:
                continue

            if amount <= 0 or amount > 1_000_000:
                continue

            # Extract description (text between date and first amount)
            date_end = date_match.end()
            first_amount_pos = line.find(amounts[0])
            description = line[date_end:first_amount_pos].strip()
            if not description:
                description = line[date_end:].strip()[:60] or "Transaction"

            # Determine type from description and position
            tx_type = self._guess_type(description, amounts, line)

            txs.append(TransactionSchema(
                date=date_str,
                merchant=description[:60],
                amount=amount,
                currency=currency,
                type=tx_type,
                description=description[:100],
            ))

        print(f"[PDFParser] Rule-based found {len(txs)} transactions")
        return txs

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _to_schema(self, t: dict, currency: str):
        try:
            date = self._normalise_date(str(t.get("date", "")), datetime.now().year)
            if not date:
                date = datetime.now().strftime("%Y-%m-%d")
            amount = float(str(t.get("amount", 0)).replace(",", ""))
            if amount <= 0:
                return None
            return TransactionSchema(
                date=date,
                merchant=str(t.get("merchant", "Unknown"))[:80],
                amount=amount,
                currency=str(t.get("currency", currency)),
                type=str(t.get("type", "debit")).lower(),
                description=str(t.get("description", ""))[:100],
            )
        except Exception as e:
            print(f"[PDFParser] Schema error: {e} | data: {t}")
            return None

    def _normalise_date(self, date_str: str, default_year: int) -> str:
        """Try multiple date formats and return YYYY-MM-DD."""
        date_str = date_str.strip()
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y",
            "%d %b %Y", "%d %B %Y", "%d %b %y", "%d/%m", "%d-%m",
            "%Y/%m/%d", "%m/%d/%Y",
        ]
        for fmt in formats:
            try:
                d = datetime.strptime(date_str, fmt)
                if d.year < 2000:
                    d = d.replace(year=default_year)
                return d.strftime("%Y-%m-%d")
            except Exception:
                pass
        return ""

    def _guess_type(self, description: str, amounts: list, line: str) -> str:
        """Guess debit/credit from description keywords or amount column position."""
        desc_lower = description.lower()
        if any(k in desc_lower for k in self.SALARY_KW):
            return "credit"
        if any(k in desc_lower for k in self.DEBIT_KW):
            return "debit"
        # If two amounts found: first=debit column, second=credit column (common format)
        if len(amounts) >= 2:
            # Try to determine which column is non-zero
            try:
                a0 = float(amounts[0].replace(",",""))
                a1 = float(amounts[1].replace(",",""))
                if a0 > 0 and a1 == 0: return "debit"
                if a1 > 0 and a0 == 0: return "credit"
            except Exception:
                pass
        # Default: debit (most transactions are spend)
        return "debit"

    def _chunk(self, text: str, max_chars: int = 10000) -> list:
        """Split by double newlines (page breaks) to avoid cutting mid-transaction."""
        pages   = text.split("\n\n")
        chunks  = []
        current = ""
        for page in pages:
            if len(current) + len(page) > max_chars:
                if current:
                    chunks.append(current.strip())
                current = page
            else:
                current += "\n\n" + page
        if current.strip():
            chunks.append(current.strip())
        return chunks or [text[:max_chars]]

    def _fix_salary(self, transactions: list) -> list:
        """Post-process: ensure largest credit is tagged as salary."""
        for tx in transactions:
            desc = (tx.merchant + " " + tx.description).lower()
            if any(kw in desc for kw in self.SALARY_KW):
                tx.type = "credit"

        credits = [t for t in transactions if t.type == "credit"]
        if len(credits) >= 2:
            max_credit = max(credits, key=lambda t: t.amount)
            avg_credit = sum(t.amount for t in credits) / len(credits)
            if max_credit.amount > avg_credit * 2.5:
                if "salary" not in max_credit.merchant.lower():
                    max_credit.merchant = f"{max_credit.merchant} (Salary)"
        return transactions
# import pdfplumber
# from app.services.groq_service import GroqService
# from app.schemas.transaction import TransactionList, TransactionSchema


# class PDFParser:
#     # Salary / large credit detection keywords common across UAE & India banks
#     SALARY_KEYWORDS = [
#         "salary", "sal ", "payroll", "wages", "wps",          # UAE WPS
#         "neft", "imps", "rtgs",                                # India bank transfers
#         "credited by", "trf from", "transfer from",
#         "opening balance", "od transfer",
#     ]
#     DEBIT_KEYWORDS = [
#         "pos ", "purchase", "withdrawal", "atm", "payment to",
#         "debit", "dr ", "w/d",
#     ]

#     SYSTEM = (
#         "You are a bank statement parser for UAE and India banks. "
#         "Extract ALL transactions. Rules:\n"
#         "1. Salary/income = type:credit. Look for: WPS, NEFT, RTGS, IMPS, salary, payroll, "
#         "   credited, TRF FROM, employer name credits, opening balance transfers.\n"
#         "2. The LARGEST credit in the statement is almost certainly salary — mark it type:credit category:salary.\n"
#         "3. ATM, POS, purchase, payment = type:debit.\n"
#         "4. If DR/CR column exists, use it.\n"
#         "5. Return ONLY valid JSON, no markdown:\n"
#         '{"transactions":['
#         '{"date":"YYYY-MM-DD","merchant":"string","amount":0.0,'
#         '"currency":"AED","type":"debit|credit","description":"string"}'
#         "]}"
#     )

#     def __init__(self):
#         self.groq = GroqService()

#     def parse(self, file_bytes: bytes, currency: str = "AED") -> TransactionList:
#         text = self._extract_text(file_bytes)
#         if len(text.strip()) < 50:
#             raise ValueError(
#                 "Could not extract text from PDF. Use a text-based PDF or export as CSV from your bank app."
#             )
#         return self._llm_parse(text, currency)

#     def _extract_text(self, file_bytes: bytes) -> str:
#         import io
#         text = ""
#         with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
#             for page in pdf.pages:
#                 page_text = page.extract_text() or ""
#                 text += page_text + "\n"
#         return text

#     def _llm_parse(self, text: str, currency: str) -> TransactionList:
#         # Increased to 12,000 chars — covers ~3 months of most bank statements
#         # Process in pages if very long to avoid missing salary entry
#         chunks = self._smart_chunk(text, max_chars=12000)
#         all_txs = []

#         for chunk in chunks:
#             user_msg = (
#                 f"Bank: unknown | Currency: {currency} | Region: {'UAE' if currency=='AED' else 'India'}\n\n"
#                 f"Statement text:\n{chunk}\n\n"
#                 "Important: The single largest credit amount is almost certainly salary. "
#                 "Tag it type:credit. Extract ALL transactions shown."
#             )
#             try:
#                 data = self.groq.extract_json(self.SYSTEM, user_msg, retries=3)
#                 raw_txs = data.get("transactions", [])
#                 for t in raw_txs:
#                     try:
#                         tx = TransactionSchema(**t)
#                         all_txs.append(tx)
#                     except Exception:
#                         pass
#             except Exception:
#                 pass

#         if not all_txs:
#             raise ValueError("No transactions found. Check the PDF is a bank statement.")

#         # Post-process: largest credit = salary if not already tagged
#         all_txs = self._fix_salary_detection(all_txs)
#         return TransactionList(transactions=all_txs)

#     def _smart_chunk(self, text: str, max_chars: int = 12000) -> list:
#         """Split by pages rather than arbitrary cutoff to avoid splitting a transaction line."""
#         pages = text.split("\n\n")  # pdfplumber adds double newlines between pages
#         chunks, current = [], ""
#         for page in pages:
#             if len(current) + len(page) > max_chars:
#                 if current:
#                     chunks.append(current)
#                 current = page
#             else:
#                 current += "\n\n" + page
#         if current:
#             chunks.append(current)
#         return chunks or [text[:max_chars]]

#     def _fix_salary_detection(self, transactions: list) -> list:
#         """
#         Post-LLM correction:
#         1. Any transaction whose merchant matches salary keywords → type:credit
#         2. The single largest credit (by amount) in the statement is salary
#         """
#         # Fix keyword matches
#         for tx in transactions:
#             desc = (tx.merchant + " " + tx.description).lower()
#             if any(kw in desc for kw in self.SALARY_KEYWORDS):
#                 tx.type = "credit"
#             elif any(kw in desc for kw in self.DEBIT_KEYWORDS) and tx.type == "credit":
#                 # LLM sometimes flips POS purchases to credit — fix it
#                 if tx.amount < 5000:  # Salary is never a small amount
#                     tx.type = "debit"

#         # Identify the largest credit — extremely likely to be salary
#         credits = [t for t in transactions if t.type == "credit"]
#         if credits:
#             max_credit = max(credits, key=lambda t: t.amount)
#             # Only auto-tag if it's significantly larger than average credit
#             avg_credit = sum(t.amount for t in credits) / len(credits)
#             if max_credit.amount > avg_credit * 2.5 and "salary" not in max_credit.merchant.lower():
#                 max_credit.merchant = f"{max_credit.merchant} (Salary)"

#         return transactions
