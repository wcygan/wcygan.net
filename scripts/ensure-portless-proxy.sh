#!/usr/bin/env bash
# Keep the shared Portless proxy available on its canonical HTTPS port.
set -euo pipefail

STATE_DIR="${PORTLESS_STATE_DIR:-$HOME/.portless}"
PORTLESS_BIN="${PORTLESS_BIN:-./node_modules/.bin/portless}"
PROXY_PORT="${PORTLESS_PORT:-443}"
HTTPS="${PORTLESS_HTTPS:-1}"

if [[ ! -x "$PORTLESS_BIN" ]]; then
  PORTLESS_BIN="portless"
fi

export PORTLESS_STATE_DIR="$STATE_DIR"
export PORTLESS_PORT="$PROXY_PORT"
export PORTLESS_HTTPS="$HTTPS"

pid_on_port() {
  local port="$1"
  # Do not fall back to netstat here: on macOS its PID column can identify a
  # system extension rather than the user-space Portless listener.
  lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

port_is_listening() {
  nc -z 127.0.0.1 "$1" >/dev/null 2>&1
}

command_for_pid() {
  ps -p "$1" -o command= 2>/dev/null || true
}

is_portless_pid() {
  local pid="$1"
  [[ "$(command_for_pid "$pid")" == *portless* ]]
}

stop_portless_proxy_on_port() {
  local port="$1"
  local pid
  pid="$(pid_on_port "$port")"

  if [[ -z "$pid" ]] || ! is_portless_pid "$pid"; then
    return 0
  fi

  "$PORTLESS_BIN" proxy stop -p "$port" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
}

# Portless can leave its fallback proxy running on 1355 after a previous
# startup. Stop only that Portless-owned process before starting the target.
stop_portless_proxy_on_port 1355

proxy_pid="$(pid_on_port "$PROXY_PORT")"
if [[ -n "$proxy_pid" ]] && ! is_portless_pid "$proxy_pid"; then
  echo "Port $PROXY_PORT is already used by a non-Portless process:" >&2
  ps -p "$proxy_pid" -o pid,user,command >&2
  exit 1
fi

if ! port_is_listening "$PROXY_PORT"; then
  if [[ "$HTTPS" == "0" ]]; then
    "$PORTLESS_BIN" proxy start --port "$PROXY_PORT" --no-tls || true
  else
    "$PORTLESS_BIN" proxy start --port "$PROXY_PORT" --https || true
  fi
fi

# Portless may start its proxy with elevated privileges and leave marker files
# owned by root. Repair those immediately so later dev tasks can use the state.
root_owned_path=""
if [[ -d "$STATE_DIR" ]]; then
  root_owned_path="$(/usr/bin/find "$STATE_DIR" ! -user "$USER" -print -quit)"
fi

if [[ -n "$root_owned_path" ]]; then
  sudo chown -R "$USER:$(id -gn)" "$STATE_DIR"
fi

if ! port_is_listening "$PROXY_PORT"; then
  echo "Portless proxy did not start on port $PROXY_PORT." >&2

diagnose_hidden_port_holder() {
  if [[ "$PROXY_PORT" != "443" ]]; then
    return 0
  fi
  if command -v tailscale >/dev/null 2>&1; then
    local serve_target
    serve_target="$(tailscale serve status 2>/dev/null | /usr/bin/awk '
      /^https:\/\// { hold = ($0 ~ /\.ts\.net[ :]/ && $0 !~ /:[0-9]+ /) ? "1" : ""; next }
      hold == "1" && /proxy / { print $NF; exit }
    ')"
    if [[ -n "$serve_target" ]]; then
      echo "" >&2
      echo "Root cause: Tailscale Serve is bound to local port 443 (target: $serve_target)." >&2
      echo "Its network extension holds the socket, so lsof shows no listener." >&2
      echo "Move Serve to port 8443, then retry this command:" >&2
      echo "  tailscale serve --https=8443 --bg $serve_target" >&2
      echo "  tailscale serve --https=443 off" >&2
      return 0
    fi
  fi
  echo "" >&2
  echo "Port $PROXY_PORT is unavailable, but lsof shows no listener." >&2
  echo "A macOS system extension (VPN or network filter) can hold ports invisibly." >&2
  echo "Check installed extensions:" >&2
  echo "  systemextensionsctl list" >&2
}

diagnose_hidden_port_holder
exit 1
fi
