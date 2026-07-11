import io
import pandas as pd
from app.schemas.transaction import TransactionList, TransactionSchema


class CSVParser:
    DATE_COLS     = ["date", "transaction date", "txn date", "value date", "posting date", "trans date"]
    MERCHANT_COLS = ["merchant", "description", "narration", "particulars", "details", "remarks",
                     "transaction details", "transaction narration", "beneficiary name", "payee"]
    AMOUNT_COLS   = ["amount", "debit", "credit", "withdrawal", "deposit",
                     "transaction amount", "txn amount", "dr amount", "cr amount"]
    TYPE_COLS     = ["type", "txn type", "dr/cr", "transaction type", "cr/dr", "indicator"]

    # UAE WPS / India NEFT / generic salary keywords in narration
    CREDIT_KEYWORDS = [
        "salary", "sal ", "payroll", "wages", "wps", "neft", "imps", "rtgs",
        "credit", "cr ", " cr", "deposit", "trf from", "transfer from",
        "credited", "inward", "received from", "refund", "cashback",
    ]
    DEBIT_KEYWORDS = [
        "debit", "dr ", " dr", "withdrawal", "w/d", "atm", "pos ", "purchase",
        "payment to", "transfer to", "outward",
    ]

    def parse(self, file_bytes: bytes, currency: str = "AED") -> TransactionList:
        # Try multiple encodings — Indian bank exports are often latin-1
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding=enc, on_bad_lines="skip")
                break
            except Exception:
                continue
        else:
            raise ValueError("Could not read CSV file. Please export from your bank as UTF-8 CSV.")

        df.columns = [str(c).lower().strip() for c in df.columns]
        transactions = []
        for _, row in df.iterrows():
            tx = self._map_row(row, currency)
            if tx:
                transactions.append(tx)

        if not transactions:
            raise ValueError("No transactions found. Check column names match standard bank export format.")

        # Post-process: fix salary detection
        transactions = self._fix_salary(transactions)
        return TransactionList(transactions=transactions)

    def _map_row(self, row, currency: str):
        try:
            date     = self._get_date(row)
            merchant = self._get_merchant(row)
            amount   = self._get_amount(row)
            tx_type  = self._get_type(row, amount, merchant)
            if amount == 0:
                return None
            return TransactionSchema(
                date=date, merchant=merchant,
                amount=abs(amount), currency=currency,
                type=tx_type, description=merchant,
            )
        except Exception:
            return None

    def _get_date(self, row) -> str:
        for col in self.DATE_COLS:
            if col in row.index and pd.notna(row[col]):
                try:
                    return pd.to_datetime(row[col], dayfirst=True).strftime("%Y-%m-%d")
                except Exception:
                    pass
        return "2024-01-01"

    def _get_merchant(self, row) -> str:
        for col in self.MERCHANT_COLS:
            if col in row.index and pd.notna(row[col]):
                val = str(row[col]).strip()
                if val and val.lower() not in ("nan", "none", ""):
                    return val
        return "Unknown"

    def _get_amount(self, row) -> float:
        for col in self.AMOUNT_COLS:
            if col in row.index and pd.notna(row[col]):
                val = (str(row[col])
                       .replace(",", "").replace("AED", "").replace("₹", "")
                       .replace("INR", "").replace("(", "-").replace(")", "").strip())
                try:
                    return float(val)
                except Exception:
                    pass
        return 0.0

    def _get_type(self, row, amount: float, merchant: str) -> str:
        # 1. Explicit type column
        for col in self.TYPE_COLS:
            if col in row.index and pd.notna(row[col]):
                val = str(row[col]).lower().strip()
                if any(k in val for k in ["cr", "credit", "deposit", "in"]):
                    return "credit"
                if any(k in val for k in ["dr", "debit", "withdrawal", "out"]):
                    return "debit"

        # 2. Separate debit / credit columns (e.g. HDFC, Emirates NBD format)
        if "debit" in row.index and "credit" in row.index:
            try:
                dr_val = float(str(row.get("debit", "")).replace(",", "") or 0)
                cr_val = float(str(row.get("credit", "")).replace(",", "") or 0)
                if cr_val > 0 and dr_val == 0:
                    return "credit"
                if dr_val > 0 and cr_val == 0:
                    return "debit"
            except Exception:
                pass

        # 3. Keyword scan in merchant/narration
        m = merchant.lower()
        if any(k in m for k in self.CREDIT_KEYWORDS):
            return "credit"
        if any(k in m for k in self.DEBIT_KEYWORDS):
            return "debit"

        # 4. Amount sign (negative = debit in many formats)
        return "debit" if amount < 0 else "credit"

    def _fix_salary(self, transactions: list) -> list:
        """The largest single credit in any statement is almost always salary."""
        credits = [t for t in transactions if t.type == "credit"]
        if not credits:
            return transactions
        max_credit = max(credits, key=lambda t: t.amount)
        avg_credit = sum(t.amount for t in credits) / len(credits)
        # If the largest credit is 2.5× average — almost certainly salary
        if max_credit.amount > avg_credit * 2.5:
            if "salary" not in max_credit.merchant.lower():
                max_credit.merchant = f"{max_credit.merchant} (Salary)"
        return transactions
