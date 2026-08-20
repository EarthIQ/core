"""
L1 — Unit tests for ``app.core.security`` (pure functions, no I/O).

Covers:
  • Password hashing / verification (SHA-256 → bcrypt, long-password fallback)
  • JWT create / decode round-trip
  • JWT rejection of expired & tampered tokens
"""
from __future__ import annotations

from datetime import timedelta

import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.core.config import get_settings
# ── Password hashing ─────────────────────────────────────────────────────────

def test_hash_password_returns_bcrypt_hash():
    hashed = hash_password("mySecret123")
    assert hashed.startswith("$2b$")  # bcrypt identifier
    assert "mySecret123" not in hashed  # plaintext never stored


def test_verify_password_correct():
    hashed = hash_password("correct-horse-battery")
    assert verify_password("correct-horse-battery", hashed) is True


def test_verify_password_incorrect():
    hashed = hash_password("correct-horse-battery")
    assert verify_password("wrong-password", hashed) is False


def test_verify_password_long_input_over_72_bytes():
    """bcrypt truncates at 72 bytes; our SHA-256 pre-hash avoids that."""
    long_pw = "a" * 200
    hashed = hash_password(long_pw)
    assert verify_password(long_pw, hashed) is True
    assert verify_password("a" * 199, hashed) is False


def test_two_hashes_for_same_password_differ():
    """bcrypt uses a random salt, so hashes are not deterministic."""
    h1 = hash_password("same-pw")
    h2 = hash_password("same-pw")
    assert h1 != h2
    # but both verify
    assert verify_password("same-pw", h1) is True
    assert verify_password("same-pw", h2) is True


def test_verify_password_garbage_hash_does_not_raise():
    # Malformed stored hash should return False, not crash
    assert verify_password("anything", "not-a-bcrypt-hash") is False


# ── JWT ──────────────────────────────────────────────────────────────────────

def test_jwt_roundtrip_preserves_subject():
    token = create_access_token(subject="user-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert "exp" in payload


def test_jwt_roundtrip_with_extra_claims():
    token = create_access_token(subject="user-123", extra={"role": "admin"})
    payload = decode_access_token(token)
    assert payload["role"] == "admin"


def test_jwt_custom_expiry():
    token = create_access_token(subject="u", expires_delta=timedelta(hours=2))
    payload = decode_access_token(token)
    assert "exp" in payload


def test_jwt_expired_token_rejected():
    from jose import ExpiredSignatureError

    token = create_access_token(
        subject="u", expires_delta=timedelta(seconds=-10)
    )
    with pytest.raises(ExpiredSignatureError):
        decode_access_token(token)


def test_jwt_tampered_token_rejected():
    from jose import JWTError

    token = create_access_token(subject="u")
    tampered = token[:-3] + ("aaa" if not token.endswith("aaa") else "bbb")
    with pytest.raises(JWTError):
        decode_access_token(tampered)


def test_jwt_wrong_secret_rejected():
    """A token signed with a different secret must not verify."""
    from jose import jwt
    from app.core.security import JWTError

    settings = get_settings()
    foreign = jwt.encode(
        {"sub": "u"}, "totally-different-secret", algorithm=settings.jwt_algorithm
    )
    with pytest.raises(JWTError):
        decode_access_token(foreign)