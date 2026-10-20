# ADR 0001: TikTok Photo Post Embedding & Degraded State Architecture

## Status
Accepted

## Context
TikTok supports both standard video posts (`/@handle/video/{id}`) and photo carousels / slideshows (`/@handle/photo/{id}`).
Previously, the Knot Just storefront routed all TikTok IDs blindly to TikTok's official web player iframe endpoint:
`https://www.tiktok.com/player/v1/{id}`

However, TikTok's `/player/v1/` endpoint is designed strictly for short-form video streaming. When passed a multi-image carousel post, it returns player error `1001` (`INVALID_VIDEO`: "Invalid Media ID, no video/photo found") or times out.
The client previously discarded this error code, assumed slow connectivity, and showed a broken error card with duplicate external links.

## Decision
1. **Three-Way URL Classification:**
   - `/video/<numeric-id>` -> `"video"` -> `/player/v1/{id}` iframe.
   - `/photo/<numeric-id>` -> `"photo"` -> TikTok oEmbed (`/api/tiktok-oembed?url=...`) with branded fallback card. **Strictly forbidden: routing photos to `/player/v1/`.**
   - Unknown / shortened -> `"unknown"` -> Attempt oEmbed; on failure, render branded fallback card. **Never route unknown to `/player/v1/`.**
2. **Error Code Mapping:**
   - Map numeric postMessage codes (`1001`, `2001`, `3001`, `3002`) into normalized keys with calm, clear customer copy.
   - For permanent errors like `1001` (`invalid-or-unsupported-media`), suppress repeated retry loops.
3. **Graceful Fallback:**
   - Where oEmbed is blocked, unavailable, or times out (e.g. offline/sandboxed/restricted), render a serene branded fallback card with cover image, handle badge, item title, and an unclipped call-to-action: "View this hairstyle gallery on TikTok ↗".
4. **Zero Script Pollution / Privacy:**
   - Do not load `embed.js` until the user actively engages with an embed.
   - Ensure `embed.js` is loaded idempotently at most once per page.
   - Strictly reject any third-party tracking scrapers or unofficial reverse-engineered APIs.

## Consequences
- Photo posts never trigger the broken `1001` player state.
- Customers have a guaranteed, accessible path to view multi-photo galleries on TikTok.
- Store admins receive immediate inline validation feedback when adding photo-mode URLs.

---

## Photo oEmbed fallback regression: CORS and embed initialization

### Context & Diagnosis
Direct client-side invocation of `https://www.tiktok.com/oembed` was subject to browser cross-origin policy restrictions. Furthermore, direct inspection via curl demonstrated that TikTok's public oEmbed service currently returns `HTTP 400 {"message":"Something went wrong","code":400}` for `/photo/` posts, while serving `HTTP 200` with embed HTML for `/video/` posts.

### Resolution
1. **Serverless Proxy (`api/tiktok-oembed.js`):**
   Proxy all oEmbed requests through a lightweight Vercel serverless function (`GET /api/tiktok-oembed?url=...`). The function strictly validates and canonicalizes the TikTok URL, enforces an 8-second timeout, caches responses in memory, and strips unnecessary fields to return a clean `{ ok: boolean, html?: string, author_name?: string, title?: string }` shape.
2. **Browser Execution:**
   The browser calls `/api/tiktok-oembed` instead of TikTok directly, completely eliminating CORS failures.
3. **Embed.js Dynamic Re-initialization:**
   When oEmbed HTML is mounted, `loadTikTokEmbedScript()` ensures TikTok's `embed.js` is executed to transform the `.tiktok-embed` blockquote into an interactive card, handling multiple embeds on the same page.
4. **Fallback Guard:**
   When TikTok upstream returns HTTP 400 or missing HTML for photo posts, the component falls back to the branded gallery card, guaranteeing zero layout crashes or unhandled rejections.
