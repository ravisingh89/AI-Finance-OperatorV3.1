from pydantic import BaseModel, field_validator
from typing import List, Optional, Any, Dict


class TransactionSchema(BaseModel):
    date: str
    merchant: str
    amount: float
    currency: str
    type: str           # debit | credit
    description: Optional[str] = ""

    @field_validator("type")
    @classmethod
    def normalize_type(cls, v: str) -> str:
        v = v.lower().strip()
        return "debit" if v in ("debit", "dr", "withdrawal", "payment") else "credit"

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        return abs(v)


class TransactionList(BaseModel):
    transactions: List[TransactionSchema]


class UploadResponse(BaseModel):
    statement_id: str
    status: str


class StatusResponse(BaseModel):
    statement_id: str
    status: str


class ReportResponse(BaseModel):
    statement_id: str
    report: Dict[str, Any]
