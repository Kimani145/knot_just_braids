# PR: WS7 Performance & Code Splitting

## Summary
Optimizes client-side performance, network payload sizes, and asset loading for Kenyan mobile networks (360px viewport baseline, high data cost sensitivity):
1. **Dynamic Cloudinary Image Optimization (`src/utils/cloudinaryUrl.js`):**
   - Automatically injects modern format and compression parameters (`f_auto,q_auto`) and viewport-tailored maximum width caps (`w_450,c_limit` for product grid cards, `w_800,c_limit` for modal quick-view zoom, `w_120,c_limit` for shopping cart thumbnails).
   - Prevents shipping multi-megabyte unoptimized original images to mobile devices.
   - Non-Cloudinary or already transformed URLs are handled safely without regression.
2. **Native Lazy Loading & Async Decoding:**
   - Added `loading="lazy"` and `decoding="async"` across `StyleCard.jsx`, `ProductQuickView.jsx`, and `CartSheet.jsx`.
3. **Route & Monolith Code Splitting (`src/App.jsx`):**
   - Implemented `React.lazy()` with `<Suspense fallback={null}>` for heavyweight admin and legal routes (`AdminView`, `AdminLogin`, `PrivacyPolicy`, `TermsOfService`).
   - Customer-facing catalog and booking experience no longer loads admin dashboard components or the Joyride onboarding engine on initial page load.
4. **Vite Rolldown/Rollup Chunk Splitting (`vite.config.js`):**
   - Configured `manualChunks` to split vendor dependencies into separate cached bundles (`firebase-firestore`, `firebase-auth`, `admin-tour`, `vendor-react`, `vendor-icons`).
   - Completely eliminated the Vite build warning: `Some chunks are larger than 500 kB`.
   - Reduced main customer entry chunk from **822.92 kB raw** down to **111.63 kB raw (31.71 kB gzip)**.

## Key Changes
- `src/utils/cloudinaryUrl.js`: Transformation helper for responsive Cloudinary image URLs.
- `src/utils/cloudinaryUrl.test.js`: 4 unit tests covering transformation insertion, width caps, and non-Cloudinary passthrough.
- `src/components/client/StyleCard.jsx`: Injected `getOptimizedCloudinaryUrl(..., { width: 450 })` and `loading="lazy"`.
- `src/components/client/ProductQuickView.jsx`: Injected `getOptimizedCloudinaryUrl(..., { width: 800 })` and `loading="lazy"`.
- `src/components/modals/CartSheet.jsx`: Injected `getOptimizedCloudinaryUrl(..., { width: 120 })` and `loading="lazy"`.
- `src/App.jsx`: Lazy loaded `AdminView`, `AdminLogin`, `PrivacyPolicy`, and `TermsOfService` with Suspense.
- `vite.config.js`: Custom `manualChunks` grouping for Firebase, React, Lucide, and Joyride.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 66 passed, 0 failed (+4 tests covering `cloudinaryUrl` transforms).
- `npm run build`: Successful (0 chunks > 500 kB, main client chunk is 111.63 kB raw / 31.71 kB gzip).

## Risks & Rollback
- Risk: Lazy loaded components require network fetch when navigated to. Mitigated by lightweight bundles and instant Suspense fallback.
- Rollback: `git checkout feat/ws5c-api-checkout-cutover`.

## Human Steps
- None required.

## Dependency
- Stacked on: `feat/ws5c-api-checkout-cutover` (@ `fc72658`).
