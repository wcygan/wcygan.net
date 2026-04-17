---
name: agent-ready
description: Understand and improve site readiness for AI agent discovery — the isitagentready.com checks covering robots.txt, sitemap.xml, Markdown for Agents, MCP server cards, OAuth discovery, Agent Skills, WebMCP, and related emerging standards. Auto-loads when auditing a site against isitagentready.com, deciding which standards apply to a personal blog vs an API-backed service, debugging a missing well-known endpoint, or extending wcygan.net's auto-generation plugin. Keywords isitagentready, agent-ready, agent ready, robots.txt, sitemap.xml, llms.txt, Content-Signal, Markdown for Agents, MCP server card, MCP, OAuth discovery, Agent Skills, WebMCP, Web Bot Auth, well-known, x402, UCP, ACP, site-metadata-plugin, RFC 9309, RFC 8288, RFC 9727, RFC 9728, RFC 8414.
---

# Agent-Ready Site Checks

Reference for the standards that [isitagentready.com](https://isitagentready.com/) audits and how wcygan.net satisfies the ones that matter for a personal blog. Invoke via `/agent-ready` or by mentioning any keyword above.

## When this skill should fire

- User pastes or references an isitagentready.com scan result
- User asks about robots.txt / sitemap.xml / RSS / Content Signals / `.well-known` endpoints
- User asks "is my site agent-ready?" / "how do I expose X to AI agents?"
- User wants to add a new agent-facing endpoint (MCP card, OAuth discovery, Agent Skills index, etc.)
- User wants to understand or modify the auto-generation pipeline in `scripts/site-metadata-plugin.ts`

## Quick decision matrix

| Site type                      | Add these                                                                     | Skip these                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Personal blog (wcygan.net)** | robots.txt, sitemap.xml, RSS, Content-Signal, Markdown for Agents (CF toggle) | OAuth, MCP, WebMCP, API catalog, Web Bot Auth, Agent Skills index, x402/UCP/ACP |
| **API-backed service**         | + API catalog (RFC 9727), OAuth discovery (RFC 8414 / RFC 9728), Link headers | WebMCP, x402/UCP/ACP (unless commerce)                                          |
| **Site with AI tools**         | + MCP server card, Agent Skills index, WebMCP                                 | —                                                                               |
| **Commerce**                   | + x402, UCP, ACP                                                              | —                                                                               |

See [applicability-matrix.md](references/applicability-matrix.md) for the reasoning per check.

## Audit workflow

1. **Remote scan** — point isitagentready.com at the URL for the reference report.
2. **Local probe** — hit the well-known endpoints directly. A static site can be verified with curl:

   ```bash
   for path in /robots.txt /sitemap.xml /rss.xml /.well-known/mcp/server-card.json \
               /.well-known/openid-configuration /.well-known/agent-skills/index.json; do
     printf "%-50s " "$path"
     curl -s -o /dev/null -w "HTTP %{http_code}  %{content_type}\n" "https://$DOMAIN$path"
   done
   ```

3. **Markdown negotiation** — some checks require `Accept: text/markdown`:

   ```bash
   curl -sI -H "Accept: text/markdown" "https://$DOMAIN/" | grep -i content-type
   ```

4. **Interpret** — cross-reference the result against [checks.md](references/checks.md) to know whether a 404 is a real gap or "doesn't apply to this site type."

## Per-check reference

Every check isitagentready.com runs, what it proves, which RFCs back it, and what a compliant response looks like:

See [checks.md](references/checks.md).

## How wcygan.net is wired

Auto-generation at build time produces `robots.txt`, `sitemap.xml`, and `rss.xml` with zero manual maintenance:

- `scripts/site-metadata-plugin.ts` — Vite plugin, runs on `closeBundle`
- `src/lib/sitemap/generators.ts` — pure builders (tested)
- Route file added to `src/routes/` → sitemap learns it automatically
- Post added to `src/posts/` → sitemap and RSS learn it from frontmatter

Full walkthrough, including the one constant to edit when AI-crawl stance changes:

See [wcygan-implementation.md](references/wcygan-implementation.md).

## Non-code levers (Cloudflare dashboard)

Two agent-ready features are Cloudflare Pages toggles, not code changes:

- **Markdown for Agents** — returns rendered HTML as Markdown when `Accept: text/markdown` is sent
- **AI Crawl Control** — bot-level allow/deny that overrides whatever robots.txt says

See [cloudflare-dashboard.md](references/cloudflare-dashboard.md) for where to click.

## Scope guard

This skill is a reference, not a retrofit plan. For a personal blog, almost every failing isitagentready check does not apply — do not implement OAuth discovery or MCP cards on a static blog just because the scan shows 404. Use the decision matrix above before writing code.
