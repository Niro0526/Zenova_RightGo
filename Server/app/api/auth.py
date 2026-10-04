"""Authentication API - Predefined credential login only."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.security import generate_token
from app.core.config import settings
from app.core.deps import get_current_user, CurrentUser
from app.database.session import get_db
from app.models.session import AuthSession

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Four predefined system users - one per operational role
PREDEFINED_USERS = {
    "dilani@rightgo.lk": {
        "id": "usr-001",
        "username": "dilani",
        "email": "dilani@rightgo.lk",
        "password": "Dispatch@2026",
        "role": "dispatcher",
        "display_name": "Dilani Perera",
        "outlet_id": None,
        "vehicle_id": None,
        "phone": "+94 77 1234567",
    },
    "rizwan@rightgo.lk": {
        "id": "usr-002",
        "username": "rizwan",
        "email": "rizwan@rightgo.lk",
        "password": "Loader@2026",
        "role": "loader",
        "display_name": "Rizwan Farook",
        "outlet_id": None,
        "vehicle_id": None,
        "phone": "+94 77 2345678",
    },
    "sunil@rightgo.lk": {
        "id": "usr-003",
        "username": "sunil",
        "email": "sunil@rightgo.lk",
        "password": "Driver@2026",
        "role": "driver",
        "display_name": "Sunil Bandara",
        "outlet_id": None,
        "vehicle_id": "PEL-R04",
        "phone": "+94 77 3456789",
    },
    "kavitha@rightgo.lk": {
        "id": "usr-004",
        "username": "kavitha",
        "email": "kavitha@rightgo.lk",
        "password": "Store@2026",
        "role": "store_manager",
        "display_name": "Kavitha Jayasinghe",
        "outlet_id": "OUT001",
        "vehicle_id": None,
        "phone": "+94 77 4567890",
    },
}

HOME_ROUTES = {
    "dispatcher":    "/dispatcher",
    "loader":        "/loader",
    "driver":        "/driver",
    "store_manager": "/store-manager",
}


class LoginRequest(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    role: str
    display_name: str
    outlet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    phone: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    home_route: str
    profile: UserProfile


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate against the four predefined system credentials and issue a
    bearer token backed by a real server-side session row - the token is
    meaningless on its own; every protected endpoint looks it up via
    get_current_user/require_role in app.core.deps."""
    email_lower = req.email.strip().lower()
    user = PREDEFINED_USERS.get(email_lower)

    if not user or user["password"] != req.password.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = generate_token()
    now = datetime.now(timezone.utc)
    db.add(AuthSession(
        token=token,
        user_id=user["id"],
        username=user["username"],
        role=user["role"],
        display_name=user["display_name"],
        outlet_id=user["outlet_id"],
        vehicle_id=user["vehicle_id"],
        created_at=now,
        expires_at=now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    ))
    db.commit()

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        home_route=HOME_ROUTES[user["role"]],
        profile=UserProfile(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            display_name=user["display_name"],
            outlet_id=user["outlet_id"],
            vehicle_id=user["vehicle_id"],
            phone=user["phone"],
        ),
    )

@router.post("/logout")
def logout(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invalidate the current session server-side."""
    db.query(AuthSession).filter(AuthSession.user_id == user.user_id).delete()
    db.commit()
    return {"status": "logged_out"}

@router.get("/me", response_model=UserProfile)
def whoami(user: CurrentUser = Depends(get_current_user)):
    """Confirm the current session and return the authenticated profile -
    used by the frontend to restore a session after a page refresh without
    re-trusting whatever it has sitting in sessionStorage."""
    full = PREDEFINED_USERS.get(next((k for k, v in PREDEFINED_USERS.items() if v["id"] == user.user_id), ""), {})
    return UserProfile(
        id=user.user_id,
        username=user.username,
        email=full.get("email", ""),
        role=user.role,
        display_name=user.display_name,
        outlet_id=user.outlet_id,
        vehicle_id=user.vehicle_id,
        phone=full.get("phone"),
    )
