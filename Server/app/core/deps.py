"""Authentication/authorization dependencies.

Every protected endpoint depends on get_current_user (or require_role), which
looks the bearer token up against the auth_sessions table created at login -
previously no endpoint verified the token at all, so any request with no
Authorization header (or a made-up one) could call any endpoint."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.session import AuthSession

bearer_scheme = HTTPBearer(auto_error=False)

class CurrentUser:
    def __init__(self, session: AuthSession):
        self.token = session.token
        self.user_id = session.user_id
        self.username = session.username
        self.role = session.role
        self.display_name = session.display_name
        self.outlet_id = session.outlet_id
        self.vehicle_id = session.vehicle_id

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - missing bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    session = db.query(AuthSession).filter(AuthSession.token == token).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired - please log in again.")
    return CurrentUser(session)

def require_role(*allowed_roles: str):
    """Dependency factory: raises 403 unless the authenticated user's role is
    one of allowed_roles. Use for endpoints a single role should perform."""
    def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to perform this action (requires: {', '.join(allowed_roles)}).",
            )
        return user
    return _check
