#!/usr/bin/env bash
# ruff format (auto-fix). Uses the repo's ruff.toml. Non-zero exit blocks commit.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pc_lib.sh"
RUFF="$(find_tool ruff)" || { echo "ruff not found — run: uv tool install ruff" >&2; exit 1; }
exec "$RUFF" format --config ruff.toml -- "$@"
