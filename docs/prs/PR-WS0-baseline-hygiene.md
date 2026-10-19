# PR: WS0 Baseline & Hygiene

## Summary
Establishes clean repository baseline, fixes all 8 pre-existing ESLint errors, removes orphaned backup files, adds security and agent operational documentation, introduces centralized `BRAND` constant, sets up GitHub Actions CI workflow, and initializes the ADR and human runbook skeletons.

## Key Changes
1. **ESLint Fixes (8 -> 0 errors):**
   - Removed unused `switchToAdmin` in `src/App.jsx`.
   - Wired `loadingBookings` and `loadingOrders` in `src/components/admin/AdminHistory.jsx` to render skeleton loading rows via `renderSkeletonRows`.
   - Removed unused `styleImageUrl` parameter in `src/components/modals/BookingSheet.jsx`.
   - Removed unnecessary regex escapes `\"` in `src/utils/emailService.js` and `src/utils/emailTemplates.js`.
   - Verified and ensured all interpolations in `src/utils/emailTemplates.js` (including `title`, `intro`, `BRAND.name`, and item details) are properly escaped with `escapeHtml()`.
2. **Artifact Cleanup:**
   - Deleted obsolete file `src/components/admin/AdminView.jsx.bak`.
3. **Environment & Brand Constants:**
   - Updated `.env.example` with complete configuration options (EmailJS, feature flags, serverless credentials, WhatsApp placeholders) with zero secrets.
   - Created `src/constants/brand.js` to ensure the brand name and colors are never hardcoded.
4. **CI & Operational Guides:**
   - Added `.github/workflows/ci.yml` running `npm ci`, `npm run lint`, `npm run test:unit`, and `npm run build` on Node 22.17.x with zero secrets.
   - Added `AGENTS.md` and `SECURITY.md`.
   - Initialized `docs/DECISIONS.md`, `docs/RUNBOOK-HUMAN-STEPS.md`, and `docs/ARCHITECTURE.md`.

## Decision Log
- **D1/D6:** Centralized brand tokens and template escaping logic without modifying legacy database records.

## Verification
- `npm run lint`: 8 errors -> 0 errors.
- `npm run test:unit`: 7 passed, 0 failed (Node native test runner).
- `npm run build`: Successful.
  - Baseline: 784.35 kB raw / 236.94 kB gzip
  - Post-WS0: 785.66 kB raw / 237.16 kB gzip (+1.3 kB raw due to safe email escaping helper and skeleton wiring).

## Risks & Rollback
- Risk: None. Changes are purely additive, fixing unused variables and syntax escapes.
- Rollback: `git revert` or checkout parent commit `54c2d52`.

## Human Steps
- None required for WS0.

## Dependency
- Base: `feat/tiktok-video-embeds` (@ `54c2d52`).
