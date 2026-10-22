# ADR 0001: TikTok Photo Post Strategy & Secure Storefront Integration (PR-G)

**Status:** Accepted  
**Date:** 2026-10-22  
**Re-test Date:** 2026-11-20  

---

## 1. Context & Technical Clarifications

### Correction of Previous False Hypotheses
Earlier internal research erroneously asserted that TikTok's `/player/v1/{id}` endpoint was "designed strictly for video" and would inevitably fail in-browser with error `1001`.

Empirical browser lab testing on 2026-10-22 (`docs/research/lab-logs/browser-2026-10-22.json`) proved that:
1. **Photo Carousel Playback Confirmed:** Variant V1 (TikTok's official oEmbed iframe configuration without the sandbox attribute) successfully hydrated the photo carousel, emitting `onPlayerReady`, `onStateChange`, `onCurrentTime`, and `onImageChange`. The owner visually confirmed playback (`seen: true`).
2. **Root Cause of Previous Failures (The Shared-Iframe Sandbox Flaw):** Previous implementations in `TikTokPlayer.jsx` applied a 5-flag `sandbox` attribute (`allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox`). In-browser testing showed that TikTok's player script fails hydration when sandboxed, throwing `onPlayerError 3002 (AUTOPLAY_ERROR)` (Variants V3/V4) or timing out (Variant V2).
3. **Official Markup Contains No Sandbox:** TikTok's canonical oEmbed response for rewritten video/photo URLs deliberately omits the `sandbox` attribute, relying on standard cross-origin process isolation, `referrerPolicy="strict-origin-when-cross-origin"`, and explicit feature policy permissions (`allow="..."`).

---

## 2. Decision

### Primary Strategy: `PHOTO_EMBED_STRATEGY = 'official-player'` (V1 Winner)

1. **Adoption of Winning Profile (`official-player`):**
   - Photo posts and video posts use the verified official oEmbed iframe structure:
     `https://www.tiktok.com/player/v1/{id}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1`
   - Explicit feature policy:
     `allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"`
   - Referrer policy: `referrerPolicy="strict-origin-when-cross-origin"`
   - `sandbox`: `null` (omitted from DOM element)

2. **Justification for Omitting the `sandbox` Attribute in Variant V1:**
   - **Process & Origin Boundary Isolation:** Cross-origin `<iframe>`s from `https://www.tiktok.com` run in a completely isolated process and origin sandbox enforced by the browser. TikTok code inside the iframe cannot access the host page DOM, `localStorage`, `sessionStorage`, or cookies under any circumstances.
   - **Upstream Compatibility:** TikTok's official oEmbed markup itself omits the `sandbox` attribute. Restricting the iframe with a sandbox attribute breaks TikTok's internal postMessage messaging and media element hydration, resulting in `3002 AUTOPLAY_ERROR` or infinite loading states.
   - **Strict Host Application Isolation:** The host page never loads third-party scripts (`embed.js` is banned) and never parses remote HTML (`innerHTML`, `createContextualFragment`, `dangerouslySetInnerHTML` are banned).

3. **Runtime Ladder & Session Failure Cache:**
   - Facade button renders first; zero network requests to TikTok occur before the user taps.
   - Preconnect occurs only on `onPointerDown` / `onMouseEnter`.
   - On tap: if the post ID was previously marked as failed in this session, immediately render the in-slide fallback card without waiting.
   - Otherwise, render the iframe and start an 8-second timer.
   - If `onPlayerReady` arrives: show the player.
   - If `onPlayerError` or 8s timeout occurs: mark post failed in `sessionStorage` and show in-slide fallback card with the item's own photos (or bare placeholder) and ONE "View on TikTok ↗" link (`rel="noopener noreferrer"`).
   - Clean unmounting: when the modal closes or active slide changes, the iframe is unmounted, immediately stopping audio and clearing all timers.

4. **Security & Validation Non-Negotiables:**
   - Strict ID validation: `^\d{10,25}$`. Never call `Number(id)`.
   - Strict postMessage checks:
     `event.origin === 'https://www.tiktok.com'` AND `event.source === iframeRef.current.contentWindow` AND validate `event.data['x-tiktok-player'] === true`.
   - All external links use `rel="noopener noreferrer"`.
   - Static guard test (`tests/security-static-guard.test.js`) remains 100% green.

5. **Kill Switch:**
   - Environment variable `VITE_TIKTOK_PHOTO_STRATEGY` allows instant fallback to `link-only`, `official-player-sandboxed`, `minimal-player`, or `embed-v2` without code modification.

6. **Photo Carousel Controls & Race Prevention (PR-H):**
   - **Race Prevention via Parameter Tuning:** Photo posts omit `autoplay=1` and pass `music_info=0&description=0&muted=1&volume_control=0`. On `onPlayerReady`, the host immediately sends a `pause` command.
   - **Auto-Advance Guard:** If TikTok emits an automated `onImageChange` within 3s of player ready without user action, the guard dispatches `navigateTo(0)` once to anchor on photo 1.
   - **Host Navigation Controls:** 44px Prev/Next buttons, live region ("Photo X of N"), and lazy end-detection (~700ms timeout on forward navigation) discover total photos $N$ without relying on unexposed TikTok properties.
   - **Throttling & Validation:** Host-to-player postMessage commands are throttled to 150ms with strict `'https://www.tiktok.com'` target origin; incoming indices are validated as non-negative integers.

---

## 3. Consequences

### Positive
- **Working Photo UX:** TikTok photo posts play directly inside the storefront with reliable host navigation and no auto-advance race conditions.
- **Fail-Safe Reliability:** If TikTok blocks embedding for a specific post, the application falls back gracefully to customer photos and a direct link.
- **Zero Host Origin Vulnerability:** Third-party scripts are completely excluded from the host origin.

### Verification Matrix
- All 183 unit tests passing (`npm run test:unit`).
- ESLint clean with 0 errors across `src/`.
- Production bundle size remains optimal (~131 kB main bundle).
