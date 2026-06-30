"""
In-memory + /tmp file store. Works on Render free tier.
Stores: reports, statement status, copilot memory.
"""
import json, os
from datetime import datetime
from collections import defaultdict

_store = {
    "reports":         {},   # user_id -> report dict
    "statements":      {},   # stmt_id -> status
    "copilot_memory":  {},   # user_id -> memory dict
}

# ── Reports ───────────────────────────────────────────────────────────────────
def save_report(user_id: str, statement_id: str, report: dict):
    data = {"statement_id": statement_id, "report": report,
            "created_at": datetime.utcnow().isoformat()}
    _store["reports"][user_id] = data
    _persist("reports", user_id, data)

def get_report(user_id: str) -> dict | None:
    if user_id in _store["reports"]:
        return _store["reports"][user_id]
    return _load("reports", user_id)

# ── Statement status ──────────────────────────────────────────────────────────
def set_status(statement_id: str, status: str):
    _store["statements"][statement_id] = status
    _persist("statements", statement_id, {"status": status})

def get_status(statement_id: str) -> str:
    if statement_id in _store["statements"]:
        return _store["statements"][statement_id]
    data = _load("statements", statement_id)
    return data["status"] if data else "processing"

# ── Copilot memory ────────────────────────────────────────────────────────────
def save_copilot_memory(user_id: str, memory: dict):
    _store["copilot_memory"][user_id] = memory
    _persist("copilot", user_id, memory)

def get_copilot_memory(user_id: str) -> dict:
    if user_id in _store["copilot_memory"]:
        return _store["copilot_memory"][user_id]
    data = _load("copilot", user_id)
    if data:
        _store["copilot_memory"][user_id] = data
        return data
    return {}   # Fresh user

# ── File persistence helpers ──────────────────────────────────────────────────
def _persist(folder: str, key: str, data: dict):
    try:
        path = f"/tmp/financeai/{folder}"
        os.makedirs(path, exist_ok=True)
        safe_key = key.replace("/","_").replace("\\","_")
        with open(f"{path}/{safe_key}.json", "w") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"[WARN] Persist failed {folder}/{key}: {e}")

def _load(folder: str, key: str) -> dict | None:
    try:
        safe_key = key.replace("/","_").replace("\\","_")
        path = f"/tmp/financeai/{folder}/{safe_key}.json"
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
    except Exception as e:
        print(f"[WARN] Load failed {folder}/{key}: {e}")
    return None

# ── Stubs for imports that reference ORM ─────────────────────────────────────
async def get_db(): yield None
class Statement: pass
class Transaction: pass
class FinancialReport: pass
class Base:
    metadata = type("M",(),{"create_all":lambda *a,**k:None})()

# ── Report history (multiple reports per user) ────────────────────────────────
def save_report_history(user_id: str, report: dict, statement_id: str):
    """Append report to user history. Keep last 12."""
    history = get_report_history(user_id)
    entry   = {
        "statement_id": statement_id,
        "report": report,
        "created_at": datetime.utcnow().isoformat(),
    }
    history.append(entry)
    history = history[-12:]  # Keep last 12 months
    _persist("history", user_id, history)
    # Save latest as current too
    save_report(user_id, statement_id, report)

def get_report_history(user_id: str) -> list:
    data = _load("history", user_id)
    return data if isinstance(data, list) else []

def get_previous_report(user_id: str) -> dict | None:
    history = get_report_history(user_id)
    return history[-2] if len(history) >= 2 else None

def compare_reports(current: dict, previous: dict) -> dict:
    cr = current.get("report", {})
    pr = previous.get("report", {})
    cs = cr.get("summary", {})
    ps = pr.get("summary", {})
    chs = cr.get("health_score", {})
    phs = pr.get("health_score", {})

    def pct_change(new, old):
        if not old or old == 0: return 0
        return round((new - old) / old * 100, 1)

    return {
        "spend_change":        pct_change(cs.get("total_spend",0), ps.get("total_spend",0)),
        "savings_change":      pct_change(cs.get("net_savings",0), ps.get("net_savings",0)),
        "income_change":       pct_change(cs.get("total_income",0), ps.get("total_income",0)),
        "score_change":        chs.get("overall_score",0) - phs.get("overall_score",0),
        "current_score":       chs.get("overall_score",0),
        "previous_score":      phs.get("overall_score",0),
        "current_savings":     cs.get("net_savings",0),
        "previous_savings":    ps.get("net_savings",0),
        "current_spend":       cs.get("total_spend",0),
        "previous_spend":      ps.get("total_spend",0),
        "currency":            cs.get("currency","AED"),
    }

# ── Streak / gamification state ────────────────────────────────────────────────
def save_streak(user_id: str, streak_data: dict):
    _persist("streak", user_id, streak_data)

def get_streak(user_id: str) -> dict:
    return _load("streak", user_id) or {"current_streak":0,"best_streak":0,"total_points":0,"last_active_date":None}

def update_streak_on_activity(user_id: str) -> dict:
    """
    Real streak tracking based on calendar dates of activity (e.g. statement uploads).
    Call this once per upload. Increments only if the last activity was yesterday;
    resets to 1 if there's a gap; stays the same if already counted today.
    """
    from datetime import date
    today = date.today().isoformat()
    streak = get_streak(user_id)
    last_date = streak.get("last_active_date")

    if last_date == today:
        # Already counted today — no change
        pass
    elif last_date is None:
        streak["current_streak"] = 1
    else:
        try:
            from datetime import date as date_cls
            last = date_cls.fromisoformat(last_date)
            gap_days = (date.today() - last).days
            if gap_days == 1:
                streak["current_streak"] = streak.get("current_streak", 0) + 1
            elif gap_days > 1:
                streak["current_streak"] = 1  # Streak broken
            # gap_days == 0 handled above already
        except Exception:
            streak["current_streak"] = 1

    streak["last_active_date"] = today
    streak["best_streak"] = max(streak.get("best_streak", 0), streak["current_streak"])
    streak["total_points"] = streak.get("total_points", 0) + 10

    save_streak(user_id, streak)
    return streak

def save_challenge(user_id: str, challenge_id: str, status: str):
    data = _load("challenges", user_id) or {}
    data[challenge_id] = {"status": status, "updated": datetime.utcnow().isoformat()}
    _persist("challenges", user_id, data)

def get_challenges(user_id: str) -> dict:
    return _load("challenges", user_id) or {}
