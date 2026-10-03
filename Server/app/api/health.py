"""System Health and Status API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """Health check reporting API and database connectivity status."""
    db_ok = False
    db_type = "PostgreSQL" if "postgres" in settings.DATABASE_URL.lower() else "SQLite"
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print(f"[Health] DB check failed: {e}")
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "connected": db_ok,
            "engine": db_type,
            "target": "Supabase PostgreSQL" if "supabase" in settings.DATABASE_URL.lower() else db_type,
        },
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }
