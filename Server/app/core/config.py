"""Core configuration settings for RightGo backend."""

import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR_DEFAULT = ROOT_DIR / "data"

class Settings(BaseSettings):
    PROJECT_NAME: str = "RightGo API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database - Supabase PostgreSQL as primary database
    DATABASE_URL: str = "postgresql://postgres.your-project:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    
    # Dataset directory
    RIGHTGO_DATA_DIR: str = str(DATA_DIR_DEFAULT)
    
    # Demo behavior
    RIGHTGO_DEMO_OTP_IN_APP: bool = True
    TIMEZONE: str = "Asia/Colombo"
    
    # Security / Auth
    SECRET_KEY: str = "rightgo-tech-triathlon-2026-super-secret-key-zenova"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for demo
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: Union[List[str], str] = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            if self.CORS_ORIGINS.startswith("[") and self.CORS_ORIGINS.endswith("]"):
                import json
                try:
                    return json.loads(self.CORS_ORIGINS)
                except Exception:
                    pass
            return [i.strip() for i in self.CORS_ORIGINS.split(",") if i.strip()]
        return ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )

settings = Settings()
