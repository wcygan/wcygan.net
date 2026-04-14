---
description: Run the full CI + Cloudflare + regression health check for wcygan.net.
---

Load the `ci-deploy-verify` skill and run all three phases in order against `main`:

1. **GitHub Actions**: `gh run list --branch main --limit 3`. Report the top run's status. If in-progress, decide whether to watch or glance. If failed, surface `gh run view <id> --log-failed | tail -80` and stop.
2. **Cloudflare deploy**: `bunx wrangler deployments list | tail -12`. Confirm the newest deploy is newer than the latest push. If not, say so and suggest the dashboard.
3. **Regression suite**: `./scripts/verify-prod.sh`. Report pass/fail count; if anything fails, reproduce with `--verbose` and surface the specific URLs that broke.

Summarize at the end with a one-line verdict: `✓ healthy`, `⚠ CI passed but prod regression` (with failing checks), or `✗ CI failed` (with failing step).
