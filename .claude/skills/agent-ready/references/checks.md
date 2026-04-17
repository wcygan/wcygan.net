# isitagentready.com — per-check reference

Every check the scanner runs, grouped by category. For each: the endpoint(s), the spec, what passing means, and the typical failure mode.

## Discoverability

### robots.txt exists (RFC 9309)

- **Endpoint**: `GET /robots.txt`
- **Spec**: [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309)
- **Pass**: 200 with plain-text `User-agent:` + allow/deny directives.
- **Why agents care**: Machine-readable crawl policy; lets a well-behaved agent know what's off-limits.
- **Common failure**: 404 because Cloudflare Pages / static hosts don't synthesize one — must be present as a file.

### sitemap.xml exists

- **Endpoint**: `GET /sitemap.xml` (also `/sitemap_index.xml`, `/sitemap-index.xml`, `/sitemap.xml.gz`)
- **Spec**: [sitemaps.org](https://www.sitemaps.org/protocol.html)
- **Pass**: 200 with a valid `<urlset>` listing canonical URLs.
- **Why agents care**: Complete list of indexable URLs with `<lastmod>` for change detection. Faster than crawling.
- **Cross-reference**: robots.txt should declare `Sitemap: <url>` (RFC 9309 §2.2.4).

### Link headers (RFC 8288)

- **Endpoint**: `GET /` — examine response headers.
- **Spec**: [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288)
- **Pass**: `Link:` response header with `rel=api-catalog`, `rel=service-doc`, etc.
- **Why agents care**: In-band discovery pointers without parsing HTML.
- **Personal-blog relevance**: Low. Without an API, no meaningful relations to advertise.

## Content

### Markdown for Agents

- **Request**: `GET /` with `Accept: text/markdown`
- **Pass**: Response `Content-Type: text/markdown` with the page rendered as Markdown.
- **Why agents care**: LLMs tokenize Markdown far more efficiently than HTML; fewer tokens = cheaper, faster, more accurate.
- **Implementation**: Cloudflare Pages has a one-click toggle ([Cloudflare docs](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)). See [cloudflare-dashboard.md](./cloudflare-dashboard.md).
- **Header bonus**: Advanced implementations emit `x-markdown-tokens` with the token count.

## Bot Access Control

### Web Bot Auth request signing

- **Endpoint**: `GET /.well-known/http-message-signatures-directory`
- **Pass**: Directory of public keys for verifying signed bot requests.
- **Why agents care**: Cryptographic proof that a request is from a known agent (vs a scraper impersonating one).
- **Personal-blog relevance**: None. This is for sites that want to differentiate bot traffic.

### AI bot rules in robots.txt

- **Check**: `User-agent:` entries for `GPTBot`, `OAI-SearchBot`, `Claude-Web`, `Google-Extended`, etc.
- **Pass**: Explicit allow/disallow per AI crawler.
- **Note**: A generic `User-agent: *` satisfies them unless you want per-crawler policy. wcygan.net allows all.

### Content Signals in robots.txt

- **Directive**: `Content-Signal: search=yes|no, ai-train=yes|no, ai-input=yes|no`
- **Spec**: [contentsignals.org](https://contentsignals.org/), [IETF draft](https://datatracker.ietf.org/doc/draft-romm-aipref-contentsignals/)
- **Semantics**:
  - `search=yes` — allow indexing in search engines
  - `ai-train=yes` — allow use in model training
  - `ai-input=yes` — allow use as live context in an AI answer (RAG)
- **Author stance decision**: The three are independent. Common combos:
  - Blog meant to reach people: `search=yes, ai-train=yes, ai-input=yes`
  - Paid content: `search=yes, ai-train=no, ai-input=no`
  - Private docs: block everything with `Disallow: /`

## API, Auth, MCP & Skill Discovery

### API Catalog (RFC 9727)

- **Endpoint**: `GET /.well-known/api-catalog`
- **Spec**: [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727), [RFC 9264](https://www.rfc-editor.org/rfc/rfc9264) (linkset format)
- **Pass**: `application/linkset+json` with one entry per API, each listing `service-desc` (OpenAPI), `service-doc`, `status`.
- **Personal-blog relevance**: None — no APIs to catalog.

### OAuth / OIDC discovery (RFC 8414)

- **Endpoints**: `/.well-known/openid-configuration` or `/.well-known/oauth-authorization-server`
- **Spec**: [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414), [OpenID Connect Discovery](http://openid.net/specs/openid-connect-discovery-1_0.html)
- **Pass**: JSON with `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `grant_types_supported`.
- **Personal-blog relevance**: None. Only relevant if the site hosts an OAuth server.

### OAuth Protected Resource (RFC 9728)

- **Endpoint**: `GET /.well-known/oauth-protected-resource`
- **Spec**: [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728)
- **Pass**: Lists `resource` identifier, `authorization_servers`, `scopes_supported`.
- **Used for**: Telling an agent how to get a token for protected APIs on this host.

### MCP Server Card (SEP-1649)

- **Endpoints** (any of): `/.well-known/mcp/server-card.json`, `/.well-known/mcp.json`, `/.well-known/mcp/server-cards.json`
- **Spec**: [MCP PR #2127](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127) (in-flight)
- **Pass**: JSON with `serverInfo` (name, version), transport endpoint, capabilities.
- **Used for**: An agent discovering that this host speaks MCP and what it can do.

### Agent Skills index

- **Endpoints**: `/.well-known/agent-skills/index.json` (v0.2.0) or `/.well-known/skills/index.json` (legacy)
- **Spec**: [Cloudflare's Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc), [agentskills.io](https://agentskills.io/)
- **Pass**: JSON with `$schema` and a `skills` array, each entry having `name`, `type`, `description`, `url`, `sha256`.
- **Used for**: Publishing reusable prompts/workflows that an agent can download and apply.

### WebMCP (experimental)

- **Runtime check**: Page calls `navigator.modelContext.provideContext()` in JS.
- **Spec**: [WebMCP explainer](https://webmachinelearning.github.io/webmcp/), [Chrome blog](https://developer.chrome.com/blog/webmcp-epp)
- **Pass**: In-page JS registers tools (name, description, inputSchema, execute).
- **Used for**: An in-browser agent invoking site-specific actions without leaving the page.

## Commerce (all optional, not scored)

### x402 payment protocol

- **Check**: API returns HTTP `402 Payment Required` with payment instructions.
- **Used for**: Programmatic micropayments between agents and APIs.

### UCP profile

- **Endpoint**: `/.well-known/ucp`
- **Used for**: Universal Commerce Protocol — product/inventory discovery for shopping agents.

### ACP discovery document

- **Endpoint**: `/.well-known/acp.json`
- **Used for**: Agent Commerce Protocol — lets agents transact with your store programmatically.

## Authoring a fix via coding agent

Each failing check in the isitagentready UI includes a "coding agent" hand-off — a canned prompt referencing `https://isitagentready.com/.well-known/agent-skills/<check>/SKILL.md`. Those skills are the canonical "how to implement" per check and can be copy-pasted to any Claude Code / Cursor / Copilot session.
