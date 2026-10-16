import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SlotSpot Campus Resource Booking"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database: Supports PostgreSQL and SQLite fallback
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./slotspot.db"
    )

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "slotspot-insecure-dev-secret-key-change-in-prod-xyz123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # No-show Grace Period defaults
    DEFAULT_NO_SHOW_GRACE_MINUTES: int = int(os.getenv("DEFAULT_NO_SHOW_GRACE_MINUTES", "10"))
    NO_SHOW_CHECK_INTERVAL_SECONDS: int = int(os.getenv("NO_SHOW_CHECK_INTERVAL_SECONDS", "15"))

    # CORS configuration
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        # Render and Heroku use postgres:// which SQLAlchemy 2.0 rejects in favor of postgresql://
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
