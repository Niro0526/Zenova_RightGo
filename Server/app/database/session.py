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
        return "sqlite:///./rightgo_dev.db"
    url = url.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    match = re.match(r"^(postgresql(?:\+[a-zA-Z0-9_-]+)?://)([^:]+):([^@]+)@(.+)$", url)
    if match:
        scheme, user, raw_pwd, rest = match.groups()
        raw_pwd = raw_pwd.strip("[]")
        encoded_pwd = urllib.parse.quote_plus(urllib.parse.unquote_plus(raw_pwd))
        return f"{scheme}{user}:{encoded_pwd}@{rest}"
    return url

def get_engine_args(url: str):
    args = {}
    if url.startswith("sqlite"):
        args["connect_args"] = {"check_same_thread": False}
    else:
        # PostgreSQL / Supabase settings
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
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
