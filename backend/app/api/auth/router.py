from typing import Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import Group, Permission, User
from app.api.auth.schemas import (
    GroupCreate,
    GroupRead,
    GroupUpdate,
    PaginatedGroupsResponse,
    PaginatedPermissionsResponse,
    PaginatedUsersResponse,
    PermissionCreate,
    PermissionRead,
    PermissionUpdate,
    Token,
    UserAdminRead,
    UserCreate,
    UserLogin,
    UserMeRead,
    UserRead,
    UserUpdate,
)


from app.api.auth.service import (
    authenticate_user,
    create_group,
    create_permission,
    create_user,
    delete_group,
    delete_permission,
    delete_user,
    get_group_by_id,
    get_user_by_email,
    get_user_by_id,
    list_groups,
    list_permissions,
    list_users,
    update_group,
    update_permission,
    update_user,
)
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

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def _require_admin(current_user: User = Depends(_get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


@router.get("/me", response_model=UserMeRead)
async def me(current_user=Depends(_get_current_user), db: AsyncSession = Depends(get_db)):
    from app.api.auth.service import get_user_effective_permissions
    perms = await get_user_effective_permissions(db, current_user)
    user_dict = UserRead.model_validate(current_user).model_dump()
    user_dict["effective_permissions"] = perms
    return user_dict


# ── User management ─────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedUsersResponse, summary="List all users")
async def get_users(
    search: Optional[str] = Query(None, description="Search by email or full name"),
    is_superuser: Optional[bool] = Query(None, description="Filter by superuser status"),
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    sort_by: str = Query("created_at", description="Sort field (created_at, email, full_name)"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    users, total, total_pages = await list_users(
        db,
        search=search,
        is_superuser=is_superuser,
        group_id=group_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return PaginatedUsersResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )



@router.post(
    "/users",
    response_model=UserAdminRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user",
)
async def create_user_route(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    return await create_user(
        db,
        body,
        assigned_group_ids=list(body.groups) if body.groups else None,
    )


@router.put("/users/{user_id}", response_model=UserAdminRead, summary="Update a user")
async def update_user_route(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.email is not None:
        existing = await get_user_by_email(db, str(body.email))
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Email already registered")

    return await update_user(
        db,
        user,
        body,
        assigned_group_ids=body.groups,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_route(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await delete_user(db, user)
    return None


# ── Groups & Permissions ───────────────────────────────────────────────────────

@router.get(
    "/permissions",
    response_model=Union[PaginatedPermissionsResponse, list[PermissionRead]],
    summary="List all permissions",
)
async def get_permissions(
    search: Optional[str] = Query(None, description="Search by permission name or description"),
    sort_by: str = Query("name", description="Sort field"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order"),
    page: Optional[int] = Query(None, ge=1, description="Page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    perms, total, total_pages = await list_permissions(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    if page is not None and page_size is not None:
        return PaginatedPermissionsResponse(
            items=perms,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    return perms


@router.post(
    "/permissions",
    response_model=PermissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a permission",
)
async def create_permission_route(
    body: PermissionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    return await create_permission(db, body)


@router.put("/permissions/{permission_id}", response_model=PermissionRead, summary="Update a permission")
async def update_permission_route(
    permission_id: str,
    body: PermissionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    result = await db.execute(select(Permission).where(Permission.id == permission_id))
    permission = result.scalar_one_or_none()
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    return await update_permission(db, permission, body)


@router.delete("/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission_route(
    permission_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    result = await db.execute(select(Permission).where(Permission.id == permission_id))
    permission = result.scalar_one_or_none()
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    await delete_permission(db, permission)
    return None


@router.get(
    "/groups",
    response_model=Union[PaginatedGroupsResponse, list[GroupRead]],
    summary="List all groups",
)
async def list_groups_route(
    search: Optional[str] = Query(None, description="Search by group name or description"),
    sort_by: str = Query("name", description="Sort field"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order"),
    page: Optional[int] = Query(None, ge=1, description="Page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    groups, total, total_pages = await list_groups(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    if page is not None and page_size is not None:
        return PaginatedGroupsResponse(
            items=groups,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    return groups



@router.post(
    "/groups",
    response_model=GroupRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new group",
)
async def create_group_route(
    body: GroupCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    existing = await db.execute(select(Group).where(Group.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Group '{body.name}' already exists")

    return await create_group(
        db,
        body,
        assigned_permission_ids=list(body.permissions) if body.permissions else None,
        assigned_user_ids=list(body.user_ids) if body.user_ids else None,
    )


@router.put("/groups/{group_id}", response_model=GroupRead, summary="Update a group")
async def update_group_route(
    group_id: str,
    body: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    group = await get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return await update_group(
        db,
        group,
        body,
        assigned_permission_ids=body.permissions,
        assigned_user_ids=body.user_ids,
    )


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_route(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    group = await get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    await delete_group(db, group)
    return None


# Export the dependency for use in other routers
get_current_user = _get_current_user
