"""Loading issues API endpoints."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.operations import LoadingIssue
from app.schemas.loading import (
    LoadingIssueCreateRequest,
    LoadingIssueActionRequest,
    LoadingIssueResponseSchema,
)
from app.services.loading_service import create_loading_issue, resolve_loading_issue

router = APIRouter(prefix="/issues", tags=["Loading Issues"])

@router.get("/loading", response_model=List[LoadingIssueResponseSchema])
def list_loading_issues(manifest_version: int = 1, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader", "dispatcher"))):
    """List pre-departure loading issues for a manifest version."""
    return db.query(LoadingIssue).filter(
        LoadingIssue.manifest_version == manifest_version
    ).order_by(LoadingIssue.reported_at.desc()).all()

@router.post("/loading", response_model=LoadingIssueResponseSchema)
def api_create_loading_issue(req: LoadingIssueCreateRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader"))):
    """Create a warehouse pre-departure loading issue."""
    return create_loading_issue(db, req)

@router.post("/loading/{issue_id}/action", response_model=LoadingIssueResponseSchema)
def api_resolve_loading_issue(issue_id: str, req: LoadingIssueActionRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader", "dispatcher"))):
    """Resolve or escalate a warehouse loading issue."""
    return resolve_loading_issue(db, issue_id, req)
