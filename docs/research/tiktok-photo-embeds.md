# Research Synthesis: TikTok Photo Post Embedding & Technical Evidence

**Date:** 2026-10-22  
**Author:** Knot Just Engineering  
**Evidence Source:** Verified browser lab log (`docs/research/lab-logs/browser-2026-10-22.json`), curl log (`docs/research/lab-logs/curl-oembed-results.json`), and lab harness (`docs/research/lab/tiktok-lab.html`).

---

## 1. Executive Summary & Root Cause Resolution

Earlier assertions hypothesized that TikTok's official `/player/v1/` endpoint was fundamentally incapable of playing photo-mode carousels and would uniformly fail with error 1001.

Rigorous empirical testing in a real browser on 2026-10-22 (`browser-2026-10-22.json`) directly disproved that hypothesis:
1. **Photo Carousel Playback Confirmed:** When rendered using TikTok's official oEmbed iframe configuration (**Variant V1**), TikTok photo posts successfully load, display image carousels, and emit `onPlayerReady`, `onStateChange`, `onCurrentTime`, and `onImageChange`. Human verification recorded `seen: true`.
2. **Root Cause of Previous Failures (The Shared-Iframe Sandbox Flaw):** Previous implementations in `TikTokPlayer.jsx` applied a restrictive 5-flag `sandbox` attribute (`allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox`) across all posts. In-browser testing showed that TikTok's player script fails hydration when sandboxed, throwing `onPlayerError 3002 (AUTOPLAY_ERROR)` (Variants V3/V4) or timing out (Variant V2).
3. **Official Markup Contains No Sandbox:** TikTok's canonical oEmbed response for rewritten video/photo URLs deliberately omits the `sandbox` attribute, relying on standard cross-origin process isolation, `referrerPolicy="strict-origin-when-cross-origin"`, and explicit feature policy permissions (`allow="..."`).

---

## 2. Empirical Test Results (Lab Matrix)

### A. In-Browser Verification Matrix (`docs/research/lab-logs/browser-2026-10-22.json`)

Tested on Chrome 151 / Linux x86_64 across 5 variants:

| Variant | Architecture | Query Parameters | Sandbox Attribute | Allow Permissions | Browser Outcome | Lifecycle Events | Winner |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- | :---: |
| **V1** | `/player/v1/{id}` | `embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1` | **None** (`null`) | Full official list | **READY / DISPLAYED** (`seen: true`) | `onPlayerReady`, `onStateChange`, `onCurrentTime`, `onImageChange` | **WINNER** |
| **V2** | `/player/v1/{id}` | `embed_from=oembed&...` | 5-flag app sandbox | Full official list | Inconsistent / timeout | `onPlayerReady` (stalled) | No |
| **V3** | `/player/v1/{id}` | Custom image params | 5-flag app sandbox | Full official list | **Failed** (`errorCode: 3002`) | `onPlayerError AUTOPLAY_ERROR` | No |
| **V4** | `/player/v1/{id}` | None (minimal) | 5-flag app sandbox | Full official list | **Failed** (`errorCode: 3002`) | `onPlayerError AUTOPLAY_ERROR` | No |
| **V5** | `/embed/v2/{id}` | `lang=en-US` | 5-flag app sandbox | Full official list | **Timed out** | No player events | No |

### B. Video Control Verification
Both video controls (`7671327868349123848` and `7682424844671012114`) were tested with Variant V1 and hydrated successfully with `ready` / `onPlayerReady`.

### C. Fresh Canonical oEmbed Markup
Fresh curl testing against TikTok's canonical oEmbed endpoint confirmed the official iframe markup:
```html
<iframe
  height="578"
  width="325"
  src="https://www.tiktok.com/player/v1/{id}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
  allowfullscreen
  loading="lazy"
></iframe>
```

---

## 3. Selected Production Strategy: `official-player`

Based on the empirical evidence:
1. **Default Strategy:** `PHOTO_EMBED_STRATEGY = 'official-player'`. Photo posts are rendered using the winning V1 configuration with official allow permissions and omitting the sandbox attribute.
2. **Safe Fallback Ladder:**
   - Display facade button initially (no third-party requests or tracking before user interaction).
   - Upon tap: render iframe with 8s timeout timer.
   - If `onPlayerReady` arrives: reveal the interactive carousel.
   - If `onPlayerError` or 8s timeout occurs: show in-slide fallback card with item's own photos (or bare placeholder) and ONE "View on TikTok ↗" link (`rel="noopener noreferrer"`).
   - Session Failure Cache: A failure is remembered in `sessionStorage` per post ID to prevent repetitive broken loads.
3. **Emergency Kill-Switch:** Configurable via environment variable `VITE_TIKTOK_PHOTO_STRATEGY` to instantly revert to `link-only` or other variants if needed.
