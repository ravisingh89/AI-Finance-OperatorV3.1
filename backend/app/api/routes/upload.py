from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from app.api.middleware.auth import get_current_user
from app.db.database import save_report_history, save_report, set_status, get_status, get_previous_report, update_streak_on_activity
from app.agents.orchestrator import run_pipeline
import uuid

router = APIRouter()
MAX_SIZE = 15 * 1024 * 1024

@router.post("/upload")
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    currency: str = Form("AED"),
    region: str   = Form("UAE"),
    user = Depends(get_current_user),
):
    file_bytes = await file.read()
    if len(file_bytes) == 0:   raise HTTPException(400, "Empty file.")
    if len(file_bytes) > MAX_SIZE: raise HTTPException(400, "File too large. Max 15 MB.")

    fname = (file.filename or "").lower()
    if fname.endswith(".pdf"):   content_type = "application/pdf"
    elif fname.endswith(".csv"): content_type = "text/csv"
    elif fname.endswith(".xlsx"):content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:                        content_type = file.content_type or "text/csv"

    stmt_id = str(uuid.uuid4())
    set_status(stmt_id, "processing")
    background_tasks.add_task(_process, stmt_id, file_bytes, content_type, user["id"], currency, region)
    return {"statement_id": stmt_id, "status": "processing"}

@router.get("/{statement_id}/status")
async def get_stmt_status(statement_id: str, user=Depends(get_current_user)):
    return {"statement_id": statement_id, "status": get_status(statement_id)}

async def _process(stmt_id, file_bytes, content_type, user_id, currency, region):
    try:
        print(f"[INFO] Processing {stmt_id}")
        transactions    = _parse(file_bytes, content_type, currency)
        previous_report = get_previous_report(user_id)
        real_streak     = update_streak_on_activity(user_id)
        print(f"[INFO] Parsed {len(transactions)} txs. Previous report: {'yes' if previous_report else 'no'}. Streak: {real_streak['current_streak']} days")

        report = run_pipeline(transactions, region=region, currency=currency,
                               previous_report=previous_report, real_streak=real_streak)

        # Save to history AND as current
        save_report_history(user_id, report, stmt_id)
        set_status(stmt_id, "done")
        print(f"[INFO] Done. Score: {report['health_score']['overall_score']}")
    except Exception as e:
        import traceback; traceback.print_exc()
        set_status(stmt_id, "failed")

def _parse(file_bytes, content_type, currency):
    if "pdf" in content_type:
        from app.parsers.pdf_parser import PDFParser
        r = PDFParser().parse(file_bytes, currency)
    elif "csv" in content_type or "text/plain" in content_type:
        from app.parsers.csv_parser import CSVParser
        r = CSVParser().parse(file_bytes, currency)
    else:
        from app.parsers.excel_parser import ExcelParser
        r = ExcelParser().parse(file_bytes, currency)
    return [t.model_dump() for t in r.transactions]
