---
name: verify-live-stack
description: Verify that wcygan.net production is serving the TanStack Start + Vite build (not a cached SvelteKit deploy or stale worker). Use when debugging "did my deploy land", comparing local vs prod output, confirming a rollback worked, investigating stale content after a push, or diagnosing hydration/routing failures that could be caused by mixed versions. Keywords verify, fingerprint, deploy check, prod, production, tanstack vs sveltekit, __TSR, cache, stale, assets, hydration, rollback verification, which version
---

# Verify Live Stack

Fast checks to confirm production is serving the **current TanStack Start + Vite** build, not a cached SvelteKit Worker or a stale deploy.

## Fingerprint cheat sheet

| Signal                | TanStack Start (current)                         | SvelteKit (old)                         |
| --------------------- | ------------------------------------------------ | --------------------------------------- |
| SSR hydration global  | `__TSR_` / `__TSR_ROUTER_MANIFEST__`             | `__sveltekit_`                          |
| Asset path prefix     | `/assets/<name>-<hash>.js`                       | `/_app/immutable/entry/start.<hash>.js` |
| Router markers        | `tsr-scroll-restoration-v`, `tsr-stream-barrier` | Svelte hydration comments `<!--[-->`    |
| Component chunk names | `MermaidDiagram-<hash>.js` (React)               | `Mermaid-<hash>.svelte-<hash>.js`       |
| Console probe         | `window.__TSR_ROUTER_MANIFEST__` is an object    | `undefined`                             |

Any SvelteKit marker on wcygan.net means the deploy didn't land or an old cached response is being served.

## One-liner verification

```bash
curl -s --compressed https://wcygan.net/ \
  | grep -aoE '(__TSR_|__sveltekit|/assets/|/_app/immutable)' \
  | sort -u
```

Expected output:

```
__TSR_
/assets/
```

If you see `__sveltekit` or `/_app/immutable` → old build still live. If you see both → CDN cache mismatch between HTML and assets (purge the zone).

## Deeper checks

```bash
# Which version is the edge currently serving?
npx wrangler deployments list | tail -20

# Is the response from cache or origin?
curl -sI https://wcygan.net/ | grep -i 'cf-cache-status\|age\|etag'

# Force-miss cache (confirms origin is fresh, not a stale edge copy)
curl -sI https://wcygan.net/ -H 'Cache-Control: no-cache' | grep -i cache-status

# Does this specific post exist as prerendered HTML on the worker?
curl -sI https://wcygan.net/really-good-software/ | head -3
```

## In-browser verification (DevTools)

1. Right-click page → **View Page Source** (raw server response — NOT Inspect, which shows post-hydration DOM).
2. Cmd+F for `__TSR_` (hit = TanStack) and `__sveltekit_` (hit = old stack).
3. **Network** tab → reload → look for `/assets/index-*.js`. SvelteKit would show `/_app/immutable/nodes/0.*.js`.
4. **Console** → type `window.__TSR_ROUTER_MANIFEST__`. Object = current stack; `undefined` = old stack or pre-hydration.
5. **Application** tab → Service Workers. There should be none registered. A leftover SvelteKit service worker is a common cause of "I deployed but still see the old site."

## Common failure modes

| Symptom                                                               | Cause                                                                                            | Fix                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Curl shows `__TSR_` but browser shows old layout                      | Service worker cache from SvelteKit era                                                          | DevTools → Application → Service Workers → Unregister; or incognito |
| Curl + browser both show SvelteKit markers                            | CI deploy didn't land — check `wrangler deployments list` timestamp against push time            | Re-trigger build, or `npx wrangler deploy` from laptop              |
| `/assets/*.js` returns 404 while HTML loads                           | Asset directory mismatch — `wrangler.jsonc` `assets.directory` doesn't match actual build output | Verify `.output/public/` has `assets/` subdir; redeploy             |
| Different version IDs between `wrangler versions list` and production | Gradual rollout in progress                                                                      | Wait 60s and recheck; or check Deployments tab for rollout %        |
| New deploy, edge still serves old content for >5min                   | Zone-level CDN cache outside Workers Assets                                                      | Cloudflare dashboard → Caching → Purge Everything                   |

## When to reach for this skill

- After a `git push` that triggered a CI build — confirm it actually shipped
- After `npx wrangler rollback` — confirm the older version is serving
- When a blog post edit doesn't appear in prod — is it a deploy issue or a cache issue?
- When hydration errors appear in the browser console — could be version skew between HTML and JS chunks
- When switching between the `wcygan-net.wcygan-io.workers.dev` subdomain and `wcygan.net` gives different content — DNS vs edge cache diagnostic

## Related

- `cloudflare-static-deploy` — how the deploy gets there in the first place
- `wcygan-net-stack` — stack reference (TanStack, Bun, MDX, Mermaid)
