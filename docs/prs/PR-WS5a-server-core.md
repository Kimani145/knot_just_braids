# PR: WS5a Host-Agnostic Server Core

## Summary
Implements a host-agnostic, zero-dependency server core in `server/core/` to power backend order pricing, atomic checkout, appointment bookings, and admin authorization:
1. **Decision Gate D1 Compliance (Hosting):** Written in pure ES JavaScript with zero external or cloud vendor dependencies (no Vercel, Firebase SDK, Express, or AWS imports). All functions operate on abstract interfaces, allowing seamless deployment to Vercel Functions, Cloudflare Workers, Node.js containers, or Firebase Functions.
2. **Kenya Data Protection Act 2019 Compliance (`server/core/log.js`):** Built-in structured logging with automated PII masking for customer emails (`j***e@domain`), phone numbers (`+254****5678`, `0712****5678`), physical addresses, and sensitive authorization tokens.
3. **Authoritative Server Pricing (`server/core/pricing.js`):** Re-prices requested cart items against the authoritative database catalog, rejecting client-tampered prices and disallowing direct cart checkout of variable/range pricing items.
4. **Atomic Checkout Engine (`server/core/checkout.js`):** Executes within an atomic transaction: verifies product existence, verifies inventory availability, atomically decrements stock, calculates authoritative totals, and generates pending order records matching Firestore rules.
5. **Booking Validation & Creation (`server/core/booking.js`):** Validates appointment requests, prevents booking past dates, bounds field lengths, and records pending bookings.
6. **In-Memory Rate Limiting (`server/core/rateLimit.js`):** Sliding-window rate limiter with token bucket cleanup, returning HTTP 429 and `Retry-After` headers.
7. **Abstract Repository & Mock Store (`server/core/store.js`):** Defines `Store` contract alongside `InMemoryStore` for zero-overhead, deterministic automated testing.
8. **Authentication & Admin Authorization (`server/core/auth.js`):** Bearer token parser and admin UID allowlist verification helper.

## Key Changes
- `server/core/errors.js`: Typed domain errors (`AppError`, `ValidationError`, `NotFoundError`, `InsufficientStockError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`) and safe error formatting helper (`formatErrorResponse`).
- `server/core/log.js`: Structured JSON logger with regex-based PII redaction (email, phone, address, secrets).
- `server/core/rateLimit.js`: In-memory sliding-window token bucket implementation.
- `server/core/validators.js`: Whitelist-based input sanitization for orders and salon appointments.
- `server/core/pricing.js`: Authoritative line item calculation, total summation, and items summary string generator.
- `server/core/store.js`: Abstract `Store` repository interface and `InMemoryStore` with transaction rollback support.
- `server/core/checkout.js`: `processCheckout` coordinator.
- `server/core/booking.js`: `processBooking` coordinator.
- `server/core/catalog.js`: `fetchFullCatalog` reader.
- `server/core/auth.js`: Bearer token extraction and admin UID check.
- `server/core/index.js`: Barrel export for all core functions.
- `tests/server-core.test.js`: 17 comprehensive unit tests covering validation, pricing, rate limiting, checkout transactions, rollback, and authentication.
- `eslint.config.js`: Configured Node globals for `server/**`, `api/**`, and `tests/**`.

## Decision Log
- **D1 (Host Agnostic):** Core business logic has zero vendor lock-in. Adapters in `api/` will simply map HTTP request/response envelopes to `server/core`.
- **D4 (Rate Limiting & State):** In-memory sliding window provides immediate denial-of-service protection without external Redis dependencies.
- **Client Zero-Bloat Invariant:** `server/core` is strictly server-side; client bundle size remains unchanged (816.17 kB raw / 244.28 kB gzip).

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 41 passed, 0 failed (+17 tests covering server core).
- `npm run build`: Successful (client bundle unchanged).

## Risks & Rollback
- Risk: Low. Purely additive server logic and tests.
- Rollback: `git checkout feat/ws3-customer-media-a11y`.

## Human Steps
- None required.

## Dependency
- Stacked on: `feat/ws3-customer-media-a11y` (@ `0c17966`).
