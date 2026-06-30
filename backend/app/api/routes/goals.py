from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api.middleware.auth import get_current_user
from app.db.database import get_report, save_report, get_report_history, _persist
import json, os

router = APIRouter()

class GoalUpdate(BaseModel):
    goal_id: str
    progress_percent: float

@router.get("")
async def get_goals(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found. Upload a statement first.")
    goals = data["report"].get("goals", {})
    return {"goals": goals}

@router.post("/progress")
async def update_goal_progress(update: GoalUpdate, user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found.")
    report = data["report"]
    goals_list = report.get("goals", {}).get("goals", [])
    found = False
    for g in goals_list:
        if g.get("id") == update.goal_id:
            g["progress_percent"] = min(100, max(0, update.progress_percent))
            found = True

    # Sync to current report
    save_report(user["id"], data["statement_id"], report)

    # Also sync to the matching entry in report history, so reports-history
    # reflects the latest goal progress instead of going stale.
    if found:
        history = get_report_history(user["id"])
        for entry in history:
            if entry.get("statement_id") == data["statement_id"]:
                entry_goals = entry.get("report", {}).get("goals", {}).get("goals", [])
                for g in entry_goals:
                    if g.get("id") == update.goal_id:
                        g["progress_percent"] = min(100, max(0, update.progress_percent))
        _persist("history", user["id"], history)

    return {"success": True, "goal_id": update.goal_id, "progress": update.progress_percent}
