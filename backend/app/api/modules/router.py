from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

import yaml
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("modules.registry")

router = APIRouter(tags=["modules"])

ROOT = Path(__file__).resolve().parents[4]   # core/
LOCK_FILE = ROOT / "modules.lock.yaml"
REGISTRY_FILE = ROOT / "modules.registry.yaml"


# ── Schema ─────────────────────────────────────────────────────────────────────

class ModuleCapabilities(BaseModel):
    has_backend: bool = False
    has_frontend: bool = False
    has_infra: bool = False
    extras: List[str] = []


class ModuleInfo(BaseModel):
    name: str
    version: str
    enabled: bool
    description: Optional[str] = None
    capabilities: ModuleCapabilities = ModuleCapabilities()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _read_lock() -> List[dict]:
    if not LOCK_FILE.exists():
        return []
    data = yaml.safe_load(LOCK_FILE.read_text()) or {}
    return data.get("selected", [])


def _read_registry() -> dict[str, dict]:
    """Returns dict keyed by module name from registry file."""
    if not REGISTRY_FILE.exists():
        return {}
    data = yaml.safe_load(REGISTRY_FILE.read_text()) or {}
    return {m["name"]: m for m in data.get("modules", [])}


def _build_module_info(mod: dict) -> ModuleInfo:
    mod_path = ROOT / mod.get("path", f"modules/{mod['name']}")
    meta_path = mod_path / "module.yaml"

    version = mod.get("ref", "unknown")
    description: Optional[str] = None
    caps = ModuleCapabilities()

    if meta_path.exists():
        try:
            meta = yaml.safe_load(meta_path.read_text()) or {}
            version = meta.get("version", version)
            description = meta.get("description")
            caps.has_backend = bool(meta.get("backend"))
            caps.has_frontend = bool(meta.get("frontend"))
            caps.has_infra = bool(meta.get("infra"))
            caps.extras = meta.get("capabilities", [])
        except Exception as exc:
            logger.warning("Could not parse module.yaml for %s: %s", mod["name"], exc)

    return ModuleInfo(
        name=mod["name"],
        version=version,
        enabled=True,
        description=description,
        capabilities=caps,
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ModuleInfo])
def list_modules():
    """
    Return all **installed** modules with availability status.

    This is the canonical endpoint the frontend gates use to decide whether
    to render module UI. A module is ``enabled=true`` if it appears in
    ``modules.lock.yaml``.
    """
    lock = _read_lock()
    return [_build_module_info(m) for m in lock]


@router.get("/registry", response_model=List[dict])
def list_registry():
    """Return all modules *known* to this platform (from modules.registry.yaml)."""
    registry = _read_registry()
    return list(registry.values())


@router.get("/{module_name}", response_model=ModuleInfo)
def get_module(module_name: str):
    """Return info for a single installed module, or 404 if not installed."""
    from fastapi import HTTPException
    lock = _read_lock()
    mod = next((m for m in lock if m["name"] == module_name), None)
    if mod is None:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' is not installed")
    return _build_module_info(mod)
