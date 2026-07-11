"""Allows running the CLI as: uv run --project setup python -m setup_cli init"""

from setup_cli.cli import app

if __name__ == "__main__":
    app()