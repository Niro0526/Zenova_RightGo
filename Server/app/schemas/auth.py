"""Authentication Pydantic schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = "password123"

class RequestOtpRequest(BaseModel):
    identifier: str # Username, Phone number, or Employee ID
    role: Optional[str] = None

class RequestOtpResponse(BaseModel):
    status: str
    message: str
    identifier: str
    demo_otp: Optional[str] = None # When demo flag is on, returns code for instant UI simulation
    expires_in_seconds: int = 300

class VerifyOtpRequest(BaseModel):
    identifier: str
    otp_code: str
    role: Optional[str] = None

class RegisterRequest(BaseModel):
    username: str
    password: Optional[str] = "password123"
    role: str # dispatcher, loader, driver, store_manager
    display_name: str
    phone: Optional[str] = None
    outlet_id: Optional[str] = None # For store_manager (e.g. OUT001)
    vehicle_id: Optional[str] = None # For driver (e.g. PEL-R04)
    depot: Optional[str] = "Peliyagoda" # For loader/dispatcher
    otp_code: Optional[str] = None

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

class DemoAccountInfo(BaseModel):
    username: str
    role: str
    display_name: str
    description: str
    home_route: str
    outlet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    phone: Optional[str] = None
