# PR: WS5b HTTP Adapters & Vercel Functions

## Summary
Delivers thin HTTP adapters and Vercel Serverless Function entrypoints connecting incoming HTTP requests to the host-agnostic server core:
1. **API Endpoints (`api/checkout.js`, `api/booking.js`, `api/catalog.js`):**
   - `POST /api/checkout`: Validates carts, checks stock, decrements inventory atomically, and creates orders.
   - `POST /api/booking`: Validates and saves salon appointment booking requests.
   - `GET /api/catalog`: Returns full styles and products catalog with CDN caching headers (`Cache-Control: public, s-maxage=60, stale-while-revalidate=300`).
2. **HTTP Utility Layer (`server/adapters/httpUtils.js`):**
   - Automated CORS configuration with origin filtering from `ALLOWED_ORIGINS` (supporting localhost and preview deployments).
   - Safe body parsing (supporting pre-parsed objects and raw JSON streams).
   - Client IP extraction (`x-forwarded-for`, `x-real-ip`).
   - Rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).
   - Method guards with 405 Method Not Allowed.
   - Error capture and serialization with `formatErrorResponse`.
3. **Firestore Store Adapter (`server/adapters/firestoreStore.js`):**
   - Connects to Cloud Firestore using `firebase-admin`.
   - Supports credential parsing from `FIREBASE_SERVICE_ACCOUNT_KEY` (base64 or raw JSON) or application default credentials.
   - Implements native Firestore transactions (`db.runTransaction`).
4. **Vercel Routing Exemption (`vercel.json`):**
   - Updated SPA rewrite pattern from `/(.*)` to `/((?!api/).*)` to ensure requests to `/api/*` are never routed to `index.html`.

## Key Changes
- `package.json` / `package-lock.json`: Added `firebase-admin` (permitted server-side runtime dependency per `AGENTS.md`).
- `server/adapters/firestoreStore.js`: Concrete Firestore implementation of the `Store` interface.
- `server/adapters/httpUtils.js`: HTTP request wrapper with CORS, rate limiting, and error formatting.
- `api/checkout.js`: Checkout endpoint handler.
- `api/booking.js`: Booking endpoint handler.
- `api/catalog.js`: Catalog endpoint handler.
- `vercel.json`: Exemption pattern for `/api/*` routes.
- `tests/adapters.test.js`: Unit tests for HTTP utilities, CORS, methods, and error mapping.

## Decision Log
- **Thin Adapters:** Handlers contain zero business logic; they only adapt HTTP request/response semantics to `server/core`.
- **CDN Caching on Catalog:** Catalog reads are safely cached at the edge for 60 seconds with 5-minute stale-while-revalidate, drastically reducing Firestore read costs on Kenyan networks.
- **Client Zero-Bloat Invariant:** Neither `firebase-admin` nor `api/*` are included in the client bundle (bundle size remains constant at 816.17 kB raw / 244.28 kB gzip).

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 47 passed, 0 failed (+6 tests covering adapter layer).
- `npm run build`: Successful.

## Risks & Rollback
- Risk: Low. Endpoints operate alongside existing client-side Firebase calls; client cutover is feature-flagged.
- Rollback: `git checkout feat/ws5a-server-core`.

## Human Steps
- Set `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel environment settings when ready to activate live server execution.

## Dependency
- Stacked on: `feat/ws5a-server-core` (@ `98c5537`).
