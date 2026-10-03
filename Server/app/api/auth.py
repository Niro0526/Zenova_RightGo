"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserProfile
from app.core.security import verify_password, generate_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

HOME_ROUTES = {
    "dispatcher": "/dispatcher",
    "loader": "/loader",
    "driver": "/driver",
    "store_manager": "/store-manager",
}

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username and password."""
    user = db.query(User).filter(User.username == req.username.strip().lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    profile = UserProfile(
        id=user.id,
        username=user.username,
        role=user.role,
        display_name=user.display_name,
        outlet_id=user.outlet_id,
        vehicle_id=user.vehicle_id,
        phone=user.phone,
    )

    home_route = HOME_ROUTES.get(user.role, "/")

    return LoginResponse(
        access_token=generate_token(),
        token_type="bearer",
        role=user.role,
        home_route=home_route,
        profile=profile,
    )
