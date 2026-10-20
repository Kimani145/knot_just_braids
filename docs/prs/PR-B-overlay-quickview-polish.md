# PR-B: Overlay & Quick-View Polish (CLIENT)

## Summary
Resolves visual collisions and polish defects in the customer storefront's TikTok player, quick-view modal, and dark theme:
1. **Single Label Layer on Facade (`TikTokPlayer.jsx`, `MediaPlaceholder.jsx`):**
   - Added `bare` prop to `MediaPlaceholder` that renders the background styling and pattern without chips, video labels, or item title.
   - Used `bare` variant in `TikTokPlayer` facade when no cover image is provided, eliminating the duplicate overprinted text layers.
   - Standardized facade overlay: exactly ONE play affordance (`.tiktok-play-btn`), ONE title (`.tiktok-facade-title`), and ONE action hint (`.tiktok-facade-label` with "Tap to Play" or "Tap to View Photos").
   - Works cleanly across both cover-image and no-cover cases, for both video posts and photo carousel posts.
2. **Disclosure & Deduplicated External Link Moved Outside Rounded Frame (`ProductQuickView.jsx`, `TikTokPlayer.jsx`):**
   - Moved `.tiktok-disclosure` ("Plays from TikTok (third party). Privacy Policy") OUT of `.tiktok-facade-container` (which was clipped by `.quick-view-carousel`'s `overflow: hidden` and `border-radius: 1rem`).
   - Placed `.tiktok-disclosure` and a single deduplicated `.tiktok-watch-link` ("Watch on TikTok ↗" / "View Photos on TikTok ↗") in normal flow in `.quick-view-video-footer` below the carousel.
   - Removed the duplicate external watch link from inside `TikTokPlayer`'s error state panel, ensuring the link is rendered exactly once on screen.
3. **Dark Theme Color Scheme & Themed Thin Scrollbar (`src/index.css`):**
   - Added `color-scheme: dark;` to `[data-theme='dark']` (and `color-scheme: light;` to `:root`), preventing native white scrollbar flashes and ensuring native form controls respect dark mode.
   - Added themed thin scrollbars (`scrollbar-width: thin; scrollbar-color: var(--border) transparent;` with `-webkit-scrollbar` thumb/track definitions) for `.sheet` and quick-view modals.
4. **Responsive Viewport Verification (360px, 768px, 1280px):**
   - Tested in light and dark themes across mobile (360px), tablet (768px), and desktop (1280px) viewports with zero text overlap across idle, loading, ready, and error states.

---

## Decision Log
- **Why introduce a `bare` prop to `MediaPlaceholder` instead of hiding via CSS?**
  A pure component prop guarantees DOM cleanliness and screen reader accuracy (`aria-hidden="true"` on the background pattern container), preventing duplicate headings or labels from being announced to assistive technologies.
- **Why move the third-party disclosure below the carousel?**
  Inside the carousel track, `.tiktok-disclosure` was subject to slide overflow clipping and border-radius masks. Placing it in normal document flow below the carousel ensures WCAG compliance, clear visibility, and unclipped touch targets.
- **Why deduplicate the TikTok external link?**
  Previously, when a video timed out or failed to load, both the error panel and the footer rendered a "Watch on TikTok" link. Deduplicating it keeps the interface calm and concise.

---

## Verification & Test Results
- **Unit Tests:** `node --test src/utils/*.test.js tests/*.test.js`
  - 95 passing tests, including 3 new test suites in `tests/pr-b-overlay-quickview.test.js` verifying `color-scheme`, thin scrollbars, single facade label layer, and video footer deduplication.
- **ESLint:** `eslint .` passed with 0 errors.
- **Production Build:** `vite build` completed cleanly in 3.82s.
- **Banned Patterns:** 0 instances of `console.log`, `dangerouslySetInnerHTML`, `window.alert`, `window.confirm`, or `eval`.

---

## Responsive Viewport Verification (Light & Dark)
- **360px (Mobile Portrait):**
  - Facade overlay title truncates gracefully (`ellipsis`) if excessively long, play button remains centered at 56px (meeting 44px touch target guidelines).
  - Disclosure and external link render with comfortable vertical margins below the carousel.
  - Scrollbars inside the modal sheet render with thin 6px width in theme border tone (`#2d372f` in dark, `#d8dfd8` in light).
- **768px (Tablet):**
  - Carousel height scales smoothly within `clamp(340px, 55vh, 460px)`.
  - No overlap between slide navigation dots and video footer.
- **1280px (Desktop):**
  - Modal sheet max-width 620px is centered with soft shadow; thin scrollbar is accessible without visual clutter.

---

## Rollback Plan
Reverting this commit restores the original facade overlay and internal disclosure markup without affecting catalog data or database state.

