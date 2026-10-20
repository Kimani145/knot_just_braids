# PR-A: Draft/Publish Schema, Visibility Guardrails & Internal Notes

## Summary
Enforces strict draft/publish isolation across the entire Knot Just storefront, checkout pipeline, booking system, WhatsApp conversational commerce channel, and admin console so that incomplete or placeholder items are never customer-visible or bookable.

### Key Capabilities
1. **Schema & Shared Predicate (`isPubliclyVisible`):**
   - Introduced `status: 'published' | 'draft'` and `internalNote: string` (admin-only) on `salon_styles` and `bead_products`.
   - Backward compatibility: absent/null/undefined status defaults to `'published'` for all legacy documents.
   - Authoritative shared predicate `isPubliclyVisible(item)` deployed across all catalog consumers.
2. **Publish-Time vs. Draft Validation:**
   - Drafts require only an item name (`name`). Descriptions, prices, and stock counts may be empty.
   - Publishing enforces complete catalog requirements: non-empty name, valid price (and `priceMax >= price` for ranges), non-empty description, and for beads an integer `stock >= 0`.
3. **Catalog Readers Filtered:**
   - Client Catalog Grids (`src/components/client/CatalogGrid.jsx`)
   - Client Storefront Feed (`src/App.jsx` -> `ClientView.jsx`)
   - Product Quick View Modal (`src/components/client/ProductQuickView.jsx`)
   - Serverless Catalog Endpoint (`server/core/catalog.js` / `api/catalog.js`)
   - Server Checkout Transaction Pipeline (`server/core/checkout.js`)
   - Server Salon Booking Pipeline (`server/core/booking.js`)
   - WhatsApp Assistant Context & Tools (`server/core/whatsapp.js`: `check_stock`, `start_order`, `getWhatsAppCatalogContext`)
4. **Admin Workspace Controls:**
   - Create and edit forms equipped with Draft/Published toggles and explicit "Save as Draft" action.
   - Prominent `Draft` badge on unlisted items in admin lists.
   - List filtering tabs: `All (N)`, `Published (N)`, and `Drafts (N)`.
   - Dedicated "Internal Note" textarea isolated from the customer-facing description.
5. **Catalog Lint - Placeholder Content Detection:**
   - New warning `placeholder-content` matching `/needs review|placeholder|owner to confirm|\bTBC\b|\bN-R\b/i`.
   - One-click in-app confirmed reversible bulk action: "Unpublish N flagged items" in `CatalogLintBanner.jsx` with an explicit dialog listing the exact item names before execution (no `window.confirm`).
   - Per-item "Move this text to internal note" action in `InventoryQuickEditModal.jsx` moving description verbatim to `internalNote`, clearing `desc`, and transitioning status to `draft`.

> [!IMPORTANT]
> **Presentation Control Disclaimer:** Firestore documents remain readable via client SDK until `/api/catalog` is the sole read path in production. Therefore, drafts act as a **PRESENTATION control**, not data confidentiality. Never place sensitive personal data or secrets in draft descriptions or internal notes.

## Catalog Readers Grep Audit
The following catalog readers were verified and audited:
- `server/core/catalog.js` (`fetchFullCatalog`): filters both `salonStyles` and `beadProducts` with `isPubliclyVisible`.
- `api/catalog.js`: serves `fetchFullCatalog`, returning only publicly visible items with edge CDN caching.
- `src/App.jsx` (`ClientView` prop passing): feeds `salonStyles.filter(isPubliclyVisible)` and `beadProducts.filter(isPubliclyVisible)`.
- `src/components/client/CatalogGrid.jsx`: applies `visibleItems = (items || []).filter(isPubliclyVisible)`.
- `src/components/client/ProductQuickView.jsx`: guards `activeItem` with `isPubliclyVisible(item)`.
- `server/core/checkout.js` (`processCheckout`): rejects cart line items with `NotFoundError` if `!isPubliclyVisible(product)`.
- `server/core/booking.js` (`processBooking`): rejects booking requests with `ValidationError` if requested style matches a draft.
- `server/core/whatsapp.js` (`check_stock` / `start_order` / `getWhatsAppCatalogContext`): strictly refuses drafts.

## Decision Log
- **D-A1: Isomorphic Predicate (`isPubliclyVisible`):** Exported from pure, zero-dependency `server/core/catalog.js` and mirrored via `src/utils/catalogVisibility.js` to ensure consistent logic between frontend bundle and Node serverless runtimes without bundler leakage.
- **D-A2: In-App Confirmation Sheet vs window.confirm:** Per mission security rules prohibiting `window.confirm`, implemented accessible in-app modal sheet rendering exact item names and confirmation buttons.
- **D-A3: Non-destructive Note Migration:** The "Move this text to internal note" helper transfers the customer description text verbatim to `internalNote`, clears customer description, and defaults status to draft, satisfying the requirement that drafts may have empty descriptions.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 112 passed, 0 failed across 23 test suites (+20 new tests in `tests/pr-a-draft-publish.test.js`).
- `npm run build`: Successful.
  - Client bundle: `dist/assets/index-D_-KbwnD.js` (120.69 kB / 34.32 kB gzip, delta +0.83 kB).
  - Admin bundle: `dist/assets/AdminView-BzkCZRf5.js` (80.99 kB / 19.34 kB gzip).
- Banned patterns grep: 0 matches for `dangerouslySetInnerHTML`, `window.alert`, `window.confirm`, `console.log`.

## Red-Team Verification
- **Draft Cart Forgery:** Attempting to checkout a draft product ID via `processCheckout` fails immediately with `NotFoundError: Product "..." was not found in catalog`.
- **Draft Booking Forgery:** Attempting to book an appointment with a draft style name or ID fails with `ValidationError: Style "..." is not currently available for booking`.
- **WhatsApp Channel Attacks:** `check_stock` returns `found: false`; `start_order` returns `error: Product not found or not available`.
- **Poisoned Firestore Docs:** Any item with unexpected status (`status: 'archived'`, `status: 123`, `status: false`) evaluates to `false` in `isPubliclyVisible`.

## Risks & Rollback
- **Risk:** Low. Legacy items without `status` remain published by default.
- **Rollback:** `git checkout main`.

## Human Steps
- After review and merge of PR-A, owner deploys to production and verifies that the 8 live items can be reviewed and managed in the admin UI.
