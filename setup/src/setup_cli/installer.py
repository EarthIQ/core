import shutil
import subprocess
from pathlib import Path
from rich.console import Console
from .registry import MODULES_DIR, load_module_meta, save_lock

console = Console()


def clone_module(name: str, repo: str, ref: str | None = None) -> Path:
    dest = MODULES_DIR / name
    MODULES_DIR.mkdir(exist_ok=True)

    if dest.exists():
        console.print(f"[yellow]'{name}' already cloned — pulling latest...[/]")
        subprocess.run(["git", "-C", str(dest), "pull"], check=True)
    else:
        console.print(f"[cyan]Cloning '{name}' from {repo}...[/]")
        src = repo.replace("file://", "") if repo.startswith("file://") else repo
        subprocess.run(["git", "clone", src, str(dest)], check=True)

    if ref:
        subprocess.run(["git", "-C", str(dest), "checkout", ref], check=True)
    return dest


def resolve_dependencies(selected: set[str]) -> list[str]:
    resolved: list[str] = []
    visiting: set[str] = set()

    def visit(name: str):
        if name in resolved:
            return
        if name in visiting:
            raise RuntimeError(f"Circular dependency at '{name}'")
        visiting.add(name)
        meta = load_module_meta(name)
        for dep in meta.get("depends_on", []):
            if dep not in selected:
                raise RuntimeError(f"'{name}' requires '{dep}', which is not selected")
            visit(dep)
        visiting.discard(name)
        resolved.append(name)

    for n in selected:
        visit(n)
    return resolved


def install_selected(names: list[str], registry: list[dict]) -> dict:
    reg_by_name = {m["name"]: m for m in registry}
    for name in names:
        clone_module(name, reg_by_name[name]["repo"])

    ordered = resolve_dependencies(set(names))
    selected = []
    for name in ordered:
        meta = load_module_meta(name)
        selected.append({"name": name, "ref": meta.get("version", "main"), "path": f"modules/{name}"})

    lock = {"selected": selected}
    save_lock(lock)
    return lock


def remove_module(name: str) -> dict:
    from .registry import load_lock
    lock = load_lock()
    lock["selected"] = [m for m in lock["selected"] if m["name"] != name]
    save_lock(lock)
    dest = MODULES_DIR / name
    if dest.exists():
        try:
            shutil.rmtree(dest)
        except Exception:
            # Files created inside Docker containers are owned by root:root.
            # Use docker run/exec to remove root-owned directory cleanly.
            try:
                subprocess.run(
                    ["docker", "run", "--rm", "-v", f"{dest.parent.resolve()}:/modules", "alpine", "rm", "-rf", f"/modules/{name}"],
                    check=True,
                    capture_output=True
                )
            except Exception:
                # If docker is not available or fails, fallback to chmod/rm via shell
                import os, stat
                def handle_remove_readonly(func, path, exc_info):
                    try:
                        os.chmod(path, stat.S_IWRITE | stat.S_IWUSR | stat.S_IRUSR)
                        func(path)
                    except Exception:
                        pass
                shutil.rmtree(dest, onerror=handle_remove_readonly)
    return lock