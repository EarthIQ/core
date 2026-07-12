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
    # 1. Clean package.json dependencies to remove @modules/*
    pkg = json.loads(WEB_PACKAGE_JSON.read_text())
    deps = pkg.get("dependencies", {})
    cleaned_deps = {k: v for k, v in deps.items() if not k.startswith("@modules/")}
    pkg["dependencies"] = cleaned_deps
    WEB_PACKAGE_JSON.write_text(json.dumps(pkg, indent=2) + "\n")

    # 2. Build dynamic paths mapping
    modules_paths = {}
    tsconfig_paths = {
        "@/*": ["./src/*"]
    }

    for mod in lock.get("selected", []):
        meta = load_module_meta(mod["name"])
        fe_cfg = meta.get("frontend")
        if not fe_cfg:
            continue
        
        pkg_name = fe_cfg["package_name"]
        entry = fe_cfg.get("entry", "src/index.ts")
        
        # Path relative to frontend/apps/web/ (three levels down from repository root)
        rel_entry = f"../../../modules/{mod['name']}/frontend/{entry}"
        
        # Determine the parent directory for wildcard paths
        rel_dir = rel_entry.rsplit("/", 1)[0] if "/" in rel_entry else rel_entry
        
        modules_paths[pkg_name] = rel_entry
        tsconfig_paths[pkg_name] = [rel_entry]
        tsconfig_paths[f"{pkg_name}/*"] = [f"{rel_dir}/*"]

    # 3. Save modules.paths.json for Vite config consumption
    paths_json_file = WEB_PACKAGE_JSON.parent / "modules.paths.json"
    paths_json_file.write_text(json.dumps(modules_paths, indent=2) + "\n")

    # 4. Save tsconfig.paths.json for TypeScript compiler consumption
    tsconfig_paths_file = WEB_PACKAGE_JSON.parent / "tsconfig.paths.json"
    tsconfig_paths_content = {
        "extends": "@repo/typescript-config/vite.json",
        "compilerOptions": {
            "baseUrl": ".",
            "paths": tsconfig_paths
        }
    }
    tsconfig_paths_file.write_text(json.dumps(tsconfig_paths_content, indent=2) + "\n")