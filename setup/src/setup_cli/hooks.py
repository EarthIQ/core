"""Install / refresh pre-commit hooks across the core repo and every module repo.

The shared tooling — `.pre-commit-config.yaml`, `ruff.toml`, and the helper
scripts under `scripts/pc_*.sh` — lives at the core repo root. Because each module
is its own git repository (cloned into `modules/<name>-module/`), `setup hooks`
copies that tooling into each module and runs `pre-commit install` there, so a
commit in a module is guarded exactly like a commit in core.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

# Shared files copied from the core root into each module repo.
_SHARED_FILES = [".pre-commit-config.yaml", "ruff.toml"]
_SHARED_SCRIPTS = [
    "pc_lib.sh",
    "pc_ruff_format.sh",
    "pc_ruff_check.sh",
    "pc_prettier.sh",
    "pc_eslint.sh",
]


def module_repos(root: Path) -> list[Path]:
    """All module directories under ``root/modules`` that are git repositories."""
    base = root / "modules"
    if not base.exists():
        return []
    return [d for d in sorted(base.iterdir()) if d.is_dir() and (d / ".git").exists()]


def _copy_shared(root: Path, target: Path) -> None:
    """Copy the shared pre-commit tooling from ``root`` into ``target``."""
    for name in _SHARED_FILES:
        src = root / name
        if src.exists():
            shutil.copy2(src, target / name)
    scripts = target / "scripts"
    scripts.mkdir(exist_ok=True)
    for name in _SHARED_SCRIPTS:
        src = root / "scripts" / name
        if src.exists():
            dst = scripts / name
            shutil.copy2(src, dst)
            dst.chmod(0o755)


def _precommit_bin() -> str | None:
    """Locate the pre-commit executable (PATH first, then uv-tool defaults)."""
    import shutil as _sh

    found = _sh.which("pre-commit")
    if found:
        return found
    candidates = [
        Path.home() / ".local" / "bin" / "pre-commit",
        Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))).parent
        / "bin"
        / "pre-commit",
    ]
    for c in candidates:
        if c.is_file() and os.access(c, os.X_OK):
            return str(c)
    return None


def install_hooks(root: Path, verbose: bool = True) -> int:
    """Install pre-commit hooks in the core repo + every module repo.

    Returns the number of repos hooks were (re)installed in. No-op (returns 0)
    if ``pre-commit`` is not on PATH, printing a hint instead of failing.
    """
    pc = _precommit_bin()
    if pc is None:
        if verbose:
            print("pre-commit not found — run: uv tool install pre-commit")
        return 0

    targets = [root, *module_repos(root)]
    installed = 0
    for repo in targets:
        if not (repo / ".git").exists():
            continue
        if repo.resolve() != root.resolve():
            _copy_shared(root, repo)
        subprocess.run([pc, "install"], cwd=repo, check=True)
        if verbose:
            print(f"installed hooks in {repo}")
        installed += 1
    return installed
