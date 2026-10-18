# PR: WS5c Client API Checkout & Booking Cutover

## Summary
Implements feature-flagged client routing to backend `/api/checkout` and `/api/booking` endpoints:
1. **Feature Flag (`VITE_USE_API_CHECKOUT`):**
   - Controlled via `VITE_USE_API_CHECKOUT` (defaults to `false` in `.env.example`).
   - When `false`, the storefront maintains full backwards compatibility with existing browser-side Firestore `runTransaction` and `addDoc` flows.
   - When set to `true`, checkout and booking requests route directly to the backend API (`/api/checkout` and `/api/booking`).
2. **Server-Side Authoritative Checkout (`CheckoutSheet.jsx`):**
   - Transmits `{ clientName, clientEmail, clientPhone, address, lineItems, agreedToPolicy: true }` to `/api/checkout`.
   - The server verifies stock, validates cart items, re-prices line items from authoritative database records, atomically decrements stock, and returns `{ ok: true, orderId, order }`.
   - Directly displays typed error messages (e.g. `INSUFFICIENT_STOCK`) to the customer if another shopper claims the inventory first.
   - Triggers post-order confirmation email using the server-generated `orderId` and authoritative server total.
3. **Backend Appointment Booking (`BookingSheet.jsx`):**
   - When the feature flag is active, routes appointment requests to `/api/booking` with pre-validated data and signed reference photo URLs.
4. **API Client Integration (`src/services/api.js`):**
   - Exposes `isApiCheckoutEnabled()`, `submitApiCheckout(orderPayload)`, and `submitApiBooking(bookingPayload)`.

## Key Changes
- `src/services/api.js`: Added `isApiCheckoutEnabled`, `submitApiCheckout`, and `submitApiBooking`.
- `src/components/modals/CheckoutSheet.jsx`: Integrated `isApiCheckoutEnabled` branching for `/api/checkout`.
- `src/components/modals/BookingSheet.jsx`: Integrated `isApiCheckoutEnabled` branching for `/api/booking`.
- `tests/api-checkout.test.js`: 4 unit tests covering feature flag checks, error mapping with HTTP status codes, and successful order/booking data parsing.

## Decision Log
- **Additive & Reversible:** Zero disruption to the live production storefront. The client Firestore path remains untouched as a reliable fallback until the owner sets `VITE_USE_API_CHECKOUT=true` in production environment settings.
- **Authoritative Price Display:** If the client cart had an outdated price in memory, the confirmation view and email automatically reflect the server-verified authoritative total.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 62 passed, 0 failed (+4 tests covering API checkout and booking clients).
- `npm run build`: Successful (822.92 kB raw / 246.21 kB gzip).

## Risks & Rollback
- Risk: None. Inactive until `VITE_USE_API_CHECKOUT=true` is enabled.
- Rollback: `git checkout feat/ws6c-signed-uploads-client`.

## Human Steps
- Set `VITE_USE_API_CHECKOUT=true` in Vercel project environment variables when ready to switch customer checkout to backend API processing.

## Dependency
- Stacked on: `feat/ws6c-signed-uploads-client` (@ `5fed385`).
