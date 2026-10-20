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
3. **oEmbed Resolver & Idempotent Script Loader (`src/utils/tiktokOembed.js`):**
   - Implements `fetchTikTokOEmbed` with in-memory caching and 8-second network abort timeout.
   - Idempotently loads `https://www.tiktok.com/embed.js` at most once per page.
   - Mounts oEmbed markup safely via `createContextualFragment` (respecting zero-`innerHTML` security constraints).
4. **Branded Fallback Card:**
   - When oEmbed is unavailable (e.g. sandboxed/restricted/offline), renders a branded card with cover photo, `@handle` badge, hairstyle title, and a prominent call-to-action: "View this hairstyle gallery on TikTok ↗".
5. **Admin Guidance (`VideoLinksField.jsx`):**
   - Added real-time inline hint when an admin enters a photo post link.

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
