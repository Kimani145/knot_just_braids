# PR: WS2 Catalog Correctness (Frontend-A)

## Summary
Enforces catalog data integrity across both hair styles and bead products:
1. Fixes the `price > priceMax` bug in the inventory quick-edit modal without silent clamping.
2. Achieves full price-range parity for salon styles across create forms, edit modals, and customer views.
3. Adds the `variant` field (e.g. "Hand-painted", "Original finish", "With extensions") to products and styles, displaying variant badges in StyleCard, quick view, and admin item rows.
4. Introduces deterministic catalog linting (`src/utils/catalogLint.js`) to flag duplicate names, shared names with price disparities lacking variants, trivial price range spreads, and missing cover images.
5. Replaces stored `priceDisplay` with dynamic runtime rendering via `formatPriceRange` across all views.
6. Equips the quick-edit modal with media management (images and TikTok video embeds).
7. Adds a discoverable, accessible asset deletion flow with in-app confirmation and active usage checks (warning if an image is referenced by published styles or products).

## Key Changes
1. **Quick-Edit Modal Hardening (`InventoryQuickEditModal` in `AdminView.jsx`):**
   - Added pricing type selector (`Fixed price` vs `Price range`).
   - Displays and validates `priceMax` when range pricing is active (`priceMax > price`), showing explicit validation messages without silent clamping.
   - Added `variant` input field with datalist suggestions.
   - Integrated `ImageUploader` (allowing single image upload for salon styles and multi-image upload for bead products) and `VideoLinksField`.
2. **Salon Range Parity:**
   - Added `pricingType` ('fixed' | 'range') and `priceMax` to `initialSalonForm`, salon creation UI, validation (`validateSalonField`), and Firestore persistence.
   - Salon styles with price ranges continue routing to the appointment booking flow seamlessly.
3. **Variant Support & Badges:**
   - Added `variant` field to both Salon and Bead forms and edit modals.
   - Styled `.badge-variant` for customer cards/quick views and `.a-variant-badge` for admin inventory rows.
4. **Deterministic Catalog Linting:**
   - Authored pure utility `src/utils/catalogLint.js` + unit tests `src/utils/catalogLint.test.js`.
   - Checks 4 invariants: duplicate items, shared names with differing prices lacking variants, trivial range spreads (diff <= 5 KES), and missing cover images.
   - Rendered collapsible `<CatalogLintBanner />` at the top of the admin inventory panel. All checks are non-blocking advisory warnings (no automatic destructive edits).
5. **Derived Price Formatting:**
   - Removed derived `priceDisplay` writes to Firestore from both `handleAddBead` and `handleAddSalon`.
   - Standardized client price rendering in `StyleCard.jsx`, `ProductQuickView.jsx`, and `AdminView.jsx` using `formatPriceRange(item.price, item.priceMax, item.pricingType)`.
6. **Asset Gallery Delete & Safety Check:**
   - Added a visible, discoverable `Delete` button on gallery asset cards.
   - Replaced browser `window.confirm` with an accessible in-app modal sheet.
   - Checks whether the asset URL is currently referenced by any hair style or bead product before deletion, displaying a prominent warning listing all referencing items.
   - Notifies the admin via `toast.success` and notes that physical Cloudinary image deletion is deferred until WS6.
   - Documented asset library behavior in `docs/RUNBOOK-HUMAN-STEPS.md`.

## Decision Log
- **No Silent Clamping:** In the edit modal, entering `price >= priceMax` triggers a clear validation error (`"Maximum price must be greater than minimum price."`), preventing silent corruption of merchant pricing intent.
- **Derived Display:** Stop writing `priceDisplay` to documents; old documents retain legacy values without conflict because mappers and components compute the string dynamically at render.
- **Advisory Linting:** Catalog linting is strictly deterministic and non-destructive, providing clear warnings without modifying database records behind the merchant's back.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 24 passed, 0 failed (+7 tests covering catalog linting).
- `npm run build`: Successful.
  - Baseline (WS1): 785.66 kB raw / 237.16 kB gzip
  - Post-WS2: 799.26 kB raw / 240.14 kB gzip (+13.6 kB raw / +2.98 kB gzip for admin catalog linting, edit modal media uploaders, variant badges, and deletion safety sheets).

## Risks & Rollback
- Risk: Low. Changes are purely additive to the admin UI and customer rendering. No breaking schema changes for legacy items lacking `variant` or `pricingType`.
- Rollback: `git checkout feat/ws1-rules-safety-net`.

## Human Steps
- None required immediately. Note that deleting metadata in the gallery does not remove files from Cloudinary until WS6.

## Dependency
- Stacked on: `feat/ws1-rules-safety-net` (@ `b01155b`).
