import yaml
from .registry import ROOT, load_module_meta

BASE_COMPOSE = ROOT / "infra" / "docker" / "docker-compose.base.yaml"
OUT_COMPOSE = ROOT / "docker-compose.yaml"


def generate_compose(lock: dict) -> None:
    base = yaml.safe_load(BASE_COMPOSE.read_text())
    base.setdefault("services", {})
    base.setdefault("volumes", {})
    extra_env: list[str] = []

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

        extra_env.extend(infra_cfg.get("env", []))

    if extra_env and "backend" in base["services"]:
        base["services"]["backend"].setdefault("environment", []).extend(extra_env)

    OUT_COMPOSE.write_text(yaml.dump(base, sort_keys=False))