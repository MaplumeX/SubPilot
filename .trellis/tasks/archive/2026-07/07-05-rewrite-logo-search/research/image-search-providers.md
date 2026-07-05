# Image search providers — scraping approach (zero API key)

## Decision

Provider choice: **DuckDuckGo `i.js` (primary) + Brave image search HTML (fallback)**. No API keys, no quota. Same architecture as Wallos `endpoints/logos/search.php`.

## DuckDuckGo image search — current working flow (verified 2026-07)

### Step 1 — get `vqd` token
```
GET https://duckduckgo.com/?q=<query>&ia=images
```
- Response is HTML; extract `vqd` via regex.
- Wallos regex: `/vqd="?([\d-]+)"?/`
- More robust patterns seen in the wild (use one of these as a fallback chain):
  - `/vqd=([0-9-]+)\&/i`
  - `/["']vqd["']\s*[:=]\s*["']([^"']+)["']/i`
  - `/vqd:\s*["']([^"']+)["']/i`
- Some implementations POST to `https://duckduckgo.com/` with `data={q: query}` instead of GET; both work, GET is simpler.

### Step 2 — fetch image JSON
```
GET https://duckduckgo.com/i.js?l=us-en&o=json&q=<query>&vqd=<vqd>&f=,,transparent,Wide,&p=1
```
Headers:
```
Accept: application/json
Referer: https://duckduckgo.com/
```
- `f=,,transparent,Wide,` biases toward transparent-background wide images (good for logos).
- Response JSON has `results[]` with fields: `thumbnail`, `image`, `width`, `height`.

### Gotchas
- **202 Ratelimit**: DDG soft-blocks aggressive clients with HTTP 202 + empty body. Back off with jitter; pace requests.
- **`vqd` regex fragility**: DDG changes HTML format occasionally; use a multi-pattern fallback chain, not a single regex.
- **ddgs rename**: the popular `duckduckgo-search` lib is now `ddgs` (`pip install ddgs`); we are NOT depending on it, but worth noting if we ever want a lib.
- **`html.duckduckgo.com/html/`**: returns a server-rendered HTML SERP and skips the `vqd` handshake entirely. Could be a lower-fragility fallback if `i.js` breaks, but returns text results (not images) — not directly useful for logo search.

## Brave image search — fallback

```
GET https://search.brave.com/images?q=<query>
```
Headers:
```
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Referer: https://search.brave.com/
```
- No JSON API; parse HTML with a DOM parser.
- Iterate `<img>` tags; filter out:
  - `class` containing `favicon` or `logo` (Brave UI chrome)
  - `cdn.search.brave.com` (Brave UI assets)
  - invalid URLs
- No `width`/`height` available from Brave HTML — return `null` for those fields.

## SSRF protection (mandatory for both providers)

Wallos `includes/ssrf_helper.php` reference implementation:
1. Host allowlist: `['duckduckgo.com', 'search.brave.com']` only.
2. `gethostbyname()` → resolve to IP.
3. Reject IP if private/reserved (`FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE`) or CGNAT (`100.64.0.0/10`).
4. Pin resolved IP via `CURLOPT_RESOLVE` equivalent so the request uses the validated IP (prevent TOCTOU).

### Python/httpx equivalent
- `socket.gethostbyname(host)` for DNS resolution.
- `ipaddress.ip_address(ip).is_private / is_reserved / is_loopback / is_link_local` — but `is_global` is stricter and covers most cases; still need a manual CGNAT check since `ipaddress` does NOT flag `100.64.0.0/10` as private.
- CGNAT check: `ipaddress.ip_address('100.64.0.0') <= ip <= ipaddress.ip_address('100.127.255.255')` (or a custom `ipaddress.ip_network('100.64.0.0/10')` membership test).
- httpx pinning: build an `httpx.HTTPTransport`/`AsyncHTTPTransport` with a custom `resolver` that returns the validated IP, OR set `extensions` to pin the IP. Simplest portable approach: rewrite the URL host to the validated IP and inject a `Host` header — but that breaks SNI/TLS. Better: use `httpx.Client(transport=httpx.HTTPTransport(resolver=lambda host, port: [(socket.AF_INET, (validated_ip, port))]))` so the TLS SNI still uses the original host while connecting to the validated IP.

## Candidate normalization shape

Both providers map to the same JSON:
```json
{
  "thumbnail": "<url>",
  "image": "<url>",
  "width": 123,
  "height": 456
}
```
For Brave, `width`/`height` are `null`.

## Risk register

| Risk | Mitigation |
|------|------------|
| DDG changes `vqd` HTML format | Multi-pattern regex fallback chain; on failure, fall through to Brave |
| DDG 202 ratelimit | Pace requests; on 202/empty, fall through to Brave |
| Brave HTML structure changes | Same — both are best-effort; on total failure return `{results: []}` (200, not 500) |
| Logo images are large/varied | `cache-logo` endpoint validates content-type + size before saving |
| Upstream logo URL itself is an SSRF vector | `cache-logo` re-applies the same SSRF guard (allowlist relaxed to the image host? see open question) |

## Open question (carried to PRD)

`cache-logo` downloads an arbitrary remote image URL chosen by the user. The SSRF host allowlist used for search (`duckduckgo.com`, `search.brave.com`) is too restrictive — the image URLs returned by DDG/Brave point to arbitrary CDN hosts (`tse*.mm.bing.net`, `external-content...`, etc.). Options:
- **(a)** Allowlist a broad set of known image CDNs — brittle, misses long tail.
- **(b)** Allow any HTTPS host but keep the private/CGNAT IP filter + DNS pin — blocks SSRF to internal IPs while allowing real image CDNs.
- **(c)** Don't allowlist; fetch with redirects disabled and only follow `http://`/`https://` to a single hop, still applying the IP filter per hop.

Recommended: **(b)** — keep the IP filter (the actual SSRF defense), drop the host allowlist for `cache-logo` only. The allowlist for `search-logo` stays tight because those calls always go to DDG/Brave.