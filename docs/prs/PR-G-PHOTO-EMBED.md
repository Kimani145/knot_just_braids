# PR-G: Make TikTok Photo Posts Play on Storefront via Official Profile (Iframe Only) with Safe Fallback

## 1. Summary of Changes
- **Iframe Profiles (`src/utils/tiktokProfiles.js`):**
  - Implemented pure `TIKTOK_IFRAME_PROFILES` defining `official-player` (V1 winner), `official-player-sandboxed` (V2), `minimal-player` (V4), `embed-v2` (V5), and `link-only`.
  - Added pure ID validation (`^\d{10,25}$`) and session-level failure caching (`markPostFailed`, `isPostFailed`, `clearPostFailure`).
- **Strategy Selection (`src/utils/tiktokStrategy.js`):**
  - Updated default `PHOTO_EMBED_STRATEGY` to `'official-player'` (the empirical lab winner).
  - Maintained environment variable kill switch `VITE_TIKTOK_PHOTO_STRATEGY`.
- **Storefront Player Component (`src/components/client/TikTokPlayer.jsx`):**
  - Fixed the shared-iframe sandbox flaw: now resolves iframe config per-profile.
  - Implemented runtime ladder: facade -> tap -> loading -> ready; on error or 8s timeout -> in-slide fallback card.
  - Session failure cache avoids repeated failed loads for problematic posts.
  - Strict security: `event.origin === 'https://www.tiktok.com'` and `event.source === iframeRef.current.contentWindow` and envelope verification.
  - Audio unmount guarantee on modal close or slide switch.
- **Quick View Modal (`src/components/client/ProductQuickView.jsx`):**
  - Photo posts are slides again when embedding is enabled (`PHOTO_EMBED_STRATEGY === 'official-player'`).
  - Strict `rel="noopener noreferrer"` on all links.
- **Admin Guidance (`src/components/admin/VideoLinksField.jsx` & `src/utils/catalogLint.js`):**
  - Replaced "cannot embed photo posts" warning in admin with confirmation of interactive gallery playback.
  - Softened catalog lint rule `photo-post-without-images` to a helpful nudge ("own photos load fastest").
- **Evidence & Documentation:**
  - Preserved empirical browser test data in `docs/research/lab-logs/browser-2026-10-22.json`.
  - Preserved lab harness in `docs/research/lab/tiktok-lab.html`.
  - Rewrote `docs/research/tiktok-photo-embeds.md` and `docs/adr/0001-tiktok-photo-embeds.md`.

---

## 2. 10-Line Owner Verification Checklist (Phone / Browser)
1. Open the storefront on your phone or desktop browser.
2. Tap to open Quick View on a photo-post hairstyle (e.g., Sisterlocs N-R, Knotless Box Braids N-R).
3. Confirm the carousel dot indicator includes the photo post slide with an image badge.
4. Tap the "Tap to View Photos" facade button on the slide.
5. Notice that TikTok connects and loads the official player without 3002 autoplay errors.
6. Verify that the TikTok swipeable photo carousel hydrates and renders full images.
7. Swipe horizontally through the hairstyle photos directly inside the Quick View modal.
8. Check that music/audio starts muted and unmutes properly if toggled.
9. Close the Quick View modal and verify that audio stops immediately (clean unmount).
10. Open a standard video post (e.g. video control styles) to ensure regular TikTok videos continue playing without regressions.

---

## 3. Verification & Metrics
- **Unit Test Suite:** 169 tests passing across 27 suites (0 failures).
- **Security Static Guard:** Passed with 0 banned patterns (0 remote scripts, 0 innerHTML).
- **ESLint:** 0 errors, 0 warnings across entire `src/` tree.
- **Vite Production Build:** Completed in 11.29s; main bundle size ~127 kB (virtually 0 kB delta).
