"""Authentication Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    id: str
    username: str
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
