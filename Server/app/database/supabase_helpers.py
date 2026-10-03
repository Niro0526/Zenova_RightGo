"""Shared Supabase query error handling."""

from fastapi import HTTPException, status


def log_db_error(exc: Exception) -> None:
    print("DB Error:", str(exc))


def raise_db_http(exc: Exception, detail: str = "Database operation failed") -> None:
    log_db_error(exc)
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=detail,
    ) from exc
