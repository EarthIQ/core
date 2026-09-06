"""
app/api/data/folders.py
~~~~~~~~~~~~~~~~~~~~~~~
Catalog folder tree service: create / rename / move / delete folders and move
datasets between folders. Folders nest via ``parent_id``; deleting a folder
re-parents its contained datasets to the folder's parent (root when it was a
root folder) and requires that the folder has no child folders.
"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.data.models import DataFolder, GeoDataset


class FolderError(Exception):
    """Domain error for folder operations (message is user-safe)."""


async def get_folder(db: AsyncSession, folder_id: str) -> DataFolder | None:
    result = await db.execute(select(DataFolder).where(DataFolder.id == folder_id))
    return result.scalar_one_or_none()


async def list_folders(db: AsyncSession) -> list[DataFolder]:
    """All folders, ordered for stable tree building (parents before children)."""
    result = await db.execute(select(DataFolder).order_by(DataFolder.name.asc()))
    return list(result.scalars().all())


async def _sibling_exists(db: AsyncSession, name: str, parent_id: str | None) -> bool:
    q = select(func.count(DataFolder.id)).where(DataFolder.name == name)
    if parent_id is None:
        q = q.where(DataFolder.parent_id.is_(None))
    else:
        q = q.where(DataFolder.parent_id == parent_id)
    result = await db.execute(q)
    return bool(result.scalar_one())


async def create_folder(
    db: AsyncSession, *, name: str, parent_id: str | None
) -> DataFolder:
    """Create a folder. Raises :class:`FolderError` on validation problems."""
    name = (name or "").strip()
    if not name:
        raise FolderError("Folder name must not be empty.")
    if parent_id:
        if not await get_folder(db, parent_id):
            raise FolderError("Parent folder not found.")
    if await _sibling_exists(db, name, parent_id):
        raise FolderError(f"A folder named '{name}' already exists at this level.")
    folder = DataFolder(name=name, parent_id=parent_id)
    db.add(folder)
    await db.flush()
    await db.refresh(folder)
    return folder


async def rename_folder(
    db: AsyncSession, folder_id: str, name: str
) -> DataFolder | None:
    """Rename a folder (duplicate names within a parent level are rejected)."""
    name = (name or "").strip()
    if not name:
        raise FolderError("Folder name must not be empty.")
    folder = await get_folder(db, folder_id)
    if not folder:
        return None
    if await _sibling_exists(db, name, folder.parent_id):
        raise FolderError(f"A folder named '{name}' already exists at this level.")
    folder.name = name
    await db.flush()
    await db.refresh(folder)
    return folder


async def move_folder(
    db: AsyncSession, folder_id: str, parent_id: str | None
) -> DataFolder | None:
    """Re-parent a folder. Guards against moving a folder into itself/its subtree."""
    folder = await get_folder(db, folder_id)
    if not folder:
        return None
    if parent_id:
        if parent_id == folder_id:
            raise FolderError("A folder cannot be moved into itself.")
        # Walk up from the prospective parent; if we reach the folder we would
        # create a cycle (moving into its own subtree).
        cursor: str | None = parent_id
        depth = 0
        while cursor:
            if cursor == folder_id:
                raise FolderError(
                    "A folder cannot be moved into one of its subfolders."
                )
            ancestor = await get_folder(db, cursor)
            cursor = ancestor.parent_id if ancestor else None
            depth += 1
            if depth > 500:  # defensive cycle bound
                raise FolderError("Folder tree is too deep to move.")
        if not await get_folder(db, parent_id):
            raise FolderError("Target parent folder not found.")
    if await _sibling_exists(db, folder.name, parent_id):
        raise FolderError(
            f"A folder named '{folder.name}' already exists at that level."
        )
    folder.parent_id = parent_id
    await db.flush()
    await db.refresh(folder)
    return folder


async def delete_folder(db: AsyncSession, folder_id: str) -> int:
    """Delete a folder.

    Contained datasets are moved to the folder's parent (or root). Child
    folders block the delete (they must be moved or deleted first). Returns
    the number of datasets re-parented.
    """
    folder = await get_folder(db, folder_id)
    if not folder:
        raise FolderError("Folder not found.")

    child_q = await db.execute(
        select(func.count(DataFolder.id)).where(DataFolder.parent_id == folder_id)
    )
    child_count = child_q.scalar_one()
    if child_count:
        raise FolderError(
            f"Folder '{folder.name}' still contains {child_count} subfolder(s). "
            "Move or delete them first."
        )

    target = folder.parent_id  # may be None (root)
    result = await db.execute(
        select(GeoDataset).where(GeoDataset.folder_id == folder_id)
    )
    moved = 0
    for ds in result.scalars().all():
        ds.folder_id = target
        moved += 1

    await db.delete(folder)
    await db.flush()
    return moved


async def move_dataset(
    db: AsyncSession, dataset_id: str, folder_id: str | None
) -> GeoDataset | None:
    """Move a dataset into a folder (or back to root when ``folder_id`` is None)."""
    result = await db.execute(select(GeoDataset).where(GeoDataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        return None
    if folder_id:
        if not await get_folder(db, folder_id):
            raise FolderError("Target folder not found.")
    dataset.folder_id = folder_id
    await db.flush()
    await db.refresh(dataset)
    return dataset


async def folder_counts(db: AsyncSession) -> dict[str, tuple[int, int]]:
    """Map folder_id -> (dataset_count, child_folder_count)."""
    ds_rows = await db.execute(
        select(GeoDataset.folder_id, func.count(GeoDataset.id))
        .where(GeoDataset.folder_id.is_not(None))
        .group_by(GeoDataset.folder_id)
    )
    folder_rows = await db.execute(
        select(DataFolder.parent_id, func.count(DataFolder.id))
        .where(DataFolder.parent_id.is_not(None))
        .group_by(DataFolder.parent_id)
    )
    counts: dict[str, tuple[int, int]] = {}
    for folder_id, n in ds_rows.all():
        counts[folder_id] = (n, counts.get(folder_id, (0, 0))[1])
    for parent_id, n in folder_rows.all():
        counts[parent_id] = (counts.get(parent_id, (0, 0))[0], n)
    return counts


__all__ = [
    "FolderError",
    "get_folder",
    "list_folders",
    "create_folder",
    "rename_folder",
    "move_folder",
    "delete_folder",
    "move_dataset",
    "folder_counts",
]