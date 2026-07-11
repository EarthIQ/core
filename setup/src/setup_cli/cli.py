import subprocess
import typer
import questionary
from rich.console import Console

from .registry import load_registry, load_lock
from .installer import install_selected, remove_module, clone_module
from .workspace import update_backend_workspace, update_frontend_workspace
from .codegen import generate_frontend_routes
from .compose import generate_compose

app = typer.Typer(help="Pluggable-monolith module manager")
console = Console()


def _rewire(lock: dict):
    update_backend_workspace(lock)
    update_frontend_workspace(lock)
    generate_frontend_routes(lock)
    generate_compose(lock)


@app.command()
def init():
    """Interactive: select modules, clone, wire, build, start."""
    registry = load_registry()
    selected = questionary.checkbox(
        "Select modules to install:", choices=[m["name"] for m in registry]
    ).ask() or []

    lock = install_selected(selected, registry)
    _rewire(lock)

    console.print("[green]Wired. Building & starting containers...[/]")
    subprocess.run(
        ["docker", "compose", "-f", "docker-compose.yaml", "up", "--build", "-d"],
        check=True,
    )
    console.print("[bold green]Done![/] http://localhost:3000")


@app.command()
def add(name: str):
    registry = load_registry()
    lock = load_lock()
    current = {m["name"] for m in lock["selected"]} | {name}
    lock = install_selected(list(current), registry)
    _rewire(lock)
    console.print(f"[green]'{name}' added.[/] Run compose up to apply.")


@app.command()
def remove(name: str):
    lock = remove_module(name)
    _rewire(lock)
    console.print(f"[yellow]'{name}' removed.[/] Run compose up to apply.")


@app.command()
def update(name: str):
    registry = load_registry()
    reg_by_name = {m["name"]: m for m in registry}
    clone_module(name, reg_by_name[name]["repo"])
    _rewire(load_lock())
    console.print(f"[green]'{name}' updated.[/]")


@app.command(name="list")
def list_modules():
    registry, lock = load_registry(), load_lock()
    installed = {m["name"] for m in lock["selected"]}
    for m in registry:
        mark = "[green]✔ installed[/]" if m["name"] in installed else "[dim]not installed[/]"
        console.print(f"{m['name']:<15} {mark}")


@app.command()
def sync():
    _rewire(load_lock())
    console.print("[green]Synced workspaces, routes, and compose file.[/]")


if __name__ == "__main__":
    app()