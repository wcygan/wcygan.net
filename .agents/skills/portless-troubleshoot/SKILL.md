---
name: portless-troubleshoot
description: Debug Portless startup and local preview failures for wcygan.net. Use for proxy bind errors, hidden macOS port holders, or pages that appear briefly then disappear during hydration after a dev-server port change.
---

# portless-troubleshoot

Choose between a proxy startup failure and a browser hydration failure. For
startup failures, the reported sudo error is rarely the cause; port 443 often
has a hidden holder.

## Symptom map

- `sudo failed` or `timed out waiting for it to listen` → port 443 is held or
  the proxy never listened. Continue with step 1.
- `Port 443 is already in use` and `lsof -ti tcp:443` prints nothing → hidden
  holder. Continue with step 1.
- Proxy fell back to port 1355 → port 443 is unavailable. `wcygan.localhost`
  will not resolve with a port number. Find the 443 holder first.
- HTTP responds and the page appears briefly before disappearing → inspect
  the failing browser using the hydration section below before changing ports.

## Proxy startup steps

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

## Page disappears during hydration

An HTTP `200` or an immediate screenshot proves server rendering, not a healthy
client. Inspect the user's already-open tab, refresh it, and check the DOM and
console after hydration settles. A fresh browser can succeed while the user's
tab continues to fail because its dependency cache is stale.

The verified failure produced `Invalid hook call` and
`Cannot read properties of null (reading 'use')` in TanStack Router's
`AwaitInner`. Its stack mixed React from
`/node_modules/.vite/dev-4727/deps/` with React DOM from
`/node_modules/.vite/dev-4765/deps/`, both using `?v=7c3151a9`. Treat these ports
and hashes as example evidence; compare the actual URLs in the failing stack.

In Vite 7.2.7, the dependency browser hash omits `cacheDir`. This repository
isolates dev caches by Portless port (or PID without Portless), but cached
transformed dependency URLs can retain the same hash after that directory
changes. A cached router module can then import the previous directory's React
alongside the current renderer, breaking hooks during hydration.

`vite.config.ts` fixes this with one `devCacheKey` shared by the dev `cacheDir`
and `optimizeDeps.esbuildOptions.define.__WCYGAN_DEV_CACHE_KEY__`, whose value is
`JSON.stringify(devCacheKey)`. The optimizer options participate in Vite's
browser hash, so a different cache directory also changes the dependency
version. Preserve both the cache isolation and this version change when
editing development configuration.

To confirm this diagnosis, compare the console's dependency URLs with the
active Portless port and that cache's `deps/_metadata.json`. Verify the installed
Vite hash logic if its version changes. A cache purge alone may hide the symptom
without preventing its return. Keep the existing server registration; saving
the configuration lets Vite reload it without taking over another checkout.

Completion requires repeated refreshes in the previously failing tab with
article content still present after hydration and no new hook errors. Verify
desktop and mobile, then run `bun run pre-commit` and the build when required
by the changed files. In the verified repair, all 24 draft paragraphs remained
visible and the user confirmed recovery. Deno request cancellations and
`THREE_CJS_DEPRECATED` appeared nearby in logs, but were not the demonstrated
cause; investigate them separately only when evidence warrants it.

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
