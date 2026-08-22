from pathlib import Path

import yaml
from .registry import ROOT, load_module_meta

BASE_COMPOSE = ROOT / "infra" / "docker" / "docker-compose.base.yaml"
OUT_COMPOSE = ROOT / "docker-compose.yaml"
ENV_FILE = ROOT / ".env"

# Map service -> (dev Dockerfile, prod Dockerfile)
DOCKERFILES = {
    "backend": (
        "infra/docker/backend.dev.Dockerfile",
        "infra/docker/backend.prod.Dockerfile",
    ),
    "frontend": (
        "infra/docker/frontend.dev.Dockerfile",
        "infra/docker/frontend.prod.Dockerfile",
    ),
}

# Dev-only volumes to strip in prod mode
DEV_VOLUMES = {
    "frontend": [
        "./frontend:/app/frontend",
        "/app/frontend/node_modules",
        "/app/frontend/apps/web/node_modules",
        "./modules:/app/modules",
    ],
    "backend": [
        "./backend:/app/backend",
        "./modules:/app/modules",
        # The lock file is baked into the prod image via COPY; only mounted in dev.
        "./modules.lock.yaml:/app/modules.lock.yaml",
    ],
}

# Ports to use in prod mode
PROD_PORTS = {
    "frontend": ["80:80"],
}


def get_mode() -> str:
    """Read APP_ENV from .env to determine dev/prod mode."""
    if not ENV_FILE.exists():
        return "dev"
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line.startswith("APP_ENV="):
            return line.split("=", 1)[1].strip().strip('"').strip("'").lower()
    return "dev"


def _rewrite_volume_paths(volumes: list, base_dir: Path) -> list:
    """Rewrite relative host paths in volume mounts to be relative to ROOT."""
    rewritten = []
    for vol in volumes:
        if isinstance(vol, str) and (vol.startswith("./") or vol.startswith("../")):
            host, _, container = vol.partition(":")
            rel = (base_dir / host).resolve().relative_to(ROOT)
            # Keep the "./" prefix so Compose treats this as a bind mount,
            # not a named volume (a bare name like "backend" is parsed as a
            # named volume and must be declared in the top-level volumes map).
            rewritten.append(f"./{rel}:{container}")
        else:
            rewritten.append(vol)
    return rewritten


def generate_compose(lock: dict) -> None:
    mode = get_mode()
    base = yaml.safe_load(BASE_COMPOSE.read_text())
    base.setdefault("services", {})
    base.setdefault("volumes", {})

    # The base compose file lives in infra/docker/, so relative env_file paths
    # need to be rewritten when generating the root-level docker-compose.yaml.
    base_dir = BASE_COMPOSE.parent
    for svc in base.get("services", {}).values():
        env_files = svc.get("env_file")
        if isinstance(env_files, list):
            svc["env_file"] = [
                str((base_dir / f).resolve().relative_to(ROOT)) for f in env_files
            ]
        elif isinstance(env_files, str):
            svc["env_file"] = str((base_dir / env_files).resolve().relative_to(ROOT))

        # Relative host paths in volume mounts also need rewriting (e.g.
        # ../../backend in infra/docker/ -> ./backend at the repo root).
        volumes = svc.get("volumes")
        if isinstance(volumes, list):
            svc["volumes"] = _rewrite_volume_paths(volumes, base_dir)

    # Select the correct Dockerfile and adjust config based on mode (dev/prod)
    for svc_name, svc_def in base.get("services", {}).items():
        if svc_name in DOCKERFILES and "build" in svc_def:
            dev_df, prod_df = DOCKERFILES[svc_name]
            svc_def["build"]["dockerfile"] = prod_df if mode == "prod" else dev_df

        if mode == "prod":
            # Remove dev-only volumes
            if svc_name in DEV_VOLUMES and "volumes" in svc_def:
                remaining = [
                    v for v in svc_def["volumes"] if v not in DEV_VOLUMES[svc_name]
                ]
                if remaining:
                    svc_def["volumes"] = remaining
                else:
                    del svc_def["volumes"]
            # Apply prod ports
            if svc_name in PROD_PORTS:
                svc_def["ports"] = PROD_PORTS[svc_name]

    for mod in lock["selected"]:
        meta = load_module_meta(mod["name"])
        infra_cfg = meta.get("infra")
        if not infra_cfg:
            continue

        compose_file = infra_cfg.get("compose_file")
        if compose_file:
            frag_path = ROOT / "modules" / mod["name"] / compose_file
            if frag_path.exists():
                frag = yaml.safe_load(frag_path.read_text()) or {}
                for svc_name, svc_def in frag.get("services", {}).items():
                    base["services"][f"{mod['name']}_{svc_name}"] = svc_def
                base["volumes"].update(frag.get("volumes", {}))

    OUT_COMPOSE.write_text(yaml.dump(base, sort_keys=False, default_flow_style=False))