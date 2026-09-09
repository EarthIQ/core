#!/usr/bin/env bash
# Shared helpers for the pre-commit helper scripts (scripts/pc_*.sh).
#
# These run under `language: system` pre-commit hooks, invoked from the repo root
# with the staged filenames passed as arguments.

# Resolve a binary by name: PATH first, then common uv-tool install locations
# (so the hooks still work if the tool landed in an XDG bin that is not on PATH).
find_tool() {
  local d
  if command -v "$1" >/dev/null 2>&1; then
    command -v "$1"
    return 0
  fi
  for d in "$HOME/.local/bin" "${XDG_DATA_HOME:-$HOME/.local/share}/../bin"; do
    if [ -x "$d/$1" ]; then
      printf '%s' "$d/$1"
      return 0
    fi
  done
  return 1
}

# Locate the pnpm workspace root that owns the current git repo:
#   - core repo:   <repo>/frontend           (has frontend/pnpm-workspace.yaml)
#   - module repo: <repo>/../../frontend     (a member of the core workspace)
# Prints the absolute workspace root, or nothing if it cannot be found.
find_ws_root() {
  local repo
  repo="$(git rev-parse --show-toplevel)"
  if [ -f "$repo/frontend/pnpm-workspace.yaml" ]; then
    printf '%s' "$repo/frontend"
  elif [ -f "$repo/../../frontend/pnpm-workspace.yaml" ]; then
    ( cd "$repo/../../frontend" 2>/dev/null && pwd )
  else
    printf ''
  fi
}

# Print the nearest ESLint flat config (eslint.config.{js,mjs,cjs}) at or above
# the file $1, searching no higher than the directory $2. Prints nothing (and
# returns non-zero) if none is found, so callers can skip such files.
nearest_eslint_config() {
  local f bound d c
  f="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
  bound="$( (cd "$2" 2>/dev/null && pwd) )"
  d="$(dirname "$f")"
  while :; do
    for c in eslint.config.js eslint.config.mjs eslint.config.cjs; do
      [ -f "$d/$c" ] && { printf '%s' "$d/$c"; return 0; }
    done
    { [ -z "$bound" ] || [ "$d" = "$bound" ] || [ "$d" = "/" ]; } && return 1
    d="$(dirname "$d")"
  done
}
