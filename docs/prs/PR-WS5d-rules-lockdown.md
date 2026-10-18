# PR: WS5d Cloud Firestore Security Rules Lockdown (API Cutover)

> [!CAUTION]
> **DO-NOT-MERGE GATE / DEPLOYMENT PREREQUISITE:**
> Do NOT deploy or activate `firestore.rules.v2` in the Firebase Console until the production storefront environment has been verified running with `VITE_USE_API_CHECKOUT=true`.
> Activating these rules while the frontend still relies on direct browser-side `runTransaction` stock decrements will cause all customer checkout attempts to fail with permission-denied errors.

## Summary
Implements the definitive security lockdown ruleset (`firestore.rules.v2`) for the Knot Just storefront once checkout and booking mutations have cut over entirely to backend server endpoints (`/api/checkout` and `/api/booking`):
1. **Elimination of Anonymous Stock Decrement Carve-Out:**
   - In `firestore.rules`, the `isStockDecrement()` predicate permitted unauthenticated users to update `bead_products.stock` by up to 50 units.
   - In `firestore.rules.v2`, this carve-out is completely removed. Writes to `bead_products` (create, update, delete) strictly require `isAdmin()`.
   - Inventory decrements are handled atomically on the backend via the Firebase Admin SDK.
2. **Elimination of Public Document Creation:**
   - Direct browser creation for `orders` and `bookings` is removed from Firestore rules.
   - Writes to `/orders/{id}` and `/bookings/{id}` are restricted strictly to `isAdmin()`.
   - Customers create orders and bookings through authoritative backend API endpoints (`/api/checkout` and `/api/booking`) which re-validate prices, inventory, and policy compliance before writing to the database using elevated Admin SDK privileges.
3. **Catch-All Fallback Deny:**
   - Any unspecified collection or document path defaults to `allow read, write: if false;`.

## Key Changes
- `firestore.rules.v2`: Authoritative lockdown ruleset authored by the Cloud Firestore Security Rules specialist subagent.
- `tests/firestore-rules-v2.test.js`: Structural unit tests verifying the elimination of `isStockDecrement()`, browser document creation helpers (`validOrder`, `validBooking`), and enforcement of admin-only writes and catch-all deny.

## Decision Log
- **Separate Ruleset File (`firestore.rules.v2`):** Rather than overwriting `firestore.rules` (which is still required for local development and fallback while `VITE_USE_API_CHECKOUT=false`), `firestore.rules.v2` is maintained alongside it as the target cutover ruleset.
- **Rollback Safety:** If issues arise with backend server execution, the owner can maintain `firestore.rules` (Appendix A) while `VITE_USE_API_CHECKOUT=false` without breaking storefront functionality.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 79 passed, 0 failed (+1 test covering `firestore.rules.v2` lockdown invariants).
- `npm run build`: Successful.

## Risks & Rollback
- Risk: Applying `firestore.rules.v2` before backend cutover will break client-side checkout.
- Rollback: Re-apply `firestore.rules` (Appendix A) in the Firebase console.

## Human Steps
1. Verify `/api/checkout` and `/api/booking` are functioning in production with `VITE_USE_API_CHECKOUT=true`.
2. Open Firebase Console -> Firestore Database -> Rules.
3. Paste the contents of `firestore.rules.v2` replacing `PASTE_ADMIN_UID_HERE` with the owner's Firebase Auth UID.
4. Click "Publish".

## Dependency
- Stacked on: `feat/ws9-admin-monolith-breakup` (@ `2f2caf5`).
