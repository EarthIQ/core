#!/usr/bin/env bash
# Format staged files with the workspace Prettier.
# Single source of truth for JS/TS style: @packages/prettier-config (via frontend/prettier.config.mjs).
# Works for both core files (frontend/...) and module files (modules/*/frontend/...).
#
# Memory-safe: files are processed in batches of BATCH_SIZE to keep each
# Node.js process's heap bounded.
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

# Cap Node heap (512 MB) as a safety net so a single batch can't blow up.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=512"

# Process in batches to keep memory bounded (avoids one giant Node process
# loading 500+ file ASTs simultaneously).
BATCH_SIZE=50
total=${#abs[@]}
i=0
rc=0
while [ "$i" -lt "$total" ]; do
  batch=("${abs[@]:i:BATCH_SIZE}")
  ( cd "$ws" && pnpm exec prettier --config ./prettier.config.mjs --ignore-path ./.prettierignore --write -- "${batch[@]}" ) || rc=$?
  i=$((i + BATCH_SIZE))
done
exit "$rc"
