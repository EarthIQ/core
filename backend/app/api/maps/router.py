from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.auth.models import User
from app.api.auth.router import get_current_user
from app.core.security import decode_access_token, JWTError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.maps.schemas import MapCreate, MapRead, MapUpdate, MapShareUpdate
from app.api.maps.service import (
    list_accessible_maps,
    get_accessible_map,
    create_map,
    update_map,
    delete_map,
    share_map,
)

router = APIRouter(tags=["maps"])
_optional_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload["sub"]
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user if (user and user.is_active) else None
    except (JWTError, KeyError):
        return None


@router.get("", response_model=List[MapRead], summary="List all maps accessible to current user")
async def list_maps(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    return await list_accessible_maps(db, current_user)


@router.post("", response_model=MapRead, status_code=status.HTTP_201_CREATED, summary="Create a new map")
async def create_new_map(
    body: MapCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_map(db, current_user, body)


@router.get("/{map_id}", response_model=MapRead, summary="Get single map by map_id if permitted")
async def get_map_by_id(
    map_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    return await get_accessible_map(db, map_id, current_user, required_perm="read")


@router.put("/{map_id}", response_model=MapRead, summary="Update map viewport/layers (write permission required)")
async def update_map_config(
    map_id: str,
    body: MapUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_map(db, map_id, current_user, body)


@router.delete("/{map_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete map (owner/admin required)")
async def delete_map_item(
    map_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_map(db, map_id, current_user)


@router.post("/{map_id}/share", response_model=MapRead, summary="Share map with groups or toggle public status")
async def share_map_config(
    map_id: str,
    body: MapShareUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await share_map(db, map_id, current_user, body)
