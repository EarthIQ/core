from __future__ import annotations

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.auth.models import User
from app.api.auth.router import get_current_user
from app.core.security import decode_access_token, JWTError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.projects.schemas import ProjectCreate, ProjectRead, ProjectUpdate
from app.api.projects.service import (
    list_accessible_projects,
    get_accessible_project,
    create_project,
    update_project,
    delete_project,
)

# For Map publishing inside projects
from app.api.maps.schemas import MapCreate, MapRead
from app.api.maps.models import MapModel, MapGroupAccess
from app.api.maps.service import get_accessible_map

router = APIRouter(tags=["projects"])
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


@router.get("", response_model=List[ProjectRead], summary="List all projects accessible to current user")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    return await list_accessible_projects(db, current_user)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED, summary="Create a new project workspace")
async def create_new_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_project(db, current_user, body)


@router.get("/{project_id}", response_model=ProjectRead, summary="Get single project workspace by project_id")
async def get_project_by_id(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    return await get_accessible_project(db, project_id, current_user, required_perm="read")


@router.put("/{project_id}", response_model=ProjectRead, summary="Update project workspace config")
async def update_project_config(
    project_id: str,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_project(db, project_id, current_user, body)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project workspace")
async def delete_project_item(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_project(db, project_id, current_user)


# ── Publish and Manage Maps inside Projects ──────────────────────────────────
@router.post("/{project_id}/maps", response_model=MapRead, status_code=status.HTTP_201_CREATED, summary="Publish a new map from this project workspace")
async def publish_map_from_project(
    project_id: str,
    body: MapCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify write access to the project
    await get_accessible_project(db, project_id, current_user, required_perm="write")

    map_item = MapModel(
        id=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
        center_lng=body.center_lng,
        center_lat=body.center_lat,
        zoom=body.zoom,
        basemap=body.basemap,
        layers_config=[l.model_dump() for l in body.layers_config],
        is_public=body.is_public,
        project_id=project_id,
        widgets_config=body.widgets_config,
        owner_id=current_user.id,
    )
    db.add(map_item)
    await db.flush()

    for ga in body.group_access:
        access = MapGroupAccess(
            id=str(uuid.uuid4()),
            map_id=map_item.id,
            group_id=ga.group_id,
            permission=ga.permission,
        )
        db.add(access)

    await db.flush()
    await db.refresh(map_item)
    return await get_accessible_map(db, map_item.id, current_user, required_perm="admin")
