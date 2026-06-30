from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.api.middleware.auth import get_current_user
from app.db.database import get_report
from app.agents.copilot import CopilotAgent

router  = APIRouter()
_agent  = CopilotAgent()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@router.post("/chat")
async def copilot_chat(req: ChatRequest, user=Depends(get_current_user)):
    data   = get_report(user["id"])
    report = data["report"] if data else None
    history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    result = _agent.chat(user["id"], req.message, report, history)
    return result

@router.get("/suggestions")
async def smart_suggestions(user=Depends(get_current_user)):
    data   = get_report(user["id"])
    report = data["report"] if data else None
    suggestions = _agent.get_smart_suggestions(user["id"], report)
    return {"suggestions": suggestions}
