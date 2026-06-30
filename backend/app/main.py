from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import upload, analysis, reports, health, copilot, goals, retention, actions

app = FastAPI(title="AI Finance Operator", version="3.0.0")

origins = settings.ALLOWED_ORIGINS
if "*" in origins:
    app.add_middleware(CORSMiddleware, allow_origins=["*"],
                       allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
else:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                       allow_methods=["GET","POST","PUT","DELETE","OPTIONS"], allow_headers=["*"])

app.include_router(health.router,     tags=["Health"])
app.include_router(upload.router,     prefix="/api/v1/statements",  tags=["Statements"])
app.include_router(analysis.router,   prefix="/api/v1/analysis",    tags=["Analysis"])
app.include_router(reports.router,    prefix="/api/v1",             tags=["Reports"])
app.include_router(copilot.router,    prefix="/api/v1/copilot",     tags=["Copilot"])
app.include_router(goals.router,      prefix="/api/v1/goals",       tags=["Goals"])
app.include_router(retention.router,  prefix="/api/v1",             tags=["Retention"])
app.include_router(actions.router,    prefix="/api/v1",             tags=["Actions"])
