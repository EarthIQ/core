"""
app/core/guardrail.py
~~~~~~~~~~~~~~~~~~~~~
Fail-fast guardrails that keep production deployments safe.

:func:`validate_production_settings` inspects the loaded :class:`Settings` and
raises when a *production* boot is attempted while one or more default/insecure
credentials are still in use (JWT secret, object-storage keys, database
password). It is a no-op outside production so local dev and the hermetic test
harness are unaffected.

Ticket: T-04 (prod secret guardrail).
"""
from __future__ import annotations

import logging
from urllib.parse import unquote, urlsplit

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

# Values that are fine as *development* defaults but must never reach prod.
_DEFAULT_JWT_SECRETS = {"change-me-in-production", "change-me", "secret", ""}
_DEFAULT_STORAGE_KEYS = {"earthiq", "minioadmin", "changeme", ""}
_DEFAULT_DB_PASSWORDS = {"earthiq", "postgres", "password", ""}


def _db_password(database_url: str) -> str:
    """Best-effort extraction of the password component of a DB URL."""
    try:
        return unquote(urlsplit(database_url).password or "")
    except Exception:  # pragma: no cover - defensive
        return ""


def find_default_secrets(settings: Settings) -> list[str]:
    """Return a human-readable list of insecure default values still in use."""
    problems: list[str] = []
    if settings.jwt_secret.strip().lower() in _DEFAULT_JWT_SECRETS:
        problems.append("JWT_SECRET is using a default/placeholder value")
    if settings.storage_access_key.strip().lower() in _DEFAULT_STORAGE_KEYS:
        problems.append("STORAGE_ACCESS_KEY is using a default value")
    if settings.storage_secret_key.strip().lower() in _DEFAULT_STORAGE_KEYS:
        problems.append("STORAGE_SECRET_KEY is using a default value")
    if _db_password(settings.database_url).lower() in _DEFAULT_DB_PASSWORDS:
        problems.append("DATABASE_URL uses a default/weak password")
    return problems


def is_production(settings: Settings) -> bool:
    return settings.app_env.strip().lower() in ("prod", "production")


def validate_production_settings(settings: Settings | None = None) -> None:
    """Raise ``RuntimeError`` if a production boot is using default secrets.

    A no-op (with an info log) when not in production, so dev/test flows are
    unaffected. Call this at the start of the FastAPI lifespan.
    """
    s = settings or get_settings()
    if not is_production(s):
        logger.info("guardrail: not in production, skipping secret validation.")
        return
    problems = find_default_secrets(s)
    if problems:
        message = (
            "Refusing to start in production mode with insecure defaults:\n  - "
            + "\n  - ".join(problems)
            + "\n\nSet real secrets (JWT_SECRET, STORAGE_ACCESS_KEY, "
            "STORAGE_SECRET_KEY, and the DATABASE_URL password) before booting "
            "with APP_ENV=prod."
        )
        raise RuntimeError(message)
    logger.info("guardrail: production secret validation passed.")
