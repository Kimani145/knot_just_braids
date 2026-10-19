# AGENTS.md - Developer & Agent Guide for Knot Just Braids

## 1. Project Mission & Operational Context
- **Project:** Knot Just (Storefront for braiding services and handcrafted beadwork).
- **Target Audience:** Kenyan mobile users, 360px viewport baseline, high data cost sensitivity (Safaricom 3G/4G).
- **Compliance:** Kenya Data Protection Act 2019 (PII protection: names, phone numbers, delivery addresses, reference photos).
- **Brand Protection:** Brand rename is deferred. Never hardcode brand strings in new code; always import `BRAND` from `src/constants/brand.js`.
- **Package Name:** Package name in `package.json` is `glowbook` (do not rename).

## 2. Standard Commands
- `npm run dev`: Start Vite development server.
- `npm run build`: Production client build (`vite build`).
- `npm run lint`: ESLint check (`eslint .`). Baseline is 0 errors.
- `npm run test:unit`: Native Node test runner (`node --test ...`). Zero external test runner dependencies.

## 3. Global Engineering Rules

### DO
- **Validate on Write AND on Read:** Treat all inputs, Firestore documents, query parameters, URLs, and uploaded files as hostile. Use strict whitelisting.
- **Additive & Reversible:** Changes must be feature-flagged where behavior shifts (e.g. `VITE_USE_API_CHECKOUT`).
- **Patterns & Design Tokens:** Mirror `.overlay`, `.sheet`, Sonner toasts, `pushDashboardFeedback`, `.a-input.invalid`, `.a-error`, Lucide icons, CSS custom properties, and light/dark theme tokens.
- **Mobile Touch Targets & Accessibility:** 44x44px minimum touch targets, WCAG AA 4.5:1 text contrast, `prefers-reduced-motion` support.
- **Pure Logic Extraction:** Extract deterministic business logic into `src/utils/` or `server/core/` and test with `node --test`.
- **Allowed Dependencies:** Only `firebase-admin` (server) and `@sentry/react` (observability) are permitted. Prefer zero new runtime packages.

### DON'T
- **No Insecure Sinks:** Never use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `window.alert`, or `window.confirm`.
- **No Console Credential Leakage:** Never use unredacted `console.log` on customer or auth data. Use redacting logger utilities.
- **No Raw Emoji UI Chrome:** Use Lucide icons for UI controls; reserve emojis exclusively for product/style data fields.
- **No Secrets in Source:** Never commit API keys, service accounts, UIDs, or tokens.
- **No Untracked Blanket Git Actions:** Never use `git add -A`. Inspect `git status` explicitly before committing.
- **No Direct Deployment / Production Mutations:** Never deploy or merge branches directly. Work is delivered as reviewable stacked PRs.

## 4. Stacked PRs & Workflow Convention
- Stacked branches follow: `feat/ws<N>-<slug>`.
- Each PR branch is based on its predecessor in the stack.
- PR descriptions must be concise, mobile-readable, and include: Summary, Decision Log, Verification (lint/build/test deltas), Risks & Rollback, Human Steps, and Branch Dependency.
