import io
import pandas as pd
from app.parsers.csv_parser import CSVParser


class ExcelParser:
    """Converts XLSX to DataFrame, then reuses CSV parsing logic."""

    def parse(self, file_bytes: bytes, currency: str = "AED"):
        df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
        # Convert to CSV bytes and reuse CSVParser
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        return CSVParser().parse(csv_bytes, currency)
