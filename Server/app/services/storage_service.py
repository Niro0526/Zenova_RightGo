"""
Supabase Storage Service for RightGo Operational Evidence Architecture.
Handles private buckets (pod-signatures, pod-photos, driver-issue-evidence, loading-issue-evidence),
collision-safe UUID naming, signed URL generation, base64 conversion, and offline fallback.
"""

import os
import re
import uuid
import base64
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from urllib.parse import urlparse
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger("rightgo.storage")

class SupabaseStorageService:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL.rstrip("/")
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
        self.local_dir = Path(settings.STORAGE_LOCAL_DIR)
        self.local_dir.mkdir(parents=True, exist_ok=True)
        
        # Standard private evidence buckets
        self.buckets = {
            "pod-signatures": settings.BUCKET_POD_SIGNATURES,
            "pod-photos": settings.BUCKET_POD_PHOTOS,
            "driver-issue-evidence": settings.BUCKET_DRIVER_ISSUE_EVIDENCE,
            "loading-issue-evidence": settings.BUCKET_LOADING_ISSUE_EVIDENCE,
            "receipt-evidence": settings.BUCKET_RECEIPT_EVIDENCE,
        }

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
        }
        if self.service_key:
            headers["apikey"] = self.service_key
            headers["Authorization"] = f"Bearer {self.service_key}"
        return headers

    def parse_base64_data(self, data_str: str) -> Tuple[bytes, str, str]:
        """
        Parse base64 data URL (e.g. data:image/png;base64,...) or raw base64.
        Returns: (file_bytes, mime_type, extension)
        """
        data_str = data_str.strip()
        mime_type = "image/png"
        extension = "png"
        
        # Check for data URL scheme
        if data_str.startswith("data:"):
            header, _, encoded = data_str.partition(",")
            match = re.match(r"data:([^;]+);base64", header)
            if match:
                mime_type = match.group(1).lower()
                if "jpeg" in mime_type or "jpg" in mime_type:
                    extension = "jpg"
                elif "png" in mime_type:
                    extension = "png"
                elif "webp" in mime_type:
                    extension = "webp"
                elif "pdf" in mime_type:
                    extension = "pdf"
            file_bytes = base64.b64decode(encoded)
        else:
            # Raw base64 string
            file_bytes = base64.b64decode(data_str)
            
        return file_bytes, mime_type, extension

    def generate_object_name(self, identifier: str, filename_hint: Optional[str] = None, ext: str = "png") -> str:
        """
        Generate a collision-safe object name: <sanitized_identifier>_<short_uuid>.<ext>
        """
        clean_id = re.sub(r"[^a-zA-Z0-9_\-]", "_", identifier or "evidence").strip("_")
        unique_suffix = uuid.uuid4().hex[:10]
        
        if filename_hint:
            hint_ext = filename_hint.split(".")[-1].lower() if "." in filename_hint else ext
            if hint_ext in ("png", "jpg", "jpeg", "webp", "pdf"):
                ext = "jpg" if hint_ext == "jpeg" else hint_ext
                
        return f"{clean_id}_{unique_suffix}.{ext}"

    def upload_bytes(
        self,
        bucket: str,
        file_bytes: bytes,
        filename: str,
        content_type: str = "image/png",
    ) -> str:
        """
        Upload binary payload to Supabase Storage private bucket.
        Falls back safely to local storage directory if Supabase credentials are not set / offline.
        Returns canonical storage reference: "{bucket}/{filename}"
        """
        storage_ref = f"{bucket}/{filename}"
        uploaded_remote = False

        if self.service_key and self.supabase_url:
            try:
                upload_url = f"{self.supabase_url}/storage/v1/object/{bucket}/{filename}"
                headers = {
                    "apikey": self.service_key,
                    "Authorization": f"Bearer {self.service_key}",
                    "Content-Type": content_type,
                    "x-upsert": "true",
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(upload_url, headers=headers, content=file_bytes)
                    if resp.status_code in (200, 201):
                        uploaded_remote = True
                        logger.info(f"Successfully uploaded {storage_ref} to Supabase Storage.")
                    else:
                        logger.warning(f"Supabase Storage returned {resp.status_code}: {resp.text}. Falling back to local storage.")
            except Exception as e:
                logger.warning(f"Failed to upload {storage_ref} to Supabase Storage: {e}. Falling back to local storage.")

        # Always save to local fallback cache so evidence is never lost
        try:
            bucket_dir = self.local_dir / bucket
            bucket_dir.mkdir(parents=True, exist_ok=True)
            local_file = bucket_dir / filename
            local_file.write_bytes(file_bytes)
        except Exception as e:
            logger.error(f"Failed to write local backup for {storage_ref}: {e}")

        return storage_ref

    def upload_evidence(
        self,
        bucket: str,
        data_payload: str,
        identifier: str,
        filename_hint: Optional[str] = None,
    ) -> str:
        """
        Ingest an evidence payload (Base64 string or existing storage reference).
        If already a canonical storage reference or URL, returns as-is.
        If Base64, decodes, saves to Supabase Storage, and returns canonical reference: "{bucket}/{object_name}".
        """
        if not data_payload or not data_payload.strip():
            return ""

        data_payload = data_payload.strip()

        # If already a canonical storage path reference (e.g. "pod-signatures/DEL-001_abc.png")
        if "/" in data_payload and not data_payload.startswith("data:") and len(data_payload) < 300:
            return data_payload

        # If it's a base64 string or data URL, parse and upload
        try:
            file_bytes, mime_type, ext = self.parse_base64_data(data_payload)
            object_name = self.generate_object_name(identifier, filename_hint, ext)
            return self.upload_bytes(bucket, file_bytes, object_name, mime_type)
        except Exception as e:
            logger.error(f"Error processing base64 evidence for {identifier} in {bucket}: {e}")
            # If parsing fails but it's a short text, return it
            return data_payload

    def get_signed_url(self, storage_ref: Optional[str], expires_in: int = 3600) -> Optional[str]:
        """
        Generate short-lived signed URL for a private storage reference.
        Input format: "{bucket}/{object_name}" or absolute URL.
        """
        if not storage_ref or not storage_ref.strip():
            return None

        storage_ref = storage_ref.strip()

        # If already full external URL (http/https)
        if storage_ref.startswith("http://") or storage_ref.startswith("https://"):
            return storage_ref

        # If legacy Base64 string that hasn't been migrated yet, return as data URI
        if storage_ref.startswith("data:image/"):
            return storage_ref

        # Parse bucket and object path
        parts = storage_ref.split("/", 1)
        if len(parts) != 2:
            return storage_ref

        bucket, object_path = parts[0], parts[1]

        # Request signed URL from Supabase Storage API
        if self.service_key and self.supabase_url:
            try:
                sign_url = f"{self.supabase_url}/storage/v1/object/sign/{bucket}/{object_path}"
                headers = self._get_headers()
                payload = {"expiresIn": expires_in}

                with httpx.Client(timeout=6.0) as client:
                    resp = client.post(sign_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        signed_path = data.get("signedURL")
                        if signed_path:
                            return f"{self.supabase_url}/storage/v1{signed_path}"
            except Exception as e:
                logger.warning(f"Could not generate remote signed URL for {storage_ref}: {e}")

        # Local fallback signed URL via FastAPI storage endpoint
        return f"/api/storage/local-file/{bucket}/{object_path}"

    def migrate_all_legacy_base64_records(self, db: Session) -> Dict[str, int]:
        """
        Scan PostgreSQL database and migrate any existing Base64 strings in
        delivery_records, driver_issues, loading_issues to Supabase Storage references.
        """
        from app.models.operations import DeliveryRecord, DriverIssue, LoadingIssue
        
        migrated_counts = {
            "pod_signatures": 0,
            "pod_photos": 0,
            "driver_issues": 0,
            "loading_issues": 0,
        }

        try:
            # 1. Delivery Records
            deliveries = db.query(DeliveryRecord).all()
            for d in deliveries:
                updated = False
                # Migrate signature
                if d.pod_signature_url and (d.pod_signature_url.startswith("data:") or len(d.pod_signature_url) > 200):
                    ref = self.upload_evidence(
                        bucket=settings.BUCKET_POD_SIGNATURES,
                        data_payload=d.pod_signature_url,
                        identifier=f"{d.id}_sig",
                        filename_hint=f"{d.id}_signature.png"
                    )
                    d.pod_signature_url = ref
                    migrated_counts["pod_signatures"] += 1
                    updated = True

                # Migrate photo
                if d.pod_photo_url and (d.pod_photo_url.startswith("data:") or len(d.pod_photo_url) > 200):
                    ref = self.upload_evidence(
                        bucket=settings.BUCKET_POD_PHOTOS,
                        data_payload=d.pod_photo_url,
                        identifier=f"{d.id}_photo",
                        filename_hint=d.pod_photo_name or f"{d.id}_photo.jpg"
                    )
                    d.pod_photo_url = ref
                    migrated_counts["pod_photos"] += 1
                    updated = True

                if updated:
                    db.add(d)

            # 2. Driver Issues
            driver_issues = db.query(DriverIssue).all()
            for issue in driver_issues:
                if issue.photo_url and (issue.photo_url.startswith("data:") or len(issue.photo_url) > 200):
                    ref = self.upload_evidence(
                        bucket=settings.BUCKET_DRIVER_ISSUE_EVIDENCE,
                        data_payload=issue.photo_url,
                        identifier=f"{issue.id}_photo",
                        filename_hint=issue.photo_name or f"{issue.id}_evidence.jpg"
                    )
                    issue.photo_url = ref
                    migrated_counts["driver_issues"] += 1
                    db.add(issue)

            db.commit()
            logger.info(f"Storage migration completed: {migrated_counts}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error during legacy base64 storage migration: {e}")

        return migrated_counts


# Global Singleton
storage_service = SupabaseStorageService()
