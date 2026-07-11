from fastapi import APIRouter, Depends, HTTPException
from app.api.middleware.auth import get_current_user
from app.db.database import get_report

router = APIRouter()

@router.get("/alerts/check")
async def check_alerts(user=Depends(get_current_user)):
    """Lightweight endpoint polled by frontend notification hook every 5 min."""
    data = get_report(user["id"])
    if not data:
        return {"new_critical": 0, "messages": []}
    report           = data["report"]
    smart_alerts     = report.get("smart_alerts", [])
    anomalies        = report.get("anomalies", {}).get("anomalies", [])
    critical_alerts  = [a for a in smart_alerts if a.get("severity") == "high"]
    critical_anomaly = [a for a in anomalies   if a.get("severity") == "critical"]
    messages = [a["title"] for a in critical_alerts[:3]] + [a["title"] for a in critical_anomaly[:2]]
    return {"new_critical": len(critical_alerts)+len(critical_anomaly), "messages": messages[:5]}

@router.get("/market-trends")
async def get_market_trends(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        return {"market_trends": None}
    return {"market_trends": data["report"].get("market_trends")}

@router.get("/investment-plans")
async def get_investment_plans(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        return {"investment_plans": None}
    return {"investment_plans": data["report"].get("investment_plans")}

@router.get("/anomalies")
async def get_anomalies(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        return {"anomalies": None}
    return {"anomalies": data["report"].get("anomalies")}
