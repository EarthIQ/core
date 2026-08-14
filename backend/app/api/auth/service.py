from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth.models import Group, GroupPermission, Permission, User, UserGroup
from app.api.auth.schemas import GroupCreate, GroupUpdate, PermissionCreate, PermissionUpdate, UserCreate, UserUpdate
from app.core.security import hash_password, verify_password


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.groups))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.groups))
        .order_by(User.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def create_user(
    db: AsyncSession,
    data: UserCreate,
    assigned_group_ids: Optional[list[str]] = None,
) -> User:
    user = User(
        email=str(data.email),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        is_superuser=data.is_superuser,
    )
    db.add(user)
    await db.flush()

    if assigned_group_ids:
        group_ids = list(dict.fromkeys(assigned_group_ids))
        groups_result = await db.execute(select(Group).where(Group.id.in_(group_ids)))
        groups = groups_result.scalars().all()
        if len(groups) != len(group_ids):
            raise ValueError("One or more groups were not found")
        for group in groups:
            db.add(UserGroup(user_id=user.id, group_id=group.id))

    await db.flush()
    return await get_user_by_id(db, user.id)


async def update_user(
    db: AsyncSession,
    user: User,
    data: UserUpdate,
    assigned_group_ids: Optional[list[str]] = None,
) -> User:
    if data.email is not None:
        user.email = str(data.email)
    if data.password is not None:
        user.hashed_password = hash_password(data.password)
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_superuser is not None:
        user.is_superuser = data.is_superuser

    if assigned_group_ids is not None:
        existing_group_ids = {group.id for group in user.groups}
        desired_group_ids = list(dict.fromkeys(assigned_group_ids))
        groups_result = await db.execute(select(Group).where(Group.id.in_(desired_group_ids)))
        groups = groups_result.scalars().all()
        if len(groups) != len(desired_group_ids):
            raise ValueError("One or more groups were not found")
        for group in groups:
            if group.id not in existing_group_ids:
                db.add(UserGroup(user_id=user.id, group_id=group.id))
        for group_id in existing_group_ids:
            if group_id not in desired_group_ids:
                result = await db.execute(
                    select(UserGroup).where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
                )
                for link in result.scalars().all():
                    await db.delete(link)

    await db.flush()
    return await get_user_by_id(db, user.id)


async def delete_user(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.flush()


async def list_permissions(db: AsyncSession) -> list[Permission]:
    result = await db.execute(select(Permission).order_by(Permission.name))
    return list(result.scalars().all())


async def create_permission(db: AsyncSession, data: PermissionCreate) -> Permission:
    permission = Permission(name=data.name, description=data.description)
    db.add(permission)
    await db.flush()
    await db.refresh(permission)
    return permission


async def update_permission(
    db: AsyncSession,
    permission: Permission,
    data: PermissionUpdate,
) -> Permission:
    if data.name is not None:
        permission.name = data.name
    if data.description is not None:
        permission.description = data.description
    await db.flush()
    return permission


async def delete_permission(db: AsyncSession, permission: Permission) -> None:
    await db.delete(permission)
    await db.flush()


async def list_groups(db: AsyncSession) -> list[Group]:
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.permissions), selectinload(Group.users))
        .order_by(Group.name)
    )
    return list(result.scalars().unique().all())


async def create_group(
    db: AsyncSession,
    data: GroupCreate,
    assigned_permission_ids: Optional[list[str]] = None,
    assigned_user_ids: Optional[list[str]] = None,
) -> Group:
    group = Group(name=data.name, description=data.description)
    db.add(group)
    await db.flush()

    if assigned_permission_ids:
        permission_ids = list(dict.fromkeys(assigned_permission_ids))
        permissions_result = await db.execute(
            select(Permission).where(Permission.id.in_(permission_ids))
        )
        permissions = permissions_result.scalars().all()
        if len(permissions) != len(permission_ids):
            raise ValueError("One or more permissions were not found")
        for permission in permissions:
            db.add(GroupPermission(group_id=group.id, permission_id=permission.id))

    if assigned_user_ids:
        user_ids = list(dict.fromkeys(assigned_user_ids))
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = users_result.scalars().all()
        if len(users) != len(user_ids):
            raise ValueError("One or more users were not found")
        for user in users:
            db.add(UserGroup(user_id=user.id, group_id=group.id))

    await db.flush()
    return await get_group_by_id(db, group.id)


async def update_group(
    db: AsyncSession,
    group: Group,
    data: GroupUpdate,
    assigned_permission_ids: Optional[list[str]] = None,
    assigned_user_ids: Optional[list[str]] = None,
) -> Group:
    if data.name is not None:
        group.name = data.name
    if data.description is not None:
        group.description = data.description

    if assigned_permission_ids is not None:
        desired_permission_ids = list(dict.fromkeys(assigned_permission_ids))
        permissions_result = await db.execute(
            select(Permission).where(Permission.id.in_(desired_permission_ids))
        )
        permissions = permissions_result.scalars().all()
        if len(permissions) != len(desired_permission_ids):
            raise ValueError("One or more permissions were not found")
        existing_permission_ids = {permission.id for permission in group.permissions}
        for permission in permissions:
            if permission.id not in existing_permission_ids:
                db.add(GroupPermission(group_id=group.id, permission_id=permission.id))
        for permission_id in list(existing_permission_ids):
            if permission_id not in desired_permission_ids:
                result = await db.execute(
                    select(GroupPermission).where(
                        GroupPermission.group_id == group.id,
                        GroupPermission.permission_id == permission_id,
                    )
                )
                for link in result.scalars().all():
                    await db.delete(link)

    if assigned_user_ids is not None:
        desired_user_ids = list(dict.fromkeys(assigned_user_ids))
        users_result = await db.execute(select(User).where(User.id.in_(desired_user_ids)))
        users = users_result.scalars().all()
        if len(users) != len(desired_user_ids):
            raise ValueError("One or more users were not found")
        existing_user_ids = {user.id for user in group.users}
        for user in users:
            if user.id not in existing_user_ids:
                db.add(UserGroup(user_id=user.id, group_id=group.id))
        for user_id in list(existing_user_ids):
            if user_id not in desired_user_ids:
                result = await db.execute(
                    select(UserGroup).where(UserGroup.user_id == user_id, UserGroup.group_id == group.id)
                )
                for link in result.scalars().all():
                    await db.delete(link)

    await db.flush()
    return await get_group_by_id(db, group.id)


async def delete_group(db: AsyncSession, group: Group) -> None:
    await db.delete(group)
    await db.flush()


async def get_group_by_id(db: AsyncSession, group_id: str) -> Optional[Group]:
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.permissions), selectinload(Group.users))
        .where(Group.id == group_id)
    )
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def get_user_effective_permissions(db: AsyncSession, user: User) -> list[str]:
    """
    Computes effective permissions for a user.
    Superusers automatically receive full access (*).
    Regular users inherit all permissions granted to their assigned groups.
    """
    if user.is_superuser:
        return ["*"]

    user_with_groups = await get_user_by_id(db, user.id)
    if not user_with_groups or not user_with_groups.groups:
        return []

    perms: set[str] = set()
    for group in user_with_groups.groups:
        # Load group permissions
        full_group = await get_group_by_id(db, group.id)
        if full_group and full_group.permissions:
            for p in full_group.permissions:
                perms.add(p.name)

    return sorted(list(perms))


async def ensure_default_component_permissions(db: AsyncSession) -> None:
    """
    Automatically seeds view, add, edit, delete permissions for core components and installed modules.
    """
    core_components = ["projects", "maps", "users", "groups", "permissions", "data", "admin"]
    actions = ["view", "add", "edit", "delete"]

    # Discover components from installed modules.lock.yaml if present
    import yaml
    from pathlib import Path
    lock_file = Path("modules.lock.yaml")
    module_components: list[str] = []
    if lock_file.exists():
        try:
            lock = yaml.safe_load(lock_file.read_text()) or {}
            for item in lock.get("selected", []):
                mod_name = item.get("name", "").replace("-module", "")
                if mod_name:
                    module_components.append(mod_name)
        except Exception:
            pass

    all_components = sorted(list(set(core_components + module_components)))
    existing_perms_res = await db.execute(select(Permission.name))
    existing_perm_names = set(existing_perms_res.scalars().all())

    new_permissions = []
    for comp in all_components:
        for act in actions:
            perm_name = f"{comp}:{act}"
            if perm_name not in existing_perm_names:
                desc = f"Permission to {act} {comp}"
                new_permissions.append(Permission(name=perm_name, description=desc))

    if new_permissions:
        db.add_all(new_permissions)
        await db.flush()

