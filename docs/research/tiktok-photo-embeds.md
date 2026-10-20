# Empirical Research Report: TikTok Photo-Post Embeds

## 1. Executive Summary & Conclusion
- **Research Question:** Why do TikTok photo-mode posts fail to embed in our storefront player, and is the failure caused by our parameters/sandbox or TikTok/creator restrictions?
- **Finding:** The failure is an **upstream limitation of TikTok's `player/v1/` endpoint**. As confirmed by TikTok Developer Documentation, `/player/v1/{id}` is a dedicated video streaming player. When supplied with a photo-mode carousel post, it returns error code `1001` (`INVALID_VIDEO`: "Invalid Media ID, or no video/photo found") or times out. Changing iframe sandbox permissions, query parameters, or CSS does not solve this because the limitation is upstream in TikTok's player.
- **Selected Resolution Strategy:**
  1. **Strict Content-Type Routing:**
     - `/video/<numeric-id>` → Official `/player/v1/{id}` iframe.
     - `/photo/<numeric-id>` → Official TikTok oEmbed first (`/api/tiktok-oembed?url={encoded_tiktok_url}`), degrading to a branded fallback card. **Strictly forbidden: routing photo posts to `/player/v1/`.**
     - Unknown / shortened URLs → Attempt oEmbed; on failure, render branded fallback card. Never route unknown URLs blindly to `/player/v1/`.
  2. **Error Code Mapping:**
     - Standardize error codes (`1001: invalid-or-unsupported-media`, `2001: embed-load-failure`, `3001: player-timeout`, `3002: player-runtime-failure`) with calm, non-alarming copy.
  3. **Branded Fallback Card:**
     - Display style cover image, creator handle (`@knot.justbraids`), caption, and a prominent CTA: "View this hairstyle gallery on TikTok ↗".
  4. **Why Unofficial Scraping / Private APIs Were Rejected:**
     - Scraping TikTok's web assets or reconstructing image carousels from reverse-engineered internal endpoints violates TikTok Terms of Service, risks IP blacklisting, breaks frequently on TikTok layout changes, and bypasses creator privacy controls. The combination of official oEmbed + graceful branded fallback is compliant, robust, and privacy-preserving.

---

## 2. Empirical Lab Setup & Control Test Results (R-A)
A local standalone testing harness was constructed in `/tmp/tiktok-lab/index.html` executing an iframe matrix against public posts of `@knot.justbraids`:

### Test Results on Known Control Posts:
| Post ID | Kind | Endpoint Tested | Outcome | Details |
|---|---|---|---|---|
| `7671327868349123848` | Video | `/player/v1/` | **SUCCESS** | Reached `onPlayerReady` in ~920ms. Video stream played smoothly. |
| `7682424844671012114` | Video | `/player/v1/` | **SUCCESS** | Reached `onPlayerReady` in ~1100ms. Controls and playback responsive. |
| `7681345289243905298` | Photo | `/player/v1/` | **FAILED** | Emits `onPlayerError` with `value: 1001` (`INVALID_VIDEO`). |
| `7679743513151655186` | Photo | `/player/v1/` | **FAILED** | Emits `onPlayerError` with `value: 1001` (`INVALID_VIDEO`). |
| `7681345289243905298` | Photo | `oEmbed` / Fallback | **SUCCESS** | Safely routes away from `/player/v1/`, displays branded gallery card with direct link. |
| `7679743513151655186` | Photo | `oEmbed` / Fallback | **SUCCESS** | Safely routes away from `/player/v1/`, displays branded gallery card with direct link. |

---

## 3. Official Documentation & oEmbed Request Specification (R-B)
Citations from TikTok Developer Documentation (Embed Player API & oEmbed):
- **oEmbed Request Format:**
  - Method: `GET`
  - URL: `https://www.tiktok.com/oembed?url={encoded_canonical_url}`
  - Example: `https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40knot.justbraids%2Fphoto%2F7681345289243905298`
- **Response Fields Consumed:**
  - `html`: Embedded blockquote markup.
  - `author_name`: TikTok creator handle.
  - `title`: Post caption.
- **Script Upgrade:**
  - Script URL: `https://www.tiktok.com/embed.js` (loaded lazily, once per page, via idempotent script loader).
- **Documented Error Codes for `/player/v1/`:**
  - `1001` (`INVALID_VIDEO`): "Invalid Media ID, or no video/photo found".
  - `2001` (`SERVER_ERROR`): Network or CDN delivery failure.
  - `3001` (`PLAYBACK_ERROR`): Client-side decoding or audio streaming error.
  - `3002` (`AUTOPLAY_ERROR`): Browser autoplay policy blocked playback.

---

## 4. Community Evidence (R-C)
- GitHub issues across open-source tools (e.g. `yt-dlp`, web embed wrappers) corroborate that TikTok's `player/v1/` endpoint treats photo-mode slideshows differently than video streams, and web embedding of carousels is unsupported via `/player/v1/`.
- Full script embeds (`embed.js`) require user activation to avoid unsolicited tracking cookies. Our facade + lazy resolution architecture maintains optimal performance and privacy.

---

## 5. Architectural Implementation
1. **Classifier:** Added `classifyTikTokUrl()` identifying `video`, `photo`, or `unknown`.
2. **Error Mapper:** Authored `src/utils/tiktokErrors.js` mapping `1001`, `2001`, `3001`, `3002`, and `unknown` to user-facing copy.
3. **Player Component (`TikTokPlayer.jsx`):**
   - Renders video posts in `/player/v1/` iframe with postMessage listener.
   - Strictly intercepts photo posts and routes them to oEmbed resolution with branded fallback card.
4. **Admin Guidance (`VideoLinksField.jsx`):**
   - Displays real-time help hint when an admin enters a photo-mode URL.

---

## 6. Photo oEmbed Fallback Regression: CORS and Embed Initialization

### Investigation & Root Cause Diagnosis
Direct terminal inspection against TikTok's live API confirmed two distinct technical constraints:
1. **Browser CORS Restriction:** Direct client-side `fetch('https://www.tiktok.com/oembed')` from a browser origin is subject to browser CORS policies.
2. **Upstream TikTok Photo Support:**
   Direct server-side verification using curl yielded:
   ```bash
   curl -i "https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40knot.justbraids%2Fphoto%2F7681345289243905298"
   ```
   **Response Observed:**
   ```http
   HTTP/2 400
   content-type: application/json; charset=utf-8
   {"message":"Something went wrong","code":400}
   ```
   In contrast, video posts return `HTTP 200` with full embed HTML and `access-control-allow-origin: *`.
   TikTok's current public oEmbed endpoint specifically returns `HTTP 400` when passed `/photo/` paths. When the path is forced to `/video/` for the same post ID, TikTok returns an iframe to `player/v1/` which then rejects with error `1001 INVALID_VIDEO`.

### Architectural Resolution
1. **Serverless Proxy Route (`api/tiktok-oembed.js`):**
   - Moved oEmbed resolution server-side.
   - Validates and canonicalizes TikTok URLs against strict patterns (`/@handle/(video|photo)/<id>`), eliminating open-proxy attack vectors.
   - Employs an 8-second `AbortController` timeout and in-memory caching (`Map`).
   - Normalizes error responses to `{ ok: false, reason: 'non-ok-status' | 'missing-html' | 'timeout' }`.
2. **Client-Side Integration (`src/utils/tiktokOembed.js`):**
   - Client calls `/api/tiktok-oembed?url=...` instead of calling TikTok directly.
   - Includes development-only diagnostic logging (`TikTokOEmbedFailureReason`).
   - Safely mounts embed HTML via `createContextualFragment`.
   - Idempotently loads and re-initializes `https://www.tiktok.com/embed.js` upon new blockquote insertion.
3. **Graceful Fallback Preservation:**
   - Because TikTok returns HTTP 400 for photo URLs, the client transitions cleanly to the branded fallback card (`role="region"` with creator handle, title, cover image, and direct link).
   - The user never experiences blank frames, broken images, or error 1001 crashes.
