from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings


async def get_supabase() -> Any:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        )

    from supabase import acreate_client

    return await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)