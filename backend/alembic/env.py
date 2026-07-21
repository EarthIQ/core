"""Alembic environment — async SQLAlchemy, with dynamic module model & version discovery."""
from __future__ import annotations

import asyncio
import importlib
import logging
import sys
from logging.config import fileConfig
from pathlib import Path

import yaml
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# ── Make app package importable ───────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT = BACKEND_DIR.parent                             # core/
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings
from app.core.db import Base

# ── Core models (always imported) ─────────────────────────────────────────────
from app.api.auth.models import User, Group, Permission, UserGroup, GroupPermission  # noqa: F401
from app.api.maps.models import MapModel, MapGroupAccess  # noqa: F401

# ── Dynamically discover installed modules ────────────────────────────────────
_lock_file = ROOT / "modules.lock.yaml"
_module_version_dirs: list[str] = []

if _lock_file.exists():
    _lock = yaml.safe_load(_lock_file.read_text()) or {}
    for _mod in _lock.get("selected", []):
        _mod_path = ROOT / _mod["path"]
        _meta_path = _mod_path / "module.yaml"
        if not _meta_path.exists():
            continue
        _meta = yaml.safe_load(_meta_path.read_text())
        _backend = _meta.get("backend")
        if not _backend:
            continue

        # Inject module backend dir so imports resolve
        _backend_dir = str(_mod_path / "backend")
        if _backend_dir not in sys.path:
            sys.path.insert(0, _backend_dir)

        # Import ORM models so autogenerate detects module tables
        _models_attr = _backend.get("models_attr")
        if _models_attr:
            _models_module = f'{_backend["package"]}.{_models_attr}'
            try:
                importlib.import_module(_models_module)
                logging.getLogger("alembic.env").info(
                    "Imported models from %s", _models_module
                )
            except Exception as exc:
                logging.getLogger("alembic.env").warning(
                    "Could not import module models '%s': %s", _models_module, exc
                )

        # Collect module's alembic/versions/ directory for multi-directory migration
        _versions_dir = _mod_path / "backend" / "alembic" / "versions"
        if _versions_dir.is_dir():
            _module_version_dirs.append(str(_versions_dir))

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add module version directories so Alembic can find module migrations.
# This enables `alembic upgrade head` from core to include module migrations.
if _module_version_dirs:
    core_versions = str(BACKEND_DIR / "alembic" / "versions")
    all_version_locations = ";".join([core_versions] + _module_version_dirs)
    config.set_main_option("version_locations", all_version_locations)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().database_url


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(get_url())
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
