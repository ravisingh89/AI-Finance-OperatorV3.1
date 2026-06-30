from fastapi import APIRouter, Depends, HTTPException
from app.api.middleware.auth import get_current_user
from app.db.database import get_report, get_report_history, get_previous_report, compare_reports

router = APIRouter()

@router.get("/reports/latest")
async def get_latest_report(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found. Upload a statement first.")
    return {"statement_id": data["statement_id"], "report": data["report"]}

@router.get("/reports/history")
async def get_history(user=Depends(get_current_user)):
    history = get_report_history(user["id"])
    return {
        "reports": [
            {
                "statement_id": h["statement_id"],
                "created_at":   h.get("created_at",""),
                "health_score": h["report"].get("health_score",{}).get("overall_score",0),
                "grade":        h["report"].get("health_score",{}).get("grade","?"),
                "total_spend":  h["report"].get("summary",{}).get("total_spend",0),
                "net_savings":  h["report"].get("summary",{}).get("net_savings",0),
                "currency":     h["report"].get("summary",{}).get("currency","AED"),
            }
            for h in reversed(history)
        ]
    }

@router.get("/reports/compare")
async def compare(user=Depends(get_current_user)):
    history = get_report_history(user["id"])
    if len(history) < 2:
        raise HTTPException(404, "Need at least 2 reports to compare.")
    current  = history[-1]
    previous = history[-2]
    return {"comparison": compare_reports(current, previous)}

@router.get("/transactions")
async def get_transactions(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        return {"transactions": []}
    txs = data["report"].get("classified_transactions", [])
    return {"transactions": txs[:500]}
