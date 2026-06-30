import io
import pandas as pd
from app.schemas.transaction import TransactionList, TransactionSchema


class CSVParser:
    # Common column name aliases across UAE/India banks
    DATE_COLS    = ["date", "transaction date", "txn date", "value date", "posting date"]
    MERCHANT_COLS = ["merchant", "description", "narration", "particulars", "details", "remarks"]
    AMOUNT_COLS  = ["amount", "debit", "credit", "withdrawal", "deposit", "transaction amount"]
    TYPE_COLS    = ["type", "txn type", "dr/cr", "transaction type"]

    def parse(self, file_bytes: bytes, currency: str = "AED") -> TransactionList:
        df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8", on_bad_lines="skip")
        df.columns = [c.lower().strip() for c in df.columns]
        transactions = []
        for _, row in df.iterrows():
            tx = self._map_row(row, currency)
            if tx:
                transactions.append(tx)
        return TransactionList(transactions=transactions)

    def _map_row(self, row, currency: str):
        try:
            date     = self._get_date(row)
            merchant = self._get_merchant(row)
            amount   = self._get_amount(row)
            tx_type  = self._get_type(row, amount)
            if amount == 0:
                return None
            return TransactionSchema(
                date=date,
                merchant=merchant,
                amount=abs(amount),
                currency=currency,
                type=tx_type,
                description=merchant,
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
                return str(row[col]).strip()
        return "Unknown"

    def _get_amount(self, row) -> float:
        for col in self.AMOUNT_COLS:
            if col in row.index and pd.notna(row[col]):
                val = str(row[col]).replace(",", "").replace("AED", "").replace("₹", "").replace("INR", "").strip()
                try:
                    return float(val)
                except Exception:
                    pass
        return 0.0

    def _get_type(self, row, amount: float) -> str:
        for col in self.TYPE_COLS:
            if col in row.index:
                val = str(row[col]).lower()
                if any(k in val for k in ["cr", "credit", "deposit", "salary"]):
                    return "credit"
                if any(k in val for k in ["dr", "debit", "withdrawal"]):
                    return "debit"
        # Fallback: separate debit/credit columns
        if "debit" in row.index and "credit" in row.index:
            if pd.notna(row["debit"]) and float(str(row["debit"]).replace(",", "") or 0) > 0:
                return "debit"
            return "credit"
        return "debit" if amount < 0 else "credit"
