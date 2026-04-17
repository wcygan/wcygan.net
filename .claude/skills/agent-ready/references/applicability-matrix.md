# Applicability matrix — which checks matter for which sites

isitagentready.com scores every check equally, which is misleading. A 0/12 score on a personal blog can still mean the site is doing everything it should — many checks only exist for sites that don't look like a blog. This file is the "do I actually care?" lookup.

## The honest default for wcygan.net

| Check                    | Applies?           | Why                                                                                               |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| robots.txt               | ✅ yes             | Universal — every site should declare crawl policy.                                               |
| sitemap.xml              | ✅ yes             | Speeds up discovery for any multi-URL site.                                                       |
| RSS                      | ✅ yes             | Blog convention, humans and readers consume it.                                                   |
| Content Signals          | ✅ yes             | One-line opt-in/out that forks the site's AI posture.                                             |
| AI bot rules             | ✅ (implicit)      | `User-agent: *` covers all named AI crawlers; no per-bot config needed unless the stance differs. |
| Markdown for Agents      | ✅ yes (one-click) | Free on Cloudflare Pages; meaningfully cheaper/faster for LLM consumers.                          |
| Link headers (RFC 8288)  | ⚠️ low value       | Nothing to link to without an API catalog. Skip.                                                  |
| Web Bot Auth             | ❌ no              | Cryptographic bot-identity verification; only useful if differentiating bot traffic.              |
| OAuth discovery          | ❌ no              | No protected resources.                                                                           |
| OAuth Protected Resource | ❌ no              | Same.                                                                                             |
| API Catalog (RFC 9727)   | ❌ no              | No APIs.                                                                                          |
| MCP Server Card          | ❌ no              | No MCP server running here.                                                                       |
| Agent Skills index       | ❌ no              | No reusable skills to expose (yet — see "if scope expands" below).                                |
| WebMCP                   | ❌ no              | No in-page tools to register.                                                                     |
| x402 / UCP / ACP         | ❌ no              | No commerce.                                                                                      |

## Site-type quick reference

### Personal blog / portfolio

- Must: robots.txt, sitemap.xml, RSS, Content-Signal
- Nice: Markdown for Agents (dashboard toggle)
- Skip: everything else

### API-backed service (REST / GraphQL)

- Add to above: API Catalog (RFC 9727), OAuth discovery if auth is required, Link headers pointing at the catalog and docs
- Consider: MCP server card if the API has AI-agent consumers

### SaaS with AI tooling / in-app actions

- Add: MCP server card, WebMCP (experimental), Agent Skills index for reusable workflows

### E-commerce / marketplace

- Add: x402 for programmatic payments, UCP for catalog discovery, ACP for agent-driven transactions
- These are commerce-optional and not scored against discoverability.

## When the isitagentready score is misleading

The scanner assumes one rubric. A 0/12 on a site that legitimately doesn't serve APIs or sell anything is _expected_, not a failure. The right mental model:

> "Of the checks that apply to my site type, how many am I passing?"

For wcygan.net, the applicable-check count is roughly **5** (robots.txt, sitemap, Content-Signal, RSS via sitemap-ref, Markdown for Agents). Post-implementation we pass 4/5 in code + the fifth is a Cloudflare toggle.

## If scope expands

If wcygan.net ever grows:

- **Add an API** → implement API Catalog + OAuth discovery first.
- **Publish reusable Claude skills** → add Agent Skills index (would literally reference these SKILL.md files).
- **Ship an MCP server** (e.g., "search my blog") → add MCP Server Card.
- **Sell something** → x402 is the lightest-touch payment layer.

Do not pre-implement any of these. They are easy to add when a real use case appears; adding them speculatively is pure maintenance cost.
