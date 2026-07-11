import json
import tomlkit
from .registry import ROOT, load_module_meta

BACKEND_PYPROJECT = ROOT / "backend" / "pyproject.toml"
WEB_PACKAGE_JSON = ROOT / "frontend" / "apps" / "web" / "package.json"


def update_backend_workspace(lock: dict) -> None:
    doc = tomlkit.parse(BACKEND_PYPROJECT.read_text())
    tool_uv = doc.setdefault("tool", {}).setdefault("uv", {})
    workspace = tool_uv.setdefault("workspace", {})
    sources = tool_uv.setdefault("sources", {})

    members = tomlkit.array()
    for mod in lock["selected"]:
        meta = load_module_meta(mod["name"])
        backend_cfg = meta.get("backend")
        if not backend_cfg:
            continue
        members.append(f"../modules/{mod['name']}/backend")
        sources[backend_cfg["package"]] = {"workspace": True}

    workspace["members"] = members
    BACKEND_PYPROJECT.write_text(tomlkit.dumps(doc))


def update_frontend_workspace(lock: dict) -> None:
    pkg = json.loads(WEB_PACKAGE_JSON.read_text())
    deps = pkg.setdefault("dependencies", {})
    for mod in lock["selected"]:
        meta = load_module_meta(mod["name"])
        fe_cfg = meta.get("frontend")
        if fe_cfg:
            deps[fe_cfg["package_name"]] = "workspace:*"
    WEB_PACKAGE_JSON.write_text(json.dumps(pkg, indent=2) + "\n")