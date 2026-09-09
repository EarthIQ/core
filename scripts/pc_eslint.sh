#!/usr/bin/env bash
# Lint staged TS/TSX with the workspace ESLint (@packages/eslint-config).
# Files with no discoverable eslint.config.js (e.g. a module that ships none)
# are skipped so the hook never false-blocks a commit.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pc_lib.sh"

ws="$(find_ws_root)"
if [ -z "$ws" ]; then
  echo "eslint: no pnpm workspace found; skipping" >&2
  exit 0
fi

root="$(git rev-parse --show-toplevel)"
to_lint=()
for f in "$@"; do
  abs="$root/$f"
  if nearest_eslint_config "$abs" "$ws" >/dev/null; then
    to_lint+=("$abs")
  else
    echo "eslint: skipping (no eslint.config.js above): $f" >&2
  fi
done
[ "${#to_lint[@]}" -eq 0 ] && exit 0

( cd "$ws" && pnpm exec eslint --fix -- "${to_lint[@]}" )
