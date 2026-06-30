import re


class PIIMasker:
    """Mask sensitive info before logging or storing."""

    _ACCOUNT  = re.compile(r'\b\d{10,18}\b')
    _CARD     = re.compile(r'\b(?:\d{4}[\s\-]?){3}\d{4}\b')
    _IBAN     = re.compile(r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16}\b')
    _EMAIL    = re.compile(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}')

    @classmethod
    def mask(cls, text: str) -> str:
        text = cls._CARD.sub("****-****-****-****", text)
        text = cls._IBAN.sub(lambda m: m.group()[:6] + "****" + m.group()[-4:], text)
        text = cls._ACCOUNT.sub(lambda m: m.group()[:4] + "****", text)
        text = cls._EMAIL.sub("****@****.***", text)
        return text

    @classmethod
    def mask_transactions(cls, transactions: list) -> list:
        return [
            {**tx,
             "merchant":    cls.mask(str(tx.get("merchant", ""))),
             "description": cls.mask(str(tx.get("description", "")))}
            for tx in transactions
        ]
