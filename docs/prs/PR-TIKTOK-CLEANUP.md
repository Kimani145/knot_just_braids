# PR: TikTok Security Hardening, Photo Post UX & Truthful Telemetry (`fix/tiktok-cleanup`)

**Base Commit:** `main` @ `46e0d6d`  
**Branch:** `fix/tiktok-cleanup`  

---

## 1. Summary of Changes

1. **SECURITY (W1):**
   - Completely excised third-party HTML execution (`createContextualFragment`, `mountOEmbedHtml`) and remote script execution (`https://www.tiktok.com/embed.js`).
   - Deleted `api/tiktok-oembed.js` and `src/utils/tiktokOembed.js`.
   - Added `tests/security-static-guard.test.js` strictly barring DOM injections and remote script loaders.
2. **TRUTH & RESEARCH (W0, W2, W7):**
   - Corrected false assertions: TikTok's official documentation defines `/player/v1/` as supporting `"video, image"` with carousel events (`onImageChange`, `navigateTo`) and defines error 1001 as `"Invalid Media ID, no video/photo found"`.
   - Logged live curl results (`docs/research/lab-logs/curl-oembed-results.json`): TikTok's public oEmbed service returns `HTTP 400` for all `/photo/` paths.
   - Discovered TikTok v2 Frontity web embeds (`https://www.tiktok.com/embed/v2/{id}`), which return HTTP 200 with complete embed markup.
3. **STRATEGY & ARCHITECTURE (W3):**
   - Implemented `PHOTO_EMBED_STRATEGY` in `src/utils/tiktokStrategy.js` with the safe default `'link-only'`, re-test date (`2026-11-20`), and kill-switch override via `VITE_TIKTOK_PHOTO_STRATEGY`.
   - Pure, validated URL builders: `buildPlayerSrc` (with parameter scoping per post kind), `buildEmbedV2Src`, and `buildWatchUrl`.
4. **CUSTOMER UX (W4):**
   - Under `link-only`, photo posts are **not** added as video slides, eliminating failing players and 8-second timeouts.
   - Items with uploaded images show those images in the carousel.
   - Items with NO images and only photo posts display `MediaPlaceholder` (bare) with a clear `"Photos on TikTok"` badge and description.
   - Under the carousel, exactly one calm link row is rendered: `"See the original photo post on TikTok ↗"` (`rel="noopener noreferrer"`, `target="_blank"`).
   - Preserved PR-B footer separation so disclosures and watch links never clip.
5. **ADMIN GUIDANCE & CATALOG LINT (W5):**
   - Added strategy-aware guidance in `VideoLinksField.jsx` with an `"Upload photos"` shortcut that scrolls to and focuses the image uploader.
   - Added `photo-post-without-images` rule in `catalogLint.js` with direct `"Add photos"` shortcut in `CatalogLintBanner.jsx`.
   - Renamed `public/tiktok-svgrepo-com (2).svg` to `public/tiktok-icon.svg`.
6. **PLAYER ROBUSTNESS & A11Y (W6):**
   - Strict postMessage validation (checks `event.origin === 'https://www.tiktok.com'`, `event.source === iframe.contentWindow`, and `event.data['x-tiktok-player'] === true`).
   - Clean audio unmounting whenever the modal closes or active slide changes.
   - Retry suppressed on permanent non-retryable error 1001.
   - Preconnect hint triggered only on user interaction (pointerdown / hover of facade).
7. **RED-TEAM AUDIT & LAB PROTOCOL (W8):**
   - Added `tests/red-team-tiktok.test.js` validating input sanitation, path traversal rejections, envelope checks, and video controls.
   - Published `docs/research/LAB-HUMAN-PROTOCOL.md` and `docs/runbook/TIKTOK-PHOTO-POSTS.md`.

---

## 2. Verification Results

| Check | Baseline (`main` @ `46e0d6d`) | Branch (`fix/tiktok-cleanup`) | Status |
| :--- | :---: | :---: | :---: |
| **Unit Tests** | 110 passed | **155 passed** across 26 suites | **PASS** |
| **ESLint** | 0 errors | **0 errors, 0 warnings** | **PASS** |
| **Production Build** | Clean (1.89s) | **Clean (5.64s)** | **PASS** |
| **Client Bundle Size** | 125.77 kB (raw) / 35.89 kB (gzip) | **124.60 kB (raw) / 35.47 kB (gzip)** | **SHRANK (-1.17 kB raw / -0.42 kB gzip)** |
| **Security Static Guard** | N/A | **0 violations** | **PASS** |
| **Banned Code Patterns** | 0 matches | **0 matches** | **PASS** |
| **Red-Team Attack Suite** | N/A | **7/7 passed** | **PASS** |

---

## 3. Rollback Plan
Reverting `fix/tiktok-cleanup` returns the application to the previous PR-E state on `main` (`46e0d6d`).
