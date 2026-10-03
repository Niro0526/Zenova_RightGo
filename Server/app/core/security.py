"""Authentication and security utilities for demo & production."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from app.core.config import settings

def get_password_hash(password: str) -> str:
    """Generate SHA-256 password hash with salt for secure storage."""
    salt = "rightgo-salt-2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password."""
    # Support simple demo match or SHA-256
    if plain_password == hashed_password:
        return True
    return get_password_hash(plain_password) == hashed_password

def generate_otp_code(length: int = 6) -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return "".join(secrets.choice("0123456789") for _ in range(length))

def generate_token(length: int = 32) -> str:
    """Generate a random bearer token string."""
    return secrets.token_hex(length)
