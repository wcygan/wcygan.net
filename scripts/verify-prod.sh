#!/usr/bin/env bash
# Regression suite for wcygan.net production.
#
# Checks:
#   1. Core routes return 2xx/3xx (home, about, posts, known post)
#   2. Static-asset dot-rejection guard works (/rss.xml, /*.pdf, /*.ico)
#   3. Removed routes stay 404 (/feed, /mermaid-examples)
#   4. RSS XML is well-formed and self-referential
#   5. Homepage serves the current TanStack build (no SvelteKit fingerprint)
#
# Usage:
#   scripts/verify-prod.sh                         # defaults to https://wcygan.net
#   scripts/verify-prod.sh --base https://host     # custom base URL
#   scripts/verify-prod.sh --verbose               # dump headers on failure
#
# Exit 0 if all checks pass, 1 otherwise.

set -uo pipefail

BASE="https://wcygan.net"
VERBOSE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --verbose|-v) VERBOSE=1; shift ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; DIM='\033[2m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; DIM=''; NC=''
fi

PASS=0
FAIL=0
FAIL_NAMES=()

check() {
  local name="$1"; shift
  if "$@"; then
    PASS=$((PASS+1))
    printf "${GREEN}✓${NC} %s\n" "$name"
  else
    FAIL=$((FAIL+1))
    FAIL_NAMES+=("$name")
    printf "${RED}✗${NC} %s\n" "$name"
  fi
}

status_is() {
  local url="$1" expected="$2"
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url")
  if [[ "$got" == "$expected" ]]; then return 0; fi
  if [[ "$VERBOSE" -eq 1 ]]; then
    printf "  ${DIM}expected %s, got %s for %s${NC}\n" "$expected" "$got" "$url" >&2
  else
    printf "  ${DIM}%s → %s (expected %s)${NC}\n" "$url" "$got" "$expected" >&2
  fi
  return 1
}

status_in() {
  local url="$1"; shift
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url")
  for expected in "$@"; do
    if [[ "$got" == "$expected" ]]; then return 0; fi
  done
  printf "  ${DIM}%s → %s (expected one of: %s)${NC}\n" "$url" "$got" "$*" >&2
  return 1
}

body_contains() {
  local url="$1" pattern="$2"
  if curl -s --max-time 10 --compressed "$url" | grep -q "$pattern"; then
    return 0
  fi
  printf "  ${DIM}%s missing pattern: %s${NC}\n" "$url" "$pattern" >&2
  return 1
}

printf "${YELLOW}→${NC} Verifying %s\n\n" "$BASE"

printf "${DIM}# Core routes${NC}\n"
check "home serves 200"             status_is "$BASE/" 200
check "/about reachable"            status_in "$BASE/about" 200 307 308
check "/posts reachable"            status_in "$BASE/posts" 200 307 308
check "known post reachable"        status_in "$BASE/really-good-software" 200 307 308

printf "\n${DIM}# Static asset dot-rejection guard${NC}\n"
check "/rss.xml → 200"              status_is "$BASE/rss.xml" 200
check "/will_cygan_resume.pdf → 200" status_is "$BASE/will_cygan_resume.pdf" 200
check "/favicon.ico → 200"          status_is "$BASE/favicon.ico" 200

printf "\n${DIM}# Removed routes stay 404${NC}\n"
check "/feed → 404"                 status_is "$BASE/feed" 404
check "/mermaid-examples → 404"     status_is "$BASE/mermaid-examples" 404

printf "\n${DIM}# Content integrity${NC}\n"
check "rss.xml is XML"              body_contains "$BASE/rss.xml" '<?xml'
check "rss.xml has <rss> root"      body_contains "$BASE/rss.xml" '<rss'
check "rss.xml has atom self-link" body_contains "$BASE/rss.xml" '<atom:link'

printf "\n${DIM}# Build fingerprint${NC}\n"
check "homepage has TanStack marker" body_contains "$BASE/" '__TSR_'
if curl -s --compressed --max-time 10 "$BASE/" | grep -q '__sveltekit'; then
  FAIL=$((FAIL+1))
  FAIL_NAMES+=("stale SvelteKit marker present")
  printf "${RED}✗${NC} no stale SvelteKit marker on homepage\n"
else
  PASS=$((PASS+1))
  printf "${GREEN}✓${NC} no stale SvelteKit marker on homepage\n"
fi

printf "\n"
if [[ "$FAIL" -eq 0 ]]; then
  printf "${GREEN}✓ %d passed${NC}\n" "$PASS"
  exit 0
else
  printf "${RED}✗ %d failed${NC}, %d passed\n" "$FAIL" "$PASS"
  printf "${DIM}  failures:${NC}\n"
  for name in "${FAIL_NAMES[@]}"; do
    printf "    - %s\n" "$name"
  done
  exit 1
fi
