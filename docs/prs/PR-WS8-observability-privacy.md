# PR: WS8 Observability & Privacy-Preserving Telemetry

## Summary
Implements zero-PII application observability, Sentry crash reporting, and a consent-gated analytics abstraction adhering to the Kenya Data Protection Act 2019:
1. **Sentry Client Crash Reporting (`@sentry/react`):**
   - Configured in `src/utils/sentry.js` and initialized at application launch (`src/main.jsx`).
   - Root `Sentry.ErrorBoundary` fallback catches uncaught React render exceptions.
   - Separate cached Rollup vendor bundle (`sentry-*.js`: 93.01 kB raw / 31.98 kB gzip).
   - Inactive unless `VITE_SENTRY_DSN` is set; safely no-ops in development and test environments.
2. **Zero-PII Scrubber for Kenya Data Protection Act 2019:**
   - Client-side scrubber runs on all error events (`beforeSend`) and breadcrumbs (`beforeBreadcrumb`).
   - Recursively redacts sensitive customer keys (`clientName`, `clientEmail`, `clientPhone`, `name`, `email`, `phone`, `address`, `referencePhotoUrls`, `token`, `password`).
   - Pattern-matches and scrubs Kenyan mobile phone numbers (`+254...`, `07...`, `01...`) and email addresses from free-form exception strings and breadcrumb URLs.
   - Redacts request headers, query strings, and strips user identifiers (`user.email`, `user.ip_address`, `user.username`).
3. **Consent-Gated Analytics Provider Interface (`src/services/analytics.js`):**
   - Implements Decision Gate D2 with a provider interface (`none` by default, optional `ga4`).
   - Customer choice stored in `localStorage` under `knot_just_cookie_consent` (`granted`, `denied`, `pending`).
   - All events and page view tracking calls drop silently if consent is not explicitly granted.
   - Parameters passed to `trackEvent` undergo strict PII sanitization (stripping customer contact details and addresses).
4. **Mobile Cookie Consent Banner (`src/components/common/ConsentBanner.jsx`):**
   - 360px mobile-first bottom notification banner with accessible 44x44px touch targets.
   - Explicit "Accept" and "Decline" actions, with direct link to Privacy Policy.
5. **Customer Privacy Policy Update (`src/components/client/PrivacyPolicy.jsx`):**
   - Uses `BRAND.name` constant from `src/constants/brand.js`.
   - Discloses automated Sentry error monitoring with automated PII scrubbing.
   - Discloses optional anonymous analytics, including a live interactive toggle allowing customers to change their consent at any time.
   - Enumerates statutory data subject rights under Kenya Data Protection Act 2019 (right to be informed, access, rectification, erasure, and objection).
   - Marked `{/* TODO(legal-review) */}`.

## Key Changes
- `package.json` & `package-lock.json`: Added `@sentry/react`.
- `vite.config.js`: Added `@sentry` chunk split in `manualChunks`.
- `src/utils/sentry.js`: Sentry initialization, PII scrubbers (`scrubPiiText`, `scrubPiiData`, `sanitizeSentryEvent`, `sanitizeSentryBreadcrumb`), and error wrappers.
- `src/utils/sentry.test.js`: 6 unit tests validating email/Kenyan phone scrubbing, breadcrumb sanitization, and event scrubbing.
- `src/services/analytics.js`: Privacy-first analytics service with consent management and PII stripping.
- `tests/analytics.test.js`: 6 unit tests covering consent lifecycle, param sanitization, and GA4 dispatch.
- `src/components/common/ConsentBanner.jsx`: Mobile-friendly cookie and privacy consent banner.
- `src/components/client/PrivacyPolicy.jsx`: Updated legal policy with Sentry/analytics disclosures and DPA 2019 rights.
- `src/main.jsx`: Initialized Sentry/analytics and wrapped root with `Sentry.ErrorBoundary`.
- `src/App.jsx`: Rendered `ConsentBanner` and wired `trackPageView` on navigation and popstate.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 78 passed, 0 failed (+12 tests covering Sentry PII scrubber and analytics interface).
- `npm run build`: Successful (0 chunks > 500 kB, `sentry` chunk is 93.01 kB raw / 31.98 kB gzip).

## Risks & Rollback
- Risk: None. Inactive when `VITE_SENTRY_DSN` is empty and `VITE_ANALYTICS_PROVIDER=none`.
- Rollback: `git checkout feat/ws7-performance-code-splitting`.

## Human Steps
- Set `VITE_SENTRY_DSN` in Vercel environment variables if Sentry crash reporting is desired.
- Set `VITE_ANALYTICS_PROVIDER=ga4` and `VITE_GA4_MEASUREMENT_ID` in Vercel environment variables if Google Analytics 4 is desired.
- Legal review of new Privacy Policy sections marked `{/* TODO(legal-review) */}`.

## Dependency
- Stacked on: `feat/ws7-performance-code-splitting` (@ `80f55bb`).
