# ADR 0001: TikTok Photo Post Strategy & Secure Storefront Integration

**Status:** Accepted  
**Date:** 2026-10-21  
**Re-test Date:** 2026-11-20 (review after owner completes human lab protocol)  

---

## 1. Context & Technical Clarifications

### Correction of Previous False Assumptions
Earlier internal research erroneously asserted that TikTok's `/player/v1/{id}` endpoint was "designed strictly for video". Review of TikTok's official developer documentation ([developers.tiktok.com/doc/embed-player](https://developers.tiktok.com/doc/embed-player)) establishes:
1. **Supported Post Types:** Official docs explicitly list post types `"video, image"`.
2. **PostMessage Lifecycle & Image Messages:** The player documentation includes image-carousel specific messages, including `navigateTo` and `onImageChange`.
3. **Parameter Scope:** Parameters such as `autoplay`, `loop`, `progress_bar`, `play_button`, `timestamp`, `rel`, and `closed_caption` are officially documented as **video-only**.
4. **Error 1001 Definition:** Documented as `"Invalid Media ID, no video/photo found"`.

### Empirical Findings
Direct live probing with curl against TikTok's public endpoints confirmed:
1. **Official oEmbed Endpoint (`https://www.tiktok.com/oembed?url=...`):**
   - Returns `HTTP/2 400 {"message":"Something went wrong","code":400}` for all tested `/@knot.justbraids/photo/{id}` URLs.
   - When the URL path is rewritten from `/photo/{id}` to `/video/{id}`, oEmbed returns `HTTP/2 200` with an iframe pointing to `https://www.tiktok.com/player/v1/{id}?embed_from=oembed...`, which then fails in-browser with error `1001 INVALID_VIDEO`.
2. **TikTok v2 Embed Endpoint (`https://www.tiktok.com/embed/v2/{id}`):**
   - Live HTTP requests return `HTTP/2 200` with full Frontity/TikTok HTML markup designed for embeds.
   - However, `embed/v2` is undocumented in TikTok's public developer portal and emits no standardized postMessage lifecycle events.
3. **Data Constraint in Storefront:**
   - The 8 `... N-R` salon style documents currently have `assetUrl: ""` and zero uploaded images in Firestore.

---

## 2. Decision

### Primary Strategy: `PHOTO_EMBED_STRATEGY = 'link-only'` (Safe Default)
1. **Strict Origin Security:**
   - Zero execution of remote scripts (`embed.js` banned).
   - Zero remote HTML injection (`createContextualFragment`, `innerHTML`, `dangerouslySetInnerHTML` banned).
   - Enforced by `tests/security-static-guard.test.js`.
2. **Storefront UX Under `link-only`:**
   - Photo posts are **not** added as video slides in the quick-view modal.
   - If the item has uploaded customer images, the carousel renders those images cleanly.
   - If the item has no uploaded images and only photo posts, `ProductQuickView` renders a calm `MediaPlaceholder` with a clean "Photos on TikTok" affordance.
   - Underneath the carousel, exactly one calm link row is rendered: `"See the original photo post on TikTok ↗"` (`rel="noopener noreferrer"`, `target="_blank"`).
3. **Architecture for Future Strategies:**
   - Implemented `PHOTO_EMBED_STRATEGY` in `src/utils/tiktokStrategy.js` supporting:
     - `'link-only'` (active default).
     - `'embed-v2'` (mounts `https://www.tiktok.com/embed/v2/{id}` in sandboxed iframe).
     - `'player-v1'` (mounts `https://www.tiktok.com/player/v1/{id}` with documented image-only parameters).
   - Kill switch: Environment variable `VITE_TIKTOK_PHOTO_STRATEGY` allows instant strategy switching without code refactoring.
4. **Video Posts:**
   - Standard video posts continue using `/player/v1/{id}` iframe with full parameters and verified `onPlayerReady` / `onPlayerError` event handling.

---

## 3. Consequences

### Positive
- **Security:** Completely protects the application origin and Firestore admin sessions from third-party script injection or DOM tampering.
- **Reliability:** Eliminates false loading spinners, 8-second timeouts, and broken fallback cards.
- **Customer Experience:** Customers always see real pictures if uploaded, or a clean, non-alarming link to TikTok if not.

### Risks & Mitigations
- **Undocumented `embed/v2` Risk:** `embed/v2` remains an undocumented TikTok feature. It is isolated behind the feature flag and not enabled by default until verified through human browser testing across multiple mobile/desktop configurations.
