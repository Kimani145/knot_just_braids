# PR: WS1 Rules & Safety Net

## Summary
Introduces live-compatible Cloud Firestore Security Rules (`firestore.rules` replicating Appendix A exactly, validated by the specialist subagent `firestore-rules-author` and emulator syntax check), adds `firebase.json` for rules deployment, extracts inline calculation and normalization logic into pure unit-tested utility modules, and expands the native test suite.

## Key Changes
1. **Cloud Firestore Rules & Firebase Config:**
   - Authored `firestore.rules` adhering strictly to Appendix A:
     - Admin UID RBAC allowlist placeholder (`isAdmin()`).
     - Temporary anonymous stock decrement carve-out: only `stock` can be modified, delta must be positive, delta <= 50, resulting stock >= 0 (`isStockDecrement()`).
     - Strict schema and timestamp validation for anonymous order and booking creation (`validBooking()`, `validOrder()`).
     - Admin-only write controls across `salon_styles`, `bead_products` (outside decrement), `orders`, `bookings`, and `assets_metadata`.
   - Added `firebase.json` configured with rules path.
2. **Pure Logic Extraction:**
   - Extracted cart total calculations into `src/utils/cartTotals.js` (clamping negative values and invalid quantities).
   - Extracted price input normalization and accessible range formatting into `src/utils/pricingUtils.js`.
   - Extracted product, style, booking, and order mappers into `src/utils/mappers.js`.
3. **Comprehensive Unit Testing:**
   - Added `src/utils/cartTotals.test.js`, `src/utils/pricingUtils.test.js`, `src/utils/mappers.test.js`, and `tests/firestore-rules.test.js`.
   - Expanded `npm run test:unit` script to execute all unit test suites in `src/utils/` and `tests/` (17 tests passing).
4. **Human Runbook:**
   - Documented the full Rules Playground test case matrix in `docs/RUNBOOK-HUMAN-STEPS.md` covering all 7 critical auth and validation cases.

## Decision Log
- **Security Invariant:** Kept the anonymous stock decrement carve-out as a temporary bridge for legacy checkout while locking all other fields against tampering until server-side checkout (WS5) is live.
- **Dependency Guard:** Implemented unit testing using Node's native test runner (`node --test`), adhering to zero new runtime dependencies.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 17 passed, 0 failed.
- `npm run build`: Successful.
  - Baseline (WS0): 785.66 kB raw / 237.16 kB gzip
  - Post-WS1: 785.66 kB raw / 237.16 kB gzip (+0.0 kB client bundle delta; utility modules are tested and ready for component wiring).

## Risks & Rollback
- Risk: Low. Firestore rules are not deployed automatically; deployment is an explicit human action.
- Rollback: Revert branch commit or checkout `feat/ws0-baseline-hygiene`.

## Human Steps
- Copy `firestore.rules` into Firebase Console > Firestore Database > Rules, replace `'PASTE_ADMIN_UID_HERE'` with the real admin UID, and test using the Rules Playground matrix in `docs/RUNBOOK-HUMAN-STEPS.md`.

## Dependency
- Stacked on: `feat/ws0-baseline-hygiene` (@ `4e488cd`).
