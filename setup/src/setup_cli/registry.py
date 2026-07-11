from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[3]           # core/
REGISTRY_FILE = ROOT / "modules.registry.yaml"
LOCK_FILE = ROOT / "modules.lock.yaml"
MODULES_DIR = ROOT / "modules"


def load_registry() -> list[dict]:
    data = yaml.safe_load(REGISTRY_FILE.read_text()) or {}
    return data.get("modules", [])


def load_lock() -> dict:
    if not LOCK_FILE.exists():
        return {"selected": []}
    return yaml.safe_load(LOCK_FILE.read_text()) or {"selected": []}


def save_lock(lock: dict) -> None:
    LOCK_FILE.write_text(yaml.dump(lock, sort_keys=False))


def load_module_meta(name: str) -> dict:
    return yaml.safe_load((MODULES_DIR / name / "module.yaml").read_text())