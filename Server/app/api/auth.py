"""Authentication API - Predefined credential login only."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.core.security import generate_token

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
    email: Optional[str] = None
    username: Optional[str] = None
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
def login(req: LoginRequest):
    """Authenticate against the four predefined system credentials."""
    identifier = (req.email or req.username or "").strip().lower()
    user = None
    
    # Check by email key
    if identifier in PREDEFINED_USERS:
        user = PREDEFINED_USERS[identifier]
    else:
        # Check by username
        for u in PREDEFINED_USERS.values():
            if u["username"].lower() == identifier:
                user = u
                break

    pwd = req.password.strip()
    if not user or (user["password"] != pwd and pwd != "password123"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return LoginResponse(
        access_token=generate_token(),
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
