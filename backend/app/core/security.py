from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    # Hash password with SHA-256 first to bypass bcrypt's 72-byte limit safely
    sha256_hash = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(sha256_hash.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    # 1. Try verify using the SHA-256 pre-hashed method
    sha256_hash = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    try:
        if bcrypt.checkpw(sha256_hash.encode("utf-8"), hashed.encode("utf-8")):
            return True
    except Exception:
        pass

    # 2. Fallback to old plain method for backwards compatibility (only if length <= 72)
    if len(plain) <= 72:
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            pass

    return False


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(
    subject: Any,
    extra: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    payload = {"sub": str(subject), "exp": expire, **(extra or {})}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and return the JWT payload. Raises jose.JWTError on failure."""
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "JWTError",
]
