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
branch_name="$(git symbolic-ref --quiet --short HEAD || true)"

if [[ "$git_dir" != "$git_common_dir" && -z "$branch_name" ]]; then
  worktree_hash="$(printf '%s' "$repo_root" | cksum | awk '{ print $1 }')"
  app_name="wcygan-${worktree_hash}"

  # Detached worktrees have no branch name for Portless to use. Give them a
  # stable checkout-specific name while normal worktrees use branch prefixes.
  exec bun --bun run portless --name "$app_name" bun run dev-vite
fi

# Portless keeps the base hostname on main and prefixes linked worktrees with
# their branch name (for example, codex/foo -> foo.wcygan.localhost).
exec bun --bun run portless run --name "$app_name" bun run dev-vite
