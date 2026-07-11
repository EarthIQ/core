import importlib
import logging
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

        module_path, attr = backend_cfg["router_attr"].split(":")
        full_module = f'{backend_cfg["package"]}.{module_path}'
        try:
            pkg = importlib.import_module(full_module)
            router = getattr(pkg, attr)
        except Exception as exc:
            logger.error("Failed to load module '%s': %s", mod["name"], exc)
            continue

        prefix = "/api" + backend_cfg.get("prefix", f"/{mod['name']}")
        app.include_router(router, prefix=prefix, tags=[mod["name"]])
        logger.info("Loaded module '%s' at %s", mod["name"], prefix)