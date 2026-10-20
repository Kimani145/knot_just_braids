# PR-D: Admin Reliability & Error Handling

## Summary
Hardens catalog inventory editing, eliminates spurious Firestore crashes and pricing validation issues, improves admin ergonomics, and enhances observable error reporting:
1. **Human-Readable Firestore Error Handling (`src/utils/firestoreErrors.js`):**
   - Maps raw Firebase error codes (`permission-denied`, `unauthenticated`, `invalid-argument`, `unavailable`, `resource-exhausted`, `failed-precondition`) into actionable messages (e.g. indicating UID rule checks, session re-authentication).
   - Integrates with the existing Sentry scrubber (`captureException`) with operation and error code tags while strictly redacting PII and catching any telemetry dispatch exceptions.
   - Surfaced via in-app toast alerts (`sonner`) rather than swallowing errors or discarding error codes.
2. **Pure Diff-Based Payload Builder (`src/utils/adminPayload.js`):**
   - Implements `buildInventoryPayload(editForm, original)` which writes **only changed fields**.
   - Guarantees zero `undefined` values across all partial updates (preventing Firestore driver rejections).
   - Preserves media fields (`assetUrl`, `images`, `videos`) unless explicitly modified.
   - Eliminates invented fallback strings (previously `description || 'Updated style/product'`).
   - Validates publish requirements: blocks empty description on published items while permitting empty description on drafts.
3. **Price Range & Keystroke Reformatting Fix:**
   - Detaches currency display formatting from the input value in `SalonManager.jsx`, `BeadManager.jsx`, and `InventoryQuickEditModal.jsx`.
   - Uses plain text inputs with `inputMode="numeric"`, storing raw numeric strings in state while rendering formatted currency (`formatCurrency`) as a live hint below the field.
   - Rapid typing (e.g. "1500") never reformats midway, avoids cursor jumping, and eliminates `NaN` validation errors during browser automation.
   - Enforces stable element IDs and `<label htmlFor="...">` bindings.
4. **Enhanced VideoLinksField Photo-Post Preview (`VideoLinksField.jsx`):**
   - Displays post kind badge (`Photo post` vs `Video`), `@handle`, short post ID (e.g. `...9298`), and an external "Open on TikTok" action.
   - Admin can unambiguously verify which post is linked.

---

## Decision Log
- **Why pure diffing in `buildInventoryPayload`?**
  Writing the entire document object on every edit caused race conditions, unintended overrides of unchanged fields, and Firestore crashes when uninitialized fields evaluated to `undefined`. A pure diff guarantees minimal, safe delta writes.
- **Why decouple price formatting from input state?**
  Keystroke-level reformatting into `"Kshs 1,500"` caused cursor jumps to the end of the input and broke automated inputs. By keeping raw numeric digits in state and rendering formatted currency as an auxiliary hint, users and automated test agents can type freely.
- **Why surface specific Firestore codes in the UI?**
  Previously, any save failure collapsed into a generic `"Could not save these inventory changes"`. Surfacing permission vs session vs argument errors lets the store operator take direct remediation steps.

---

## Verification & Test Results
- **Unit Tests:** `node --test src/utils/*.test.js tests/*.test.js`
  - 124 passing unit tests (including 12 new dedicated tests in `src/utils/adminPayload.test.js` covering no-op diffs, undefined exclusion, salon range round-tripping, and error mapping).
- **ESLint:** `eslint .` passed with 0 errors.
- **Production Build:** `vite build` completed cleanly:
  - `dist/assets/AdminView-CCmsfKoz.js`: 86.21 kB (gzip: 20.70 kB)
- **Banned Patterns:** Zero instances of `console.log`, `dangerouslySetInnerHTML`, `window.alert`, `window.confirm`, or `eval`.

---

## Risks & Mitigations
- **Risk:** Existing documents missing required fields when edited.
  - **Mitigation:** `buildInventoryPayload` inspects `status` (defaulting absent to `published`) and allows empty descriptions for drafts, while validating published items.
- **Risk:** Sentry telemetry failures crashing admin saves.
  - **Mitigation:** Error capture inside `reportAdminFirestoreError` is wrapped in safe `try/catch` and returns user-friendly copy even if telemetry is blocked.

---

## Rollback Plan
Reverting this commit restores previous edit modal handlers and price input formatting without affecting stored Firestore schema.

## Human Steps After Deploy
1. Sign in to the Admin Dashboard.
2. Edit an existing salon style with range pricing (e.g., KSh 1,500 – 2,500) and verify fields save without error.
3. Edit a bead product and verify numeric stock persistence.
