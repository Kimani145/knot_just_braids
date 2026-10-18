# PR: WS9 Admin Monolith Modularization

## Summary
Deconstructs the 2,050-line `src/components/admin/AdminView.jsx` monolith into discrete, highly cohesive sub-components located in `src/components/admin/sections/`:
1. **`SalonManager.jsx`:**
   - Encapsulates hair style management, creation form validation, variant configuration, pricing type toggling (fixed vs. range), duration input, image upload and gallery republishing, TikTok video linking, cover photo warnings, and inventory listing with edit/delete actions.
2. **`BeadManager.jsx`:**
   - Encapsulates beadwork product management, creation form, stock quantities, out-of-stock and low-stock warning banners, multi-image upload handling, TikTok video linking, and catalog listing.
3. **`BookingsManager.jsx`:**
   - Handles client appointment request rendering, status chip formatting (`pending`, `confirmed`, `declined`), client notes, customer reference photos, appointment confirmations, declines, and customer reminder triggers.
4. **`OrdersManager.jsx`:**
   - Handles customer order fulfillment rendering, item list summaries, total pricing, status chips (`pending`, `fulfilled`), fulfillment marking, and customer reminders.
5. **`InventoryQuickEditModal.jsx`:**
   - Modular sheet modal for editing product or salon prices, price ranges, descriptions, duration/stock, variants, images, and videos.
6. **`CatalogLintBanner.jsx`:**
   - Header banner notifying admins of catalog health inconsistencies (e.g. duplicate item names, missing cover photos, trivial price range spreads).
7. **`PhotoPreviewModal.jsx`:**
   - Modal dialog for inspecting high-resolution customer reference photos attached to appointment requests, with direct full-resolution view and download links.

## Key Changes
- `src/components/admin/AdminView.jsx`: Reduced from 2,050 lines to 1,172 lines (~43% reduction in file size), serving as a clean coordinator component managing high-level dashboard state, Firestore real-time subscriptions, and Joyride tours.
- `src/components/admin/sections/SalonManager.jsx`: Modular salon management section.
- `src/components/admin/sections/BeadManager.jsx`: Modular beadwork management section.
- `src/components/admin/sections/BookingsManager.jsx`: Modular bookings table section.
- `src/components/admin/sections/OrdersManager.jsx`: Modular orders table section.
- `src/components/admin/sections/InventoryQuickEditModal.jsx`: Modular quick-edit modal dialog.
- `src/components/admin/sections/CatalogLintBanner.jsx`: Modular catalog linting status bar.
- `src/components/admin/sections/PhotoPreviewModal.jsx`: Modular reference photo preview modal.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 78 passed, 0 failed.
- `npm run build`: Successful (0 chunk warnings, code-split admin chunk loads on demand).

## Risks & Rollback
- Risk: None. Refactor preserves 100% of DOM classes, styles, and behavioral contracts.
- Rollback: `git checkout feat/ws8-observability-privacy`.

## Human Steps
- None required.

## Dependency
- Stacked on: `feat/ws8-observability-privacy` (@ `f9cc13a`).
