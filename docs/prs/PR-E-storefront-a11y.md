# PR-E: Storefront Accessibility & Polish (CLIENT)

## Summary
Implements comprehensive accessibility (a11y) improvements, robust duration formatting, and contrast optimizations across the customer storefront:
1. **Feed Switch Accessibility (`FeedToggle.jsx`):**
   - Added `role="group"` and `aria-label="Catalog feed switch"` to the toggle container.
   - Added explicit `aria-pressed={activeFeed === 'salon'}` and `aria-pressed={activeFeed === 'beads'}`.
   - Assigned accessible names (`aria-label={BRAND.salonName}` / `aria-label={BRAND.beadName}`).
2. **Cart Button Accessible Name (`Navigation.jsx`):**
   - Formatted accessible label: `aria-label="Cart, N items"` (or "Cart, 1 item", "Cart, 0 items").
   - Added `aria-hidden="true"` to visual SVG icon and numeric counter badge to prevent redundant announcements.
3. **Pure Service Duration Helper (`src/utils/duration.js`):**
   - Created pure, tested `formatDuration(raw)` utility.
   - Converts raw numbers: `"4"` -> `"4 hrs"`, `4` -> `"4 hrs"`, `1` -> `"1 hr"`, `"2.5"` -> `"2.5 hrs"`.
   - Normalizes ranges: `"5-7 hrs"` -> `"5–7 hrs"`, `"3-4"` -> `"3–4 hrs"`.
   - Cleans up empty / placeholder inputs: `""`, `"—"`, `"-"`, `null`, `undefined` -> `""` (prevents empty clocks and bare dash rows).
   - Integrated into [`StyleCard.jsx`](file:///home/kimani/Projects/mon-amour/knot_just/src/components/client/StyleCard.jsx) and [`ProductQuickView.jsx`](file:///home/kimani/Projects/mon-amour/knot_just/src/components/client/ProductQuickView.jsx).
4. **Quick-View Modal Focus Management & Inert (`ProductQuickView.jsx`):**
   - Trap focus: Tab / Shift-Tab cycle exclusively within modal sheet controls.
   - Opener restoration: Focus returns to activating card thumb when modal is dismissed.
   - Background isolation: Sets `inert` on `#root` while open to prevent screen readers and keyboard users from interacting with underlying page.
   - Keyboard dismissal: Escape key handler closes modal immediately.
   - Layout-shift prevention scroll lock: Dynamic scrollbar width padding prevents page jump.
5. **Color Contrast AA Hardening (`src/index.css`):**
   - Strengthened bead accent from `#557a46` to `#3d602f` (contrast ratio increases from 4.6:1 to > 6.1:1 against light surface).
   - Increased `.card-action` font-weight to `600` for crisp legibility.

---

## Verification & Test Results
- **Unit Tests:** `node --test src/utils/*.test.js tests/*.test.js`
  - 108 passing tests, including 5 new tests in `tests/pr-e-storefront-a11y.test.js`.
- **ESLint:** `eslint .` passed with 0 errors.
- **Production Build:** `vite build` completed cleanly in 1.75s.
- **Banned Patterns:** 0 matches for `console.log`, `dangerouslySetInnerHTML`, `innerHTML`, `window.alert`, `window.confirm`, `eval`.

---

## Rollback Plan
Reverting this commit returns feed switches and cart button to basic markup without affecting database state.
