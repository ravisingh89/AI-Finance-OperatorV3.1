from fastapi import APIRouter, Depends
from app.api.middleware.auth import get_current_user

router = APIRouter()

@router.get("/status")
async def analysis_status(user=Depends(get_current_user)):
    return {"status": "Analysis runs automatically after upload."}
