#!/usr/bin/env bash
# Keep the local Portless proxy on the clean HTTPS port.
set -euo pipefail

STATE_DIR="${PORTLESS_STATE_DIR:-$HOME/.portless}"
PORTLESS_BIN="${PORTLESS_BIN:-./node_modules/.bin/portless}"

if [[ ! -x "$PORTLESS_BIN" ]]; then
  PORTLESS_BIN="portless"
fi

export PORTLESS_STATE_DIR="$STATE_DIR"
export PORTLESS_PORT=443

pid_on_port() {
  local port="$1"
  local pid
  local netstat_pid

  pid="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return 0
  fi

  netstat_pid="$(netstat -anv -p tcp 2>/dev/null \
    | awk -v suffix=".$port" '
        $4 ~ suffix "$" && $6 == "LISTEN" {
          for (i = 1; i <= NF; i++) {
            if ($i ~ /^[[:alnum:]_.-]+:[0-9]+$/) {
              split($i, parts, ":")
              print parts[2]
              exit
            }
          }
        }
      ' || true)"

  if [[ -n "$netstat_pid" ]]; then
    echo "$netstat_pid"
  fi
}

port_is_listening() {
  nc -z 127.0.0.1 "$1" >/dev/null 2>&1
}

command_for_pid() {
  ps -p "$1" -o command= 2>/dev/null || true
}

is_portless_pid() {
  local pid="$1"
  local command
  command="$(command_for_pid "$pid")"
  [[ "$command" == *portless* ]]
}

stop_portless_proxy_on_port() {
  local port="$1"
  local pid
  pid="$(pid_on_port "$port")"

  if [[ -z "$pid" ]]; then
    return 0
  fi

  if ! is_portless_pid "$pid"; then
    return 0
  fi

  "$PORTLESS_BIN" proxy stop -p "$port" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
}

stop_stale_portless_state() {
  local expected_port="$1"
  local state_pid=""
  local state_port=""

  if [[ -f "$STATE_DIR/proxy.pid" ]]; then
    state_pid="$(cat "$STATE_DIR/proxy.pid")"
  fi

  if [[ -f "$STATE_DIR/proxy.port" ]]; then
    state_port="$(cat "$STATE_DIR/proxy.port")"
  fi

  if [[ "$state_port" != "$expected_port" || -z "$state_pid" ]]; then
    return 0
  fi

  if ! ps -p "$state_pid" >/dev/null 2>&1; then
    rm -f "$STATE_DIR/proxy.pid" "$STATE_DIR/proxy.port"
    return 0
  fi

  if port_is_listening "$expected_port"; then
    return 0
  fi

  if is_portless_pid "$state_pid"; then
    kill "$state_pid" >/dev/null 2>&1 || sudo kill "$state_pid"
    rm -f "$STATE_DIR/proxy.pid" "$STATE_DIR/proxy.port"
  fi
}

# The fallback proxy also binds port 80 for redirects, which conflicts with the
# clean 443 proxy. Stop it before asking Portless to start the real proxy.
stop_portless_proxy_on_port 1355
stop_stale_portless_state 443

port_443_pid="$(pid_on_port 443)"
if [[ -n "$port_443_pid" ]] && ! is_portless_pid "$port_443_pid"; then
  echo "Port 443 is already used by a non-Portless process:" >&2
  ps -p "$port_443_pid" -o pid,user,command >&2
  exit 1
fi

if ! port_is_listening 443; then
  "$PORTLESS_BIN" proxy start --port 443 --https || true
fi

# Portless 0.12 starts the privileged proxy via sudo and can leave marker files
# owned by root. Repair those immediately so later non-root dev tasks can read
# and update the state directory.
root_owned_path=""
if [[ -d "$STATE_DIR" ]]; then
  root_owned_path="$(/usr/bin/find "$STATE_DIR" ! -user "$USER" -print -quit)"
fi

if [[ -n "$root_owned_path" ]]; then
  sudo chown -R "$USER:$(id -gn)" "$STATE_DIR"
fi

if ! port_is_listening 443; then
  echo "Portless proxy did not start on port 443." >&2
  exit 1
fi
