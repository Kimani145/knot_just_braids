# PR: WS3 Customer Media, Empty States, A11y (Frontend-B)

## Summary
Elevates the customer and merchant UI to production-grade quality, accessibility, and resilience:
1. **MediaPlaceholder Component (`src/components/common/MediaPlaceholder.jsx`):** Replaces raw customer-facing emoji placeholders with bespoke branded placeholders using warm tonal gradient backdrops, frosted chips, Lucide icons (`Play` for videos, `Scissors` for salon, `Gem` for beads), display typography, and variant pills.
2. **TikTok Photo Post & Parser Support:** Fully supports TikTok multi-photo posts (`/@handle/photo/<id>`) in regex parsing, validation, embedding, player badges, and admin inputs while preserving the `kind` field.
3. **Player Timeout & Failure Fallback:** Implements TikTok `postMessage` protocol listener (`onPlayerReady`, `onPlayerError`) with strict origin (`https://www.tiktok.com`) and source checks. Introduces an 8-second fallback timeout for slow Kenyan 2G/3G connections with a clear explanation, direct external watch link, and retry action.
4. **Adaptive Carousel Height & External Action Bar:** Carousel dynamically adjusts between 260px for images and `clamp(340px, 55vh, 460px)` for TikTok player embeds. Relocates the TikTok watch link outside the overflow-clipped carousel container so it is never obscured.
5. **Modal Accessibility & Focus Hardening:** Adds focus trap (Tab/Shift+Tab cycling), Escape key dismissal with stopPropagation, backdrop click discrimination, root inerting (`#root.inert = true`), and scroll-locking with layout-shift compensation across `ProductQuickView`, `BookingSheet`, `CartSheet`, `CheckoutSheet`, and `PolicyModal`.
6. **UI-Chrome Emoji Replacement:** Upgrades UI controls and action buttons across admin and storefront modals to crisp SVG icons from `lucide-react` (retaining user emoji inputs inside catalog database records).
7. **WCAG AA Contrast Fixes:** Resolves dark mode contrast issues by defining `--feed-text` and boosting dark-mode accent luminance (`--salon-accent: #7ebd76`, `--bead-accent: #8ac681`), elevating button text contrast above 8:1.

## Key Changes
1. **`MediaPlaceholder` Component:**
   - Authored in `src/components/common/MediaPlaceholder.jsx`.
   - Uses tonal gradient tokens (`.bg1`...`.bg6`, `.sg1`...`.sg6`), frosted icon chip, and item title.
   - Replaced customer-facing emoji fallbacks in `StyleCard.jsx`, `ProductQuickView.jsx`, `TikTokPlayer.jsx`, and `CartSheet.jsx`.
2. **TikTok Parser & Photo Posts:**
   - Updated `src/utils/tiktok.js` regex to accept both `video` and `photo` paths: `^/@handle/(video|photo)/(\d{10,25})/?$`.
   - Preserves `kind: 'video' | 'photo'` throughout parsing, sanitizing, and serialization.
   - Added photo post badges (`.badge-photo-overlay`, `.badge-video.badge-photo`, `Images` icon in `VideoLinksField.jsx`).
   - Added unit test cases for photo posts in `src/utils/tiktok.test.js`.
3. **TikTok Player Error & Timeout Handling:**
   - In `src/components/client/TikTokPlayer.jsx`, implemented postMessage listener with origin (`https://www.tiktok.com`), window source, and `x-tiktok-player` envelope checks.
   - Added 8-second timeout fallback state with "Watch on TikTok ↗" and retry button.
   - Guaranteed teardown/unmount on slide switch, item change, and modal dismissal.
4. **Adaptive Quick-View Layout:**
   - Transitioning smoothly between image aspect ratio and video player mode in `ProductQuickView.jsx`.
   - Placed `.quick-view-video-footer` outside the overflow-clipped carousel container.
5. **Modal Dialog Focus Trap & Inerting:**
   - Traps focus within modal sheets and restores focus to triggering elements upon dismissal.
   - Inerts background `#root` during modal presentation.
   - Dispatches Escape key listeners cleanly.
6. **WCAG AA Contrast Audit:**
   - Added `--feed-text: #ffffff;` in light mode and `#0f1510` in dark mode.
   - Adjusted dark mode accents to `#7ebd76` (Salon) and `#8ac681` (Bead), guaranteeing >8:1 contrast on both dark backgrounds and accent buttons.
7. **Admin Hints:**
   - Added non-blocking advisory note in Salon Form, Bead Form, and Quick-Edit Modal when videos are attached without a cover photo.

## Decision Log
- **TikTok Timeout Threshold:** Set to 8 seconds. This gives sufficient headroom on metered Kenyan 3G mobile networks before presenting the user with an actionable failure state and external fallback link.
- **Outside Video Action Bar:** Moving the external link outside the carousel track ensures users on touchscreens never get trapped or blocked by an unresponsive iframe.
- **Root Inerting:** Disabling background interaction via `#root.inert = true` prevents keyboard and screen reader leakage while keeping portal modals fully interactive.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 24 passed, 0 failed.
- `npm run build`: Successful (816.17 kB raw / 244.28 kB gzip).

## Risks & Rollback
- Risk: Low. Purely frontend enhancements with progressive fallbacks.
- Rollback: `git checkout feat/ws2-catalog-correctness`.

## Human Steps
- None required.

## Dependency
- Stacked on: `feat/ws2-catalog-correctness` (@ `7e8d8fc`).
