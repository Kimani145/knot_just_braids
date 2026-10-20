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
   - `/photo/<numeric-id>` -> `"photo"` -> TikTok oEmbed (`https://www.tiktok.com/oembed?url=...`) with branded fallback card. **Strictly forbidden: routing photos to `/player/v1/`.**
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
