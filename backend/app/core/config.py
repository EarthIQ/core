from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_name: str = "EarthIQ Core"
    app_version: str = "0.1.0"
    debug: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://earthiq:earthiq@localhost:5432/earthiq"
    )

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 h

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Tiles ─────────────────────────────────────────────────────────────────
    maptiler_key: str = ""

    # ── Object Storage (RustFS / S3-compatible) ───────────────────────────────
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = "earthiq"
    storage_secret_key: str = "earthiq"
    storage_bucket: str = "earthiq"
    storage_region: str = "us-east-1"  # Required by boto3; RustFS ignores it


@lru_cache
def get_settings() -> Settings:
    return Settings()
