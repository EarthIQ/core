import importlib
import logging
import sys
from pathlib import Path
import yaml
from fastapi import FastAPI

logger = logging.getLogger("module_loader")

ROOT = Path(__file__).resolve().parents[2]        # core/
LOCK_FILE = ROOT / "modules.lock.yaml"


def load_modules(app: FastAPI) -> None:
    if not LOCK_FILE.exists():
        logger.info("No modules.lock.yaml — running core with zero modules.")
        return

    lock = yaml.safe_load(LOCK_FILE.read_text()) or {}
    for mod in lock.get("selected", []):
        mod_path = ROOT / mod["path"]
        meta_path = mod_path / "module.yaml"
        if not meta_path.exists():
            logger.warning("module.yaml missing for %s, skipping", mod["name"])
            continue

        meta = yaml.safe_load(meta_path.read_text())
        backend_cfg = meta.get("backend")
        if not backend_cfg:
            continue

        # ── 1. Inject module's backend directory into sys.path ─────────────────
        backend_dir = mod_path / "backend"
        if backend_dir.exists():
            backend_dir_str = str(backend_dir)
            if backend_dir_str not in sys.path:
                sys.path.insert(0, backend_dir_str)

        pkg_name = backend_cfg["package"]

        # ── 2. Import ORM models (if declared) so Base.metadata is populated ──
        models_attr = backend_cfg.get("models_attr")
        if models_attr:
            models_module = f"{pkg_name}.{models_attr}"
            try:
                importlib.import_module(models_module)
                logger.info("Loaded models for module '%s' from %s", mod["name"], models_module)
            except Exception as exc:
                logger.error(
                    "Failed to load models for module '%s': %s",
                    mod["name"], exc, exc_info=True,
                )

        # ── 3. Import and mount the API router ────────────────────────────────
        module_path, attr = backend_cfg["router_attr"].split(":")
        full_module = f"{pkg_name}.{module_path}"
        try:
            pkg = importlib.import_module(full_module)
            router = getattr(pkg, attr)
        except Exception as exc:
            logger.error("Failed to load module '%s': %s", mod["name"], exc, exc_info=True)
            continue

        prefix = "/api" + backend_cfg.get("prefix", f"/{mod['name']}")
        app.include_router(router, prefix=prefix, tags=[mod["name"]])
        logger.info("Loaded module '%s' at %s", mod["name"], prefix)