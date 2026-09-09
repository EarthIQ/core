#!/usr/bin/env bash
# Format staged files with the workspace Prettier.
# Single source of truth for JS/TS style: @packages/prettier-config (via frontend/prettier.config.mjs).
# Works for both core files (frontend/...) and module files (modules/*/frontend/...).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pc_lib.sh"

ws="$(find_ws_root)"
if [ -z "$ws" ]; then
  echo "prettier: no pnpm workspace found; skipping" >&2
  exit 0
fi

root="$(git rev-parse --show-toplevel)"
abs=()
for f in "$@"; do abs+=("$root/$f"); done

# Run from the workspace root so `pnpm exec` resolves the workspace's prettier,
# but pass absolute file paths so they resolve correctly regardless of cwd.
( cd "$ws" && pnpm exec prettier --config ./prettier.config.mjs --ignore-path ./.prettierignore --write -- "${abs[@]}" )
