"""Storage API router for Supabase Storage signed URLs, evidence uploads, and local streaming."""

import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.services.storage_service import storage_service

router = APIRouter(prefix="/storage", tags=["Storage & Evidence"])

class StorageUploadPayload(BaseModel):
    bucket: str = "pod-photos" # pod-signatures, pod-photos, driver-issue-evidence, loading-issue-evidence
    identifier: str = "obj"
    dataPayload: str # Base64 string or data URL
    filenameHint: Optional[str] = None

class StorageUploadResponse(BaseModel):
    storagePath: str
    signedUrl: Optional[str] = None
    bucket: str

class SignedUrlResponse(BaseModel):
    storagePath: str
    signedUrl: Optional[str] = None

@router.post("/upload", response_model=StorageUploadResponse)
def api_upload_evidence(payload: StorageUploadPayload):
    """
    Ingest evidence file/signature payload into Supabase private bucket.
    Returns collision-safe storage reference path and short-lived signed URL.
    """
    storage_ref = storage_service.upload_evidence(
        bucket=payload.bucket,
        data_payload=payload.dataPayload,
        identifier=payload.identifier,
        filename_hint=payload.filenameHint,
    )
    signed_url = storage_service.get_signed_url(storage_ref, expires_in=settings.STORAGE_SIGNED_URL_EXPIRES_IN)
    
    return StorageUploadResponse(
        storagePath=storage_ref,
        signedUrl=signed_url,
        bucket=payload.bucket,
    )

@router.get("/signed-url", response_model=SignedUrlResponse)
def api_get_signed_url(path: str = Query(..., description="Canonical storage reference path (e.g. pod-signatures/DEL_123.png)")):
    """Generate short-lived signed URL for a private Supabase Storage evidence path."""
    signed_url = storage_service.get_signed_url(path, expires_in=settings.STORAGE_SIGNED_URL_EXPIRES_IN)
    return SignedUrlResponse(
        storagePath=path,
        signedUrl=signed_url,
    )

@router.get("/local-file/{bucket}/{file_path:path}")
def api_get_local_evidence_file(bucket: str, file_path: str):
    """Serve locally stored evidence fallback for offline / mock test execution."""
    local_target = Path(settings.STORAGE_LOCAL_DIR) / bucket / file_path
    if not local_target.exists() or not local_target.is_file():
        raise HTTPException(status_code=404, detail="Requested evidence file not found in local storage cache.")
    
    mime_type = "image/png" if file_path.endswith(".png") else "image/jpeg"
    return FileResponse(local_target, media_type=mime_type)

@router.post("/migrate-legacy-base64")
def api_migrate_legacy_base64_records(db: Session = Depends(get_db)):
    """Migrate any existing Base64 strings in PostgreSQL tables to Supabase Storage references."""
    counts = storage_service.migrate_all_legacy_base64_records(db)
    return {
        "success": True,
        "migrated": counts,
    }
