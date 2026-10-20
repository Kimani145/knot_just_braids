# PR-C: TikTok Embed Routing, Photo Post oEmbed, and Error Mapping

## Summary
Resolves TikTok post embedding failures by separating video posts from photo-mode carousels, integrating official TikTok oEmbed resolution, and introducing comprehensive error telemetry mapping:
1. **Content-Type Classifier (`src/utils/tiktok.js`):**
   - Implemented `classifyTikTokUrl(url)` which categorizes inputs into `'video'`, `'photo'`, or `'unknown'`.
   - `/video/<id>` → routes to `/player/v1/{id}` iframe.
   - `/photo/<id>` → routes to TikTok oEmbed + branded fallback card. **Strictly forbidden: sending photo posts to `/player/v1/`.**
   - Unknown/shortened/malformed → resolves safely without blind player routing.
2. **TikTok Player Error Code Mapping (`src/utils/tiktokErrors.js`):**
   - Maps documented `onPlayerError` codes:
     - `1001`: `invalid-or-unsupported-media`
     - `2001`: `embed-load-failure`
     - `3001`: `player-timeout`
     - `3002`: `player-runtime-failure`
   - Replaces abrasive error alerts with calm, serene messaging. Suppresses infinite retry buttons on permanent failures.
3. **oEmbed Resolver & Idempotent Script Loader (`src/utils/tiktokOembed.js` & `api/tiktok-oembed.js`):**
   - Implements `fetchTikTokOEmbed` calling `/api/tiktok-oembed?url=...` serverless proxy (preventing browser CORS failure), with in-memory caching and 8-second network abort timeout.
   - Idempotently loads `https://www.tiktok.com/embed.js` and re-initializes TikTok embed processing across multiple mounts.
   - Mounts oEmbed markup safely via `createContextualFragment` (respecting zero-`innerHTML` security constraints).
4. **Branded Fallback Card:**
   - When oEmbed is unavailable (e.g. sandboxed/restricted/offline or upstream HTTP 400), renders a branded card with cover photo, `@handle` badge, hairstyle title, and a prominent call-to-action: "View this hairstyle gallery on TikTok ↗".
5. **Admin Guidance (`VideoLinksField.jsx`):**
   - Added real-time inline hint when an admin enters a photo post link.

---

## Photo oEmbed fallback regression: CORS and embed initialization

### Context & Empirical Diagnosis
Direct client-side invocation of `https://www.tiktok.com/oembed` was subject to browser CORS policies. Moreover, live empirical probing via curl established:
- **Photo URL:** `curl -i "https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40knot.justbraids%2Fphoto%2F7681345289243905298"` returns `HTTP/2 400 {"message":"Something went wrong","code":400}`.
- **Video URL:** `curl -i "https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40knot.justbraids%2Fvideo%2F7671327868349123848"` returns `HTTP/2 200` with full embed HTML and `access-control-allow-origin: *`.
- **Photo ID via /video/ URL:** returns an iframe to `player/v1/7681345289243905298` which then crashes with `1001 INVALID_VIDEO`.

Thus, upstream TikTok oEmbed currently does not serve blockquote HTML for `/photo/` paths. Moving oEmbed requests server-side eliminates CORS issues completely, handles future oEmbed support when TikTok enables it, and safely activates the branded fallback card when upstream returns 400 or lacks HTML.

### Resolution & Implementation
1. **Serverless Proxy (`api/tiktok-oembed.js`):**
   - Implemented `GET /api/tiktok-oembed?url=<encoded-url>`.
   - Strictly validates and canonicalizes the input URL against `tiktok.com` / `*.tiktok.com` and pattern `/@handle/(video|photo)/<id>` to prevent open-proxy misuse.
   - Enforces an 8-second `AbortController` timeout and caches responses in memory (LRU cap 200).
   - Strips upstream headers and returns a clean `{ ok: boolean, html?: string, author_name?: string, title?: string, thumbnail_url?: string }` payload.
2. **Client Integration (`src/utils/tiktokOembed.js`):**
   - Calls `/api/tiktok-oembed?url=...` instead of calling TikTok directly.
   - Development diagnostic logging via `console.info` (guarded by `import.meta.env?.DEV`).
   - Safely mounts markup via `createContextualFragment`.
   - Embed script loader dynamically re-invokes or injects `embed.js` to process new `.tiktok-embed` blockquotes.
3. **Resilient Fallback:**
   - If oEmbed response lacks valid HTML or upstream returns 400, cleanly transitions to the branded fallback card ("View this hairstyle gallery on TikTok ↗"). Photo posts are never routed to `/player/v1/`.

---

## Decision Log
- **Why route photo posts away from `/player/v1/`?**
  Empirical lab testing and TikTok developer documentation confirm that `/player/v1/` is a video stream player. Multi-image carousels trigger `1001 INVALID_VIDEO` or timeout. Bypassing `/player/v1/` for photos eliminates this failure mode entirely.
- **Why oEmbed + branded fallback instead of image scraping?**
  Unofficial scraping violates TikTok Terms of Service, is prone to breakage, and ignores creator privacy settings. Official oEmbed + branded fallback is 100% compliant and resilient.

---

## Verification & Test Results
- **Unit Tests:** `node --test src/utils/*.test.js tests/*.test.js`
  - 103 tests pass cleanly.
- **ESLint:** `eslint .` passed with 0 errors.
- **Production Build:** `vite build` completed cleanly in 1.67s.
- **Banned Patterns:** 0 matches for `console.log`, `dangerouslySetInnerHTML`, `innerHTML`, `window.alert`, `window.confirm`, `eval`.

---

## Rollback Plan
Reverting this commit returns TikTok embedding to direct `/player/v1/` iframes for all post kinds.
