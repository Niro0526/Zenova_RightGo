"""Database engine and session management."""

import re
import urllib.parse
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

def sanitize_db_url(url: str) -> str:
    """Sanitize and encode database URL components safely."""
    if not url or "YOUR_SUPABASE" in url or "your-project" in url or not (url.startswith("postgresql") or url.startswith("postgres") or url.startswith("sqlite")):
        print(
            f"[RightGo] DATABASE_URL is unset or a placeholder (got: {url!r}) - "
            "falling back to local SQLite (sqlite:///./rightgo_dev.db). "
            "Set a real DATABASE_URL to use PostgreSQL."
        )
        return "sqlite:///./rightgo_dev.db"
    url = url.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    # Split scheme
    if "://" in url:
        scheme, remainder = url.split("://", 1)
        if "@" in remainder:
            # Everything after last @ is host:port/db
            auth_part, host_part = remainder.rsplit("@", 1)
            if ":" in auth_part:
                user, raw_pwd = auth_part.split(":", 1)
                raw_pwd = raw_pwd.strip("[]")
                encoded_pwd = urllib.parse.quote_plus(urllib.parse.unquote_plus(raw_pwd))
                return f"{scheme}://{user}:{encoded_pwd}@{host_part}"
    return url

def get_engine_args(url: str):
    args = {}
    if url.startswith("sqlite"):
        args["connect_args"] = {"check_same_thread": False}
    else:
        # PostgreSQL / Supabase pooler (PgBouncer) settings
        args["connect_args"] = {"prepare_threshold": None}
        args["pool_size"] = 10
        args["max_overflow"] = 20
        args["pool_pre_ping"] = True
        args["pool_recycle"] = 300
    return args

database_url = sanitize_db_url(settings.DATABASE_URL)

try:
    engine = create_engine(database_url, **get_engine_args(database_url))
except Exception as e:
    print(f"[Warning] Failed to initialize primary database engine with {database_url}: {e}")
    engine = create_engine("sqlite:///./rightgo_dev.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session. Rolls back on any unhandled
    exception so a failed request (e.g. a mid-release error) leaves no partial
    writes behind, instead of relying on close() to discard the transaction."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
