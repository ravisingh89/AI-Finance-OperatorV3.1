CURRENCY_SYMBOLS = {"AED": "AED", "INR": "₹"}
CURRENCY_REGIONS = {"AED": "UAE", "INR": "India"}

def fmt(amount: float, currency: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    return f"{symbol} {amount:,.2f}"

def region_for(currency: str) -> str:
    return CURRENCY_REGIONS.get(currency, "UAE")
