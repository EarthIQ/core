import json
import tomlkit
from .registry import ROOT, load_module_meta

BACKEND_PYPROJECT = ROOT / "backend" / "pyproject.toml"
WEB_PACKAGE_JSON = ROOT / "frontend" / "apps" / "web" / "package.json"


ALEMBIC_INI = ROOT / "backend" / "alembic.ini"           # gitignored — generated
ALEMBIC_INI_TPL = ROOT / "backend" / "alembic.ini.tpl"  # committed template


def update_backend_workspace(lock: dict) -> None:
    """
    Generate backend/alembic.versions.ini — a generated ini file that sets
    version_locations to include every installed module's alembic/versions/ directory.

    Alembic merges this via the --config flag or by configuring it in env.py.
    We also write the path directly into alembic.ini's [alembic] section so
    `alembic history` / `alembic upgrade head` from core/backend/ picks up all
    module migrations without any extra flags.

    backend/pyproject.toml is intentionally left untouched.
    """
    core_versions = "alembic/versions"  # relative to backend/
    module_version_paths: list[str] = []

    for mod in lock.get("selected", []):
        meta = load_module_meta(mod["name"])
        backend_cfg = meta.get("backend")
        if not backend_cfg:
            continue
        # Absolute path to module's alembic/versions/
        versions_dir = ROOT / mod["path"] / "backend" / "alembic" / "versions"
        if versions_dir.is_dir():
            module_version_paths.append(str(versions_dir))

    all_locations = "\n\t".join([core_versions] + module_version_paths)

    # alembic accepts space-separated paths in version_locations.
    # Always regenerate from the clean template so there are no stale duplicates.
    import re
    all_locations = " ".join([core_versions] + module_version_paths)
    ini_text = ALEMBIC_INI_TPL.read_text()
    if re.search(r"^version_locations\s*=", ini_text, re.MULTILINE):
        ini_text = re.sub(
            r"^version_locations\s*=.*$",
            f"version_locations = {all_locations}",
            ini_text,
            flags=re.MULTILINE,
        )
    else:
        # Insert after sqlalchemy.url line
        ini_text = re.sub(
            r"(sqlalchemy\.url\s*=.*\n)",
            rf"\1version_locations = {all_locations}\n",
            ini_text,
        )
    ALEMBIC_INI.write_text(ini_text)



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
        "extends": "@packages/typescript-config/vite.json",
        "compilerOptions": {
            "baseUrl": ".",
            "paths": tsconfig_paths
        }
    }
    tsconfig_paths_file.write_text(json.dumps(tsconfig_paths_content, indent=2) + "\n")