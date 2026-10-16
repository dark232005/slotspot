import os
from typing import List
from pydantic_settings import BaseSettings


def parse_cors_origins() -> List[str]:
    raw = os.getenv("CORS_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]


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
    CORS_ORIGINS: List[str] = parse_cors_origins()

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
