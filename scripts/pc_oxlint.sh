#!/usr/bin/env bash
# Lint staged TS/TSX with oxlint (Rust-based, fast, low-memory).
# Replaces the old ESLint hook — same rule coverage via .oxlintrc.json,
# but runs as a native binary instead of a Node.js process.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pc_lib.sh"

ws="$(find_ws_root)"
if [ -z "$ws" ]; then
  echo "oxlint: no pnpm workspace found; skipping" >&2
  exit 0
fi

OXLINT="$(find_tool oxlint)" || {
  # Fallback: resolve via pnpm workspace
  OXLINT="$(cd "$ws" && pnpm exec which oxlint 2>/dev/null)" || {
    echo "oxlint not found — run: pnpm add -D -w oxlint (in frontend/)" >&2
    exit 1
  }
}

# Convert to absolute paths so they work regardless of cwd.
root="$(git rev-parse --show-toplevel)"
abs=()
for f in "$@"; do abs+=("$root/$f"); done

# Run from the workspace root so config discovery works.
( cd "$ws" && "$OXLINT" -c "$ws/.oxlintrc.json" -- "${abs[@]}" )
