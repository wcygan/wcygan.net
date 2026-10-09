#!/usr/bin/env bash
set -euo pipefail

export PORTLESS_STATE_DIR="${PORTLESS_STATE_DIR:-$HOME/.portless}"
export PORTLESS_PORT="${PORTLESS_PORT:-443}"
export PORTLESS_HTTPS="${PORTLESS_HTTPS:-1}"

scripts/ensure-portless-proxy.sh

repo_root="$(git rev-parse --show-toplevel)"
git_dir="$(git rev-parse --absolute-git-dir)"
git_common_dir="$(git rev-parse --path-format=absolute --git-common-dir)"

app_name="wcygan"
if [[ "$git_dir" != "$git_common_dir" ]]; then
  worktree_hash="$(printf '%s' "$repo_root" | cksum | awk '{ print $1 }')"
  app_name="wcygan-${worktree_hash}"
fi

# Explicit-name mode skips Portless's branch prefix. The checkout path hash
# also distinguishes detached worktrees and multiple checkouts of one branch.
exec bun --bun run portless --name "$app_name" bun run dev-vite
