# PR-H: Photo-Post Carousel Without Races & Robust Host Navigation Controls

## 1. Summary of Changes

- **Kind-Aware Photo Profile (`src/utils/tiktokProfiles.js`):**
  - Updated `official-player` and `official-player-sandboxed` `buildSrc` functions to branch by `kind`.
  - For `kind === 'photo'`: sends `embed_from=oembed&music_info=0&description=0&muted=1&volume_control=0` (omitting `autoplay=1` which was causing automated background playback races per LAB2_RESULT).
  - For `kind === 'video'`: retains full standard video playback parameters (`autoplay=1&muted=1`).

- **Primary Navigation Controls (`src/components/client/TikTokPlayer.jsx` & `src/utils/photoCarousel.js`):**
  - Implemented custom host-driven navigation buttons (Prev / Next) outside the iframe with 44px minimum touch targets and explicit `aria-label`s.
  - Implemented live counter `<span className="tiktok-photo-counter" aria-live="polite">` showing "Photo X" or "Photo X of N".
  - Implemented dot indicators once total photos count $N$ is discovered.
  - Keyboard navigation: supports `ArrowLeft` and `ArrowRight` when photo controls are focused.

- **Lazy End-Detection (`src/utils/photoCarousel.js`):**
  - Since TikTok's player does not expose total photo count $N$, end detection is performed lazily: if a forward `navigateTo(idx+1)` produces no `onImageChange` within 700ms (`END_DETECTION_TIMEOUT_MS`), the carousel marks the end boundary (`totalPhotos = maxIndexSeen + 1`, `isAtEnd = true`).
  - Next button is disabled once the end is reached; Prev button is disabled at photo 1 (index 0).

- **Auto-Advance Guard (`src/utils/photoCarousel.js`):**
  - On `onPlayerReady`, host immediately sends `pause` command to prevent background audio playback.
  - If TikTok fires an automated `onImageChange` within 3 seconds of player ready without user action, the auto-advance guard triggers and dispatches `navigateTo(0)` once to anchor playback on photo 1.
  - Any user interaction (Prev, Next, dot click, keyboard) immediately cancels the guard.

- **Messaging Safety & Throttling (`src/utils/photoCarousel.js`):**
  - Host-to-player commands are strictly posted with target origin `'https://www.tiktok.com'`.
  - Commands are throttled to a maximum of one per 150ms (`COMMAND_THROTTLE_MS = 150`).
  - Incoming `onImageChange` values are strictly validated as non-negative integers below 100.

- **Layout & Desktop Sizing (`src/components/client/ProductQuickView.jsx` & `src/index.css`):**
  - Added `.carousel-photo-mode` class when active slide is a photo post, providing `clamp(360px, 62dvh, 560px)` carousel height.
  - Sized photo iframe to a clean 9:16 aspect ratio box (`width: min(100%, calc((var(--photo-h) - 58px) * 9 / 16))`), eliminating wide black bars on desktop.
  - Positioned outer slide navigation arrows above TikTok controls (`top: 35%`) to prevent overlap on narrow viewports.

---

## 2. 10-Line Owner Verification Checklist (Phone / Browser)

1. Open the storefront on your phone or desktop browser.
2. Tap to open Quick View on a photo-post hairstyle (e.g., Sisterlocs N-R, Knotless Box Braids N-R).
3. Tap the "Tap to View Photos" button on the photo post slide.
4. Verify that the player hydrates and stays firmly anchored on Photo 1 without jumping to the last photo.
5. Tap the "Next" button in our photo controls: verify it advances smoothly to Photo 2 and updates the live counter.
6. Tap the "Previous" button: verify it navigates back to Photo 1; verify "Previous" becomes disabled at Photo 1.
7. Tap "Next" repeatedly until reaching the end: verify that after the last photo, the "Next" button disables and dots reflect total photos.
8. Tap on any dot indicator: verify TikTok immediately navigates directly to that selected photo.
9. Close the Quick View modal or switch slides: verify playback and audio terminate immediately.
10. Open a standard video post: verify regular TikTok video playback and audio controls work as expected without regressions.

---

## 3. Verification Matrix

- **Unit Test Suite:** 183 / 183 tests passing across 28 suites (0 failures).
- **Security Static Guard:** Passed with 0 violations (0 remote scripts, 0 innerHTML).
- **ESLint:** Clean with 0 errors and 0 warnings across `src/`.
- **Vite Production Build:** Clean build in 6.09s (bundle size delta +4.8 kB raw / +1.3 kB gzip for complete photo carousel navigation subsystem).
