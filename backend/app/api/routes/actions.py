from fastapi import APIRouter, Depends, HTTPException
from app.api.middleware.auth import get_current_user
from app.db.database import get_report

router = APIRouter()

@router.get("/actions")
async def get_goal_actions(user=Depends(get_current_user)):
    data = get_report(user["id"])
    if not data:
        raise HTTPException(404, "No report found.")
    actions = data["report"].get("goal_actions", {})
    return {"goal_actions": actions}
