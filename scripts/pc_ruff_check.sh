#!/usr/bin/env bash
# ruff check (auto-fix where safe). Any remaining error exits non-zero → blocks commit.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pc_lib.sh"
RUFF="$(find_tool ruff)" || { echo "ruff not found — run: uv tool install ruff" >&2; exit 1; }
exec "$RUFF" check --fix --config ruff.toml -- "$@"
