from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.schemas import Token, UserCreate, UserRead, UserLogin
from app.api.auth.service import authenticate_user, create_user, get_user_by_email
from app.core.db import get_db
from app.core.security import JWTError, create_access_token, decode_access_token

router = APIRouter(tags=["auth"])
_bearer = HTTPBearer()


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserRead, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    return await create_user(db, body)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/token", response_model=Token)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id)
    return Token(access_token=token)


# ── Current user ──────────────────────────────────────────────────────────────

async def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid token")
    from sqlalchemy import select
    from app.api.auth.models import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


@router.get("/me", response_model=UserRead)
async def me(current_user=Depends(_get_current_user)):
    return current_user


# Export the dependency for use in other routers
get_current_user = _get_current_user
