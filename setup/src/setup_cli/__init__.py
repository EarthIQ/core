"""setup_cli — CLI for managing pluggable modules in the core monolith."""

from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("setup-cli")
except PackageNotFoundError:
    __version__ = "0.0.0-dev"

from .cli import app  # re-export Typer app for `python -m setup_cli`

__all__ = ["app", "__version__"]