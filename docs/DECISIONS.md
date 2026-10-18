# Architecture Decision Records (ADR) - Knot Just

This document records architectural decisions governed by Decision Gates D1–D6 across the storefront and backend architecture.

---

## D1: Hosting and Runtime Environment for `/api`
- **Context:** Knot Just requires authoritative server-side order calculation, atomic inventory decrements, signed media uploads, physical asset deletion, and a Meta WhatsApp webhook. Vercel Hobby terms prohibit commercial workloads.
- **Options Evaluated:**
  1. *Vercel Pro ($20/mo):* Simplest deployment path. Keeps frontend and backend unified on existing repository, zero code rewriting, predictable low latency from global edge CDN.
  2. *Cloudflare Workers (Free / $5/mo):* Generous free tier (100k requests/day), exceptional global latency, but requires separate build tooling and cross-origin CORS handling.
  3. *Render / Fly.io (Free / Cheap):* Free tiers experience cold start sleeps (up to 50s on Render), which directly violates Meta's 3-second WhatsApp webhook response requirement.
  4. *Firebase Cloud Functions (Blaze Pay-as-you-go):* Tight Firebase integration, but requires credit card provisioning and cold starts on Node 20 runtime.
- **Decision:** Architect all business logic in host-agnostic `server/core/*` (zero cloud vendor imports, pure Node.js/JavaScript, 100% testable via native `node --test`) and expose thin Vercel-style handlers in `api/*`. This enables zero-cost local development, instant deployment on Vercel, and trivial migration to Cloudflare Workers or Express/Fastify containers with zero changes to business logic.
- **Status:** Implemented (`server/core/` + `api/`). Final production host selection is a human gate.

---

## D2: Telemetry, Observability & Analytics
- **Context:** The business requires error tracking and storefront usage metrics while strictly complying with the Kenya Data Protection Act 2019 (PII protection) and preserving fast load times on Kenyan 3G mobile networks.
- **Options Evaluated:**
  1. *Google Analytics 4 (GA4):* Familiar to owners, requested by default, but injects third-party cookies, collects user tracking telemetry, and requires affirmative consent under Kenya DPA.
  2. *Privacy-First Cookieless Analytics (Plausible / Umami / Cloudflare Web Analytics):* Ultra-lightweight (<1kB payload), zero cookies, 100% compliant with Kenya DPA without annoying consent banners.
  3. *Sentry Client Error Tracking:* Industry-standard crash diagnostics, permitted under engineering rules.
- **Decision:**
  - Implement a pluggable provider interface in `src/services/analytics.js` (`getConsentStatus`, `setConsentStatus`, `trackEvent`, `trackPageView`). Default provider is `'none'`.
  - GA4 is supported behind an explicit mobile-first consent banner (`ConsentBanner.jsx`). If consent is denied or pending, no analytics scripts load.
  - Sentry is integrated via `@sentry/react` in `src/utils/sentry.js` with client-side PII scrubbing (`beforeSend` and `beforeBreadcrumb` scrub all customer names, emails, Kenyan phone numbers, delivery addresses, and reference photos before network dispatch).
- **Status:** Implemented. Documented privacy-first alternatives for owner review.

---

## D3: WhatsApp Assistant & LLM Provider Layer
- **Context:** A WhatsApp customer channel is planned for style consultations, appointment booking questions, and order inquiries.
- **Options Evaluated:**
  1. *Qwen 2.5 / DashScope API:* High-quality open weights, low token cost, but geographic network latency from Nairobi to Chinese endpoints.
  2. *Claude 3.5 Haiku (Anthropic):* Exceptional prompt-following and guardrail robustness, higher token pricing.
  3. *Gemini 2.5 Flash (Google Cloud / Firebase AI Logic):* Sub-300ms time-to-first-token (TTFT), low cost, multimodal image understanding for hair reference photos.
  4. *Meta LLaMA 3.3 via Groq:* Near-instant inference (400+ tokens/s), cost-effective.
- **Decision:** Implement an abstract `LlmProvider` interface in `server/core/llm.js` with a deterministic, zero-cost `MockLlmProvider` for tests and default operation. Never call live AI vendor APIs in automated unit tests.
- **Guardrails Implemented:**
  - `detectPromptInjection`: Regex heuristics scanning for jailbreak and prompt leak attempts.
  - `WhatsAppRateLimiter`: Per-phone rate limiter (15 requests/hour) preventing token burn attacks.
  - `shouldEscalateToHuman`: Automatically routes customers to human owner when threats occur or when requested.
- **Status:** Implemented. Live model API selection remains a human gate.

---

## D4: Background Queue and Rate Limiting State Store
- **Context:** Serverless functions are stateless and ephemeral. Rate limiting and webhook fast-acknowledgment require coordination.
- **Options Evaluated:**
  1. *Upstash Redis / QStash:* Managed serverless Redis with REST API, generous free tier (10k requests/day), but requires external credentials.
  2. *In-Memory Sliding Window:* Zero external services, zero cost, completely self-contained, but instance-local.
  3. *Cloud Firestore as State Store:* Leverages existing database, but incurs billable reads/writes on every rate limit check.
- **Decision:** Provide in-memory sliding window rate limiters (`server/core/rateLimit.js`, `server/core/llm.js`) with abstract storage interfaces (`InMemoryStore` vs `FirestoreStore`). When production volume necessitates distributed coordination, swap in Upstash Redis via adapter without altering core validators.
- **Status:** Implemented.

---

## D5: Legal Disclosures & Kenya Data Protection Act 2019
- **Context:** Storefront collection of customer names, WhatsApp numbers, physical delivery addresses, and reference photos falls under the Kenya Data Protection Act (Act No. 24 of 2019).
- **Controls Implemented:**
  - Automatic client-side canvas compression (`imageCompressor.js`) strips device EXIF metadata (GPS location, camera hardware) before upload.
  - Affirmative consent checkboxes (`agreedToPolicy`) are strictly enforced on client AND server write paths.
  - Sentry crash logs automatically scrub all PII via regex and deep key sanitization.
  - Analytics requires explicit opt-in via `ConsentBanner.jsx`.
- **Statutory Review Requirement:** All user-facing legal text in `PrivacyPolicy.jsx` and `TermsOfService.jsx` is marked `{/* TODO(legal-review) */}` for final validation by Kenyan legal counsel.
- **Status:** Technical controls implemented. Legal sign-off is a human gate.

---

## D6: Credentials, Secrets & Operational Separation
- **Context:** API keys, Firebase service accounts, Cloudinary secrets, and Meta credentials must never leak into git repositories or client bundles.
- **Decision:**
  - Client bundles only carry public identifiers prefixed with `VITE_` (e.g. `VITE_CLOUDINARY_CLOUD_NAME`).
  - Private secrets (`CLOUDINARY_API_SECRET`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `WHATSAPP_APP_SECRET`) reside exclusively on the server.
  - All manual operational steps are centralized in `docs/RUNBOOK-HUMAN-STEPS.md`.
- **Status:** Implemented and verified.
