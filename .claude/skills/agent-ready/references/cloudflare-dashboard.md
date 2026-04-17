# Cloudflare dashboard — the non-code levers

Two isitagentready.com checks are satisfied by Cloudflare Pages / Cloudflare settings, not by code in the repo. Document them here so future-you doesn't re-open the ticket looking for the commit that enables them.

## Markdown for Agents

**What it is.** When a request arrives with `Accept: text/markdown`, Cloudflare re-renders the page's HTML as Markdown and returns it with `Content-Type: text/markdown`. Human browsers still get HTML. LLMs asking for Markdown get ~3× fewer tokens to read the same content.

**Where to enable.**

- Cloudflare dashboard → your account → Pages → `wcygan-net` project → **Settings** → **AI Crawl Control** → **Markdown for Agents** → toggle on.
- No deploy needed. Takes effect in under a minute.

**Verify.**

```bash
curl -sI -H "Accept: text/markdown" https://wcygan.net/ | grep -i content-type
# Expected: content-type: text/markdown; charset=utf-8
```

**Docs.** [Markdown for Agents — Cloudflare docs](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)

## AI Crawl Control

**What it is.** Cloudflare's allow/block list for named AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, Google-Extended, Perplexity, etc.). Operates at the edge regardless of what `robots.txt` says, so it's a stronger signal than the txt file alone.

**Relationship to robots.txt.** robots.txt is a request — AI Crawl Control is an enforcement. They should not contradict each other. For wcygan.net, robots.txt says allow-all, so leave AI Crawl Control in "allow all" to match.

**Where to find.**

- Cloudflare dashboard → account → **AI Crawl Control** (top-level) or under the zone's **Security** tab.
- Per-crawler allow / block / challenge.

**Docs.** [AI Crawl Control — Cloudflare](https://developers.cloudflare.com/ai-crawl-control/)

## Why these aren't in code

Both are request-time transformations that live at Cloudflare's edge. Putting them in the repo would require either:

- Running a Worker (adds latency + a maintenance surface), or
- Shipping a Markdown version of every page alongside HTML (bloats the deploy and duplicates the source of truth).

The dashboard toggle delegates this to the platform — strictly better for a static site.

## When to check these

- After a new Cloudflare Pages project is created (toggles default off).
- If an isitagentready.com scan starts failing **Markdown for Agents** despite the toggle being on — likely a Cloudflare-side regression or account-level setting change.
- If the robots.txt AI posture flips from allow to deny, update AI Crawl Control at the same time so the two match.
