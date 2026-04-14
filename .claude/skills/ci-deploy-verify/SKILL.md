---
name: ci-deploy-verify
description: Verify CI and deploy health for wcygan.net — programmatically check that the latest GitHub Actions CI run on main is green, that Cloudflare Workers Builds produced and activated a new deployment, and that the live site passes the regression suite at scripts/verify-prod.sh. Use after pushing to main, when debugging "did my deploy land", when a PR is green but prod looks wrong, when scheduling a release check, or when investigating whether a user-reported issue is a deploy failure or a content bug. Keywords CI status, actions passing, deploy landed, deploy check, cloudflare deploy, workers builds, wrangler deployments, regression test, prod smoke, post-deploy verify, is it broken, release check, github actions, build status, verify prod.
---

# CI & Deploy Verify

End-to-end health check for wcygan.net. Three phases, always run in order — each phase short-circuits diagnosis for the next.

## Phase 1 — GitHub Actions CI on main

```bash
gh run list --branch main --limit 3
```

Look at the top row:

- **`completed` + `success`** → CI green, move to phase 2.
- **`in_progress` / `queued`** → wait for it. Options:
  - Block: `gh run watch <id> --exit-status`
  - Glance: rerun `gh run list --branch main --limit 1`
- **`completed` + `failure`** → stop. Fix CI first.
  - Get the failed step: `gh run view <id> --log-failed | tail -80`
  - Rerun after fix: `gh run rerun <id>` (same commit) or push a new commit.

The workflow is `.github/workflows/ci.yml` — build → typecheck → test.

## Phase 2 — Cloudflare deploy

```bash
bunx wrangler deployments list | tail -12
```

Each deploy entry has `Created:` timestamp and a version ID. The most recent one should be newer than your push time. If not:

- Cloudflare Workers Builds may still be running — check the Cloudflare dashboard (Workers & Pages → `wcygan-net` → Deployments).
- If multiple pushes happened in quick succession, only the latest produces a live deploy (Cloudflare debounces).

For a specific version:

```bash
bunx wrangler deployments list --name wcygan-net
bunx wrangler versions list --name wcygan-net | tail -10
```

## Phase 3 — Regression suite against production

```bash
./scripts/verify-prod.sh
```

Exit 0 = all checks pass. Exit 1 = at least one check failed, with per-check diagnosis printed.

Covers:

1. Core routes return 2xx/3xx: `/`, `/about`, `/posts`, `/really-good-software`.
2. Static-asset dot-rejection guard: `/rss.xml`, `/will_cygan_resume.pdf`, `/favicon.ico` → 200. Validates that `src/lib/routing/static-asset-guard.ts` still works in prod.
3. Removed routes stay 404: `/feed`, `/mermaid-examples`. Guarantees the audit cleanup didn't regress.
4. RSS content: `/rss.xml` is well-formed XML with `<rss>` root and `<atom:link>` self-reference.
5. Build fingerprint: homepage HTML contains `__TSR_` (TanStack build) and no `__sveltekit` (stale Worker).

Run against a preview or local build:

```bash
./scripts/verify-prod.sh --base http://localhost:3000
./scripts/verify-prod.sh --base https://<branch>.wcygan-net.pages.dev
```

Verbose mode prints the URL + status code on failure:

```bash
./scripts/verify-prod.sh --verbose
```

## One-shot end-to-end

```bash
gh run list --branch main --limit 1 \
  && bunx wrangler deployments list | tail -6 \
  && ./scripts/verify-prod.sh
```

All three exit cleanly → deploy is healthy.

## Common failure patterns

| Symptom                                              | Phase | Likely cause                                              | Next step                                                       |
| ---------------------------------------------------- | ----- | --------------------------------------------------------- | --------------------------------------------------------------- |
| CI failed on typecheck                               | 1     | `routeTree.gen.ts` stale — `bun run build` must run first | Check `.github/workflows/ci.yml` build step order               |
| CI green, no new Cloudflare deploy                   | 2     | Cloudflare Workers Builds not configured to watch branch  | Dashboard → Workers & Pages → project → Settings → Builds       |
| Phase 3 fingerprint fails (`__sveltekit` present)    | 3     | Old CDN cache or failed deploy                            | Load `verify-live-stack` skill; purge zone cache if needed      |
| `/rss.xml` → 404 but CI is green                     | 3     | `public/rss.xml` not committed or Nitro copy failed       | Verify `public/rss.xml` exists locally and in `.output/public/` |
| `/feed` → 200 (regression)                           | 3     | Someone re-added `src/routes/feed.tsx`                    | Grep repo for `feed.tsx`; remove route                          |
| Dot-rejection `/will_cygan_resume.pdf` → 404 in prod | 3     | `isStaticAssetSlug` changed or guard removed              | Check `src/lib/routing/static-asset-guard.ts` and its test      |
| Phase 1 + 2 pass, homepage 5xx                       | 3     | Runtime error in prerendered HTML or Worker config drift  | Check Cloudflare dashboard → Workers → Logs                     |

## Related skills

- `verify-live-stack` — deeper fingerprint/cache diagnostics when Phase 3 fails (e.g., distinguishing stale CDN vs failed deploy).
- `cloudflare-static-deploy` — the deploy pipeline this skill verifies the output of.
- `github-actions-troubleshooter` — when Phase 1 fails and you need to fix the workflow itself.

## Adding new regression checks

Edit `scripts/verify-prod.sh` — it's plain bash using `curl` + `grep`, no deps beyond what ships on macOS / Ubuntu. Use the existing helpers:

- `status_is URL CODE` — exact status match
- `status_in URL CODE [CODE ...]` — status is one of
- `body_contains URL PATTERN` — response body matches grep pattern

Each check wraps with `check "name" <helper> <args>`. Failures are counted and named in the summary. Keep checks independent — no shared state between them.
