from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.middleware.auth import get_current_user
from app.db.database import (get_report, save_challenge, get_challenges,
                               save_streak, get_streak)

router = APIRouter()

class ChallengeAction(BaseModel):
    challenge_id: str
    status: str  # active | completed | skipped

@router.get("/retention")
async def get_retention(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found.")
    retention   = data["report"].get("retention", {})
    challenges  = get_challenges(user["id"])
    streak_data = get_streak(user["id"])
    # Merge saved challenge states
    for ch in retention.get("challenges", []):
        if ch["id"] in challenges:
            ch["active"] = challenges[ch["id"]]["status"] == "active"
    return {"retention": retention, "streak": streak_data}

@router.post("/retention/challenge")
async def update_challenge(action: ChallengeAction, user=Depends(get_current_user)):
    save_challenge(user["id"], action.challenge_id, action.status)
    return {"success": True}

@router.get("/retention/digest")
async def get_digest(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found.")
    digest = data["report"].get("retention", {}).get("weekly_digest", {})
    return {"digest": digest}

@router.get("/retention/bill-calendar")
async def get_bill_calendar(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found.")
    calendar = data["report"].get("retention", {}).get("bill_calendar", [])
    return {"calendar": calendar}
