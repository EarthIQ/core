from __future__ import annotations

import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User
from app.api.projects.models import ProjectModel, ProjectGroupAccess
from app.api.projects.schemas import ProjectCreate, ProjectUpdate, ProjectRead, ProjectOwnerRead
from app.api.maps.schemas import GroupAccessSchema, PermissionLevel, MapRead
from app.api.maps.service import compute_user_permission as compute_map_permission

def compute_user_permission(project_item: ProjectModel, user: Optional[User]) -> Optional[PermissionLevel]:
    """
    Computes effective permission level for a given user on a project item.
    Returns "admin" | "write" | "read" | None.
    """
    if not user:
        return None

    if user.is_superuser or project_item.owner_id == user.id:
        return "admin"

    user_group_ids = {g.id for g in user.groups} if hasattr(user, "groups") and user.groups else set()
    highest_perm: Optional[PermissionLevel] = None

    for access in project_item.group_access:
        if access.group_id in user_group_ids:
            perm = access.permission
            if perm == "admin":
                return "admin"
            if perm == "write":
                highest_perm = "write"
            elif perm == "read" and highest_perm is None:
                highest_perm = "read"

    # Direct per-user access entries (Share Dialog roles)
    if hasattr(project_item, "user_access") and project_item.user_access:
        for u_acc in project_item.user_access:
            if u_acc.user_id == user.id and not u_acc.pending:
                if u_acc.role == "owner":
                    return "admin"
                if u_acc.role == "editor":
                    highest_perm = "write"
                elif u_acc.role in ("commenter", "viewer") and highest_perm is None:
                    highest_perm = "read"

    return highest_perm


async def list_accessible_projects(db: AsyncSession, current_user: Optional[User]) -> List[ProjectRead]:
    """Retrieve all projects accessible to the current user."""
    q = select(ProjectModel)

    result = await db.execute(q.order_by(ProjectModel.updated_at.desc()))
    all_projects = result.scalars().all()

    accessible: List[ProjectRead] = []
    for project_item in all_projects:
        perm = compute_user_permission(project_item, current_user)
        if perm is not None:
            # Format project maps
            maps_read: List[MapRead] = []
            for map_item in project_item.maps:
                map_perm = compute_map_permission(map_item, current_user) or "read"
                maps_read.append(MapRead(
                    id=map_item.id,
                    title=map_item.title,
                    description=map_item.description,
                    center_lng=map_item.center_lng,
                    center_lat=map_item.center_lat,
                    zoom=map_item.zoom,
                    basemap=map_item.basemap,
                    layers_config=map_item.layers_config or [],
                    is_public=map_item.is_public,
                    project_id=map_item.project_id,
                    widgets_config=map_item.widgets_config or {},
                    owner_id=map_item.owner_id,
                    group_access=[
                        GroupAccessSchema(
                            group_id=ga.group_id,
                            group_name=ga.group.name if ga.group else None,
                            permission=ga.permission,
                        )
                        for ga in map_item.group_access
                    ],
                    user_permission=map_perm,
                    created_at=map_item.created_at,
                    updated_at=map_item.updated_at,
                ))

            project_dict = {
                "id": project_item.id,
                "title": project_item.title,
                "description": project_item.description,
                "center_lng": project_item.center_lng,
                "center_lat": project_item.center_lat,
                "zoom": project_item.zoom,
                "basemap": project_item.basemap,
                "layers_config": project_item.layers_config or [],
                "annotations": project_item.annotations or [],
                "bookmarks": project_item.bookmarks or [],
                "comments": project_item.comments or [],
                "owner_id": project_item.owner_id,
                "owner": project_item.owner,
                "group_access": [
                    GroupAccessSchema(
                        group_id=ga.group_id,
                        group_name=ga.group.name if ga.group else None,
                        permission=ga.permission,
                    )
                    for ga in project_item.group_access
                ],
                "user_permission": perm,
                "created_at": project_item.created_at,
                "updated_at": project_item.updated_at,
                "maps": maps_read,
            }
            accessible.append(ProjectRead(**project_dict))

    return accessible


async def get_project_by_id(db: AsyncSession, project_id: str) -> Optional[ProjectModel]:
    result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    return result.scalar_one_or_none()


async def get_accessible_project(
    db: AsyncSession, project_id: str, current_user: Optional[User], required_perm: PermissionLevel = "read"
) -> ProjectRead:
    project_item = await get_project_by_id(db, project_id)
    if not project_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project '{project_id}' not found")

    perm = compute_user_permission(project_item, current_user)
    if perm is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this project"
        )

    # Permission check hierarchy: admin > write > read
    perm_rank = {"read": 1, "write": 2, "admin": 3}
    if perm_rank[perm] < perm_rank[required_perm]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You need '{required_perm}' permission to perform this action",
        )

    maps_read: List[MapRead] = []
    for map_item in project_item.maps:
        map_perm = compute_map_permission(map_item, current_user) or "read"
        maps_read.append(MapRead(
            id=map_item.id,
            title=map_item.title,
            description=map_item.description,
            center_lng=map_item.center_lng,
            center_lat=map_item.center_lat,
            zoom=map_item.zoom,
            basemap=map_item.basemap,
            layers_config=map_item.layers_config or [],
            is_public=map_item.is_public,
            project_id=map_item.project_id,
            widgets_config=map_item.widgets_config or {},
            owner_id=map_item.owner_id,
            group_access=[
                GroupAccessSchema(
                    group_id=ga.group_id,
                    group_name=ga.group.name if ga.group else None,
                    permission=ga.permission,
                )
                for ga in map_item.group_access
            ],
            user_permission=map_perm,
            created_at=map_item.created_at,
            updated_at=map_item.updated_at,
        ))

    return ProjectRead(
        id=project_item.id,
        title=project_item.title,
        description=project_item.description,
        center_lng=project_item.center_lng,
        center_lat=project_item.center_lat,
        zoom=project_item.zoom,
        basemap=project_item.basemap,
        layers_config=project_item.layers_config or [],
        annotations=project_item.annotations or [],
        bookmarks=project_item.bookmarks or [],
        comments=project_item.comments or [],
        owner_id=project_item.owner_id,
        owner=ProjectOwnerRead.model_validate(project_item.owner) if project_item.owner else None,
        group_access=[
            GroupAccessSchema(
                group_id=ga.group_id,
                group_name=ga.group.name if ga.group else None,
                permission=ga.permission,
            )
            for ga in project_item.group_access
        ],
        user_permission=perm,
        created_at=project_item.created_at,
        updated_at=project_item.updated_at,
        maps=maps_read,
    )


async def create_project(db: AsyncSession, owner: User, body: ProjectCreate) -> ProjectRead:
    project_item = ProjectModel(
        id=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
        center_lng=body.center_lng,
        center_lat=body.center_lat,
        zoom=body.zoom,
        basemap=body.basemap,
        layers_config=[l.model_dump() for l in body.layers_config],
        annotations=body.annotations or [],
        bookmarks=body.bookmarks or [],
        comments=body.comments or [],
        owner_id=owner.id,
    )
    db.add(project_item)
    await db.flush()

    for ga in body.group_access:
        access = ProjectGroupAccess(
            id=str(uuid.uuid4()),
            project_id=project_item.id,
            group_id=ga.group_id,
            permission=ga.permission,
        )
        db.add(access)

    await db.flush()
    await db.refresh(project_item)
    return await get_accessible_project(db, project_item.id, owner, required_perm="admin")


async def update_project(db: AsyncSession, project_id: str, current_user: User, body: ProjectUpdate) -> ProjectRead:
    await get_accessible_project(db, project_id, current_user, required_perm="write")
    project_item = await get_project_by_id(db, project_id)
    if not project_item:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.title is not None:
        project_item.title = body.title
    if body.description is not None:
        project_item.description = body.description
    if body.center_lng is not None:
        project_item.center_lng = body.center_lng
    if body.center_lat is not None:
        project_item.center_lat = body.center_lat
    if body.zoom is not None:
        project_item.zoom = body.zoom
    if body.basemap is not None:
        project_item.basemap = body.basemap
    if body.layers_config is not None:
        project_item.layers_config = [l.model_dump() for l in body.layers_config]
    if body.annotations is not None:
        project_item.annotations = body.annotations
    if body.bookmarks is not None:
        project_item.bookmarks = body.bookmarks
    if body.comments is not None:
        project_item.comments = body.comments

    await db.flush()
    await db.refresh(project_item)
    return await get_accessible_project(db, project_item.id, current_user)


async def delete_project(db: AsyncSession, project_id: str, current_user: User) -> None:
    await get_accessible_project(db, project_id, current_user, required_perm="admin")
    project_item = await get_project_by_id(db, project_id)
    if project_item:
        await db.delete(project_item)
        await db.flush()
