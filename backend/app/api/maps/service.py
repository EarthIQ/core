from __future__ import annotations

import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User, UserGroup
from app.api.maps.models import MapModel, MapGroupAccess, MapUserAccess
from app.api.maps.schemas import MapCreate, MapUpdate, MapShareUpdate, MapRead, GroupAccessSchema, PermissionLevel


def compute_user_permission(map_item: MapModel, user: Optional[User]) -> Optional[PermissionLevel]:
    """
    Computes effective permission level for a given user on a map item.
    Returns "admin" | "write" | "read" | None.
    """
    if not user:
        if map_item.is_public:
            return "read"
        if getattr(map_item, "share_link_enabled", False):
            link_role = getattr(map_item, "share_link_role", "viewer")
            return "write" if link_role == "editor" else "read"
        return None

    if user.is_superuser or map_item.owner_id == user.id:
        return "admin"

    highest_perm: Optional[PermissionLevel] = None

    if map_item.is_public:
        highest_perm = "read"

    if getattr(map_item, "share_link_enabled", False):
        link_role = getattr(map_item, "share_link_role", "viewer")
        highest_perm = "write" if link_role == "editor" else "read"

    # Check direct per-user access
    if hasattr(map_item, "user_access") and map_item.user_access:
        for u_acc in map_item.user_access:
            if u_acc.user_id == user.id and not u_acc.pending:
                if u_acc.role == "owner":
                    return "admin"
                if u_acc.role == "editor":
                    highest_perm = "write"
                elif u_acc.role in ("commenter", "viewer") and highest_perm is None:
                    highest_perm = "read"

    # Check group access
    user_group_ids = {g.id for g in user.groups} if hasattr(user, "groups") and user.groups else set()
    for access in map_item.group_access:
        if access.group_id in user_group_ids:
            perm = access.permission
            if perm == "admin":
                return "admin"
            if perm == "write":
                highest_perm = "write"
            elif perm == "read" and highest_perm is None:
                highest_perm = "read"

    return highest_perm


async def list_accessible_maps(db: AsyncSession, current_user: Optional[User]) -> List[MapRead]:
    """Retrieve all maps accessible to the current user (Public + Owned + Group Shared)."""
    q = select(MapModel)

    result = await db.execute(q.order_by(MapModel.updated_at.desc()))
    all_maps = result.scalars().all()

    accessible: List[MapRead] = []
    for map_item in all_maps:
        perm = compute_user_permission(map_item, current_user)
        if perm is not None:
            # Build schema output
            map_dict = {
                "id": map_item.id,
                "title": map_item.title,
                "description": map_item.description,
                "center_lng": map_item.center_lng,
                "center_lat": map_item.center_lat,
                "zoom": map_item.zoom,
                "basemap": map_item.basemap,
                "layers_config": map_item.layers_config or [],
                "is_public": map_item.is_public,
                "owner_id": map_item.owner_id,
                "owner": map_item.owner,
                "group_access": [
                    GroupAccessSchema(
                        group_id=ga.group_id,
                        group_name=ga.group.name if ga.group else None,
                        permission=ga.permission,
                    )
                    for ga in map_item.group_access
                ],
                "user_permission": perm,
                "created_at": map_item.created_at,
                "updated_at": map_item.updated_at,
            }
            accessible.append(MapRead(**map_dict))

    return accessible


async def get_map_by_id(db: AsyncSession, map_id: str) -> Optional[MapModel]:
    result = await db.execute(select(MapModel).where(MapModel.id == map_id))
    return result.scalar_one_or_none()


async def get_accessible_map(
    db: AsyncSession, map_id: str, current_user: Optional[User], required_perm: PermissionLevel = "read"
) -> MapRead:
    map_item = await get_map_by_id(db, map_id)
    if not map_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Map '{map_id}' not found")

    perm = compute_user_permission(map_item, current_user)
    if perm is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this map"
        )

    # Permission check hierarchy: admin > write > read
    perm_rank = {"read": 1, "write": 2, "admin": 3}
    if perm_rank[perm] < perm_rank[required_perm]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You need '{required_perm}' permission to perform this action",
        )

    return MapRead(
        id=map_item.id,
        title=map_item.title,
        description=map_item.description,
        center_lng=map_item.center_lng,
        center_lat=map_item.center_lat,
        zoom=map_item.zoom,
        basemap=map_item.basemap,
        layers_config=map_item.layers_config or [],
        is_public=map_item.is_public,
        owner_id=map_item.owner_id,
        owner=map_item.owner,
        group_access=[
            GroupAccessSchema(
                group_id=ga.group_id,
                group_name=ga.group.name if ga.group else None,
                permission=ga.permission,
            )
            for ga in map_item.group_access
        ],
        user_permission=perm,
        created_at=map_item.created_at,
        updated_at=map_item.updated_at,
    )


async def create_map(db: AsyncSession, owner: User, body: MapCreate) -> MapRead:
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
        owner_id=owner.id,
    )
    db.add(map_item)
    await db.flush()

    # Automatically grant owner role in user access table
    owner_user_access = MapUserAccess(
        id=str(uuid.uuid4()),
        map_id=map_item.id,
        user_id=owner.id,
        email=owner.email,
        role="owner",
        pending=False,
    )
    db.add(owner_user_access)

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
    return await get_accessible_map(db, map_item.id, owner, required_perm="admin")


async def update_map(db: AsyncSession, map_id: str, current_user: User, body: MapUpdate) -> MapRead:
    await get_accessible_map(db, map_id, current_user, required_perm="write")
    map_item = await get_map_by_id(db, map_id)
    if not map_item:
        raise HTTPException(status_code=404, detail="Map not found")

    if body.title is not None:
        map_item.title = body.title
    if body.description is not None:
        map_item.description = body.description
    if body.center_lng is not None:
        map_item.center_lng = body.center_lng
    if body.center_lat is not None:
        map_item.center_lat = body.center_lat
    if body.zoom is not None:
        map_item.zoom = body.zoom
    if body.basemap is not None:
        map_item.basemap = body.basemap
    if body.layers_config is not None:
        map_item.layers_config = [l.model_dump() for l in body.layers_config]
    if body.is_public is not None:
        map_item.is_public = body.is_public

    await db.flush()
    await db.refresh(map_item)
    return await get_accessible_map(db, map_item.id, current_user)


async def delete_map(db: AsyncSession, map_id: str, current_user: User) -> None:
    await get_accessible_map(db, map_id, current_user, required_perm="admin")
    map_item = await get_map_by_id(db, map_id)
    if map_item:
        await db.delete(map_item)
        await db.flush()


async def share_map(db: AsyncSession, map_id: str, current_user: User, body: MapShareUpdate) -> MapRead:
    await get_accessible_map(db, map_id, current_user, required_perm="admin")
    map_item = await get_map_by_id(db, map_id)
    if not map_item:
        raise HTTPException(status_code=404, detail="Map not found")

    if body.is_public is not None:
        map_item.is_public = body.is_public

    # Update group permissions
    existing_access = {ga.group_id: ga for ga in map_item.group_access}
    new_group_ids = {ga.group_id for ga in body.group_access}

    # Delete access for groups no longer specified
    for group_id, access in list(existing_access.items()):
        if group_id not in new_group_ids:
            await db.delete(access)

    # Upsert access for specified groups
    for ga in body.group_access:
        if ga.group_id in existing_access:
            existing_access[ga.group_id].permission = ga.permission
        else:
            access = MapGroupAccess(
                id=str(uuid.uuid4()),
                map_id=map_item.id,
                group_id=ga.group_id,
                permission=ga.permission,
            )
            db.add(access)

    await db.flush()
    await db.refresh(map_item)
    return await get_accessible_map(db, map_item.id, current_user)
