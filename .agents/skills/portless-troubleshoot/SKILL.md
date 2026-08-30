---
name: portless-troubleshoot
description: Debug portless dev proxy startup failures for wcygan.net. Use when `just dev` fails with "sudo failed", "timed out waiting for it to listen", or "Port 443 is already in use" while lsof shows no listener, when https://wcygan.localhost will not load, or when a macOS system extension (Tailscale, VPN, content filter) holds a local port.
---

# portless-troubleshoot

Diagnose portless proxy startup failures. The reported sudo error is rarely the
cause. Port 443 usually has a hidden holder.

## Symptom map

- `sudo failed` or `timed out waiting for it to listen` → port 443 is held or
  the proxy never listened. Continue with step 1.
- `Port 443 is already in use` and `lsof -ti tcp:443` prints nothing → hidden
  holder. Continue with step 1.
- Proxy fell back to port 1355 → port 443 is unavailable. `wcygan.localhost`
  will not resolve with a port number. Find the 443 holder first.

## Steps

1. Confirm the port is held with a direct bind test:

   ```bash
   python3 -c "import socket; s=socket.socket(); s.bind(('0.0.0.0',443))"
   ```

   - `Address already in use` → the port is held. Go to step 2.
   - No error → the holder released the port. Skip to step 4.

2. Identify the holder. Run each command in order:

   ```bash
   tailscale serve status
   systemextensionsctl list
   ```

   - `serve status` shows a `https://<host>.ts.net ` line with no port suffix
     → Tailscale Serve holds 443. Go to step 3.
   - `serve status` shows no 443 entry → a different network extension holds
     the port. Quit that extension, then repeat step 1.

3. Move Tailscale Serve to port 8443. Serve allows 443, 8443, and 10000.

   ```bash
   tailscale serve --https=8443 --bg <target-from-status-output>
   tailscale serve --https=443 off
   ```

   Repeat the bind test. The port must bind before you continue.

4. Start the proxy and verify end to end:

   ```bash
   just dev
   curl -sk -o /dev/null -w '%{http_code}\n' https://wcygan.localhost/
   ```

   Completion criterion: the curl prints `200`.

## Reference

- **Why lsof shows nothing**: macOS network extensions hold sockets outside
  the visible process table. `lsof`, `pgrep`, and unprivileged `netstat` cannot
  name the holder. The bind test and `systemextensionsctl list` are the
  reliable probes.
- **Automatic diagnosis**: `scripts/ensure-portless-proxy.sh` runs this
  analysis when the proxy fails to listen and prints the root cause with the
  exact fix commands. Apply its output directly instead of repeating steps 1
  and 2.
- **Logs**: `~/.portless/proxy.log`. The log accumulates proxy errors and can
  grow past 100 MB. Truncate it freely.
- **Fallback**: `portless proxy start -p 1355 --https` starts without port
  443, but `wcygan.localhost` needs 443. Use the fallback only for
  diagnosis, not for daily work.
