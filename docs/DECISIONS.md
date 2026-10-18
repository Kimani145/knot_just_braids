# Architecture Decision Log (ADR)

This document records architectural decisions governed by Decision Gates D1–D6.

---

## D1: Hosting and Runtime Environment for `/api`
- **Context:** Knot Just requires server-side order calculation, inventory transactions, and a WhatsApp webhook. Vercel Hobby terms restrict commercial workloads.
- **Options Considered:**
  1. *Vercel Pro:* Simplest migration, keeps frontend and backend unified on existing repository, predictable latency.
  2. *Cloudflare Workers:* Generous free tier (100k requests/day), excellent edge latency, but requires separate tooling and cross-origin CORS.
  3. *Render / Fly.io Free Tier:* Cold starts (50s sleep on Render) break Meta's 3-second WhatsApp webhook requirement.
  4. *Firebase Functions:* Requires Blaze plan (pay-as-you-go credit card activation).
- **Decision:** Write host-agnostic business logic in `server/core/*` (zero cloud dependencies, pure JavaScript) and expose thin Vercel-style handlers in `api/*`. This allows immediate zero-cost local testing and trivial portability to Cloudflare Workers or Node.js containers if needed.
- **Status:** Implemented via core/adapter abstraction. Human gate for production deployment plan.

---

## D2: Analytics Provider
- **Context:** Need observability on storefront interactions while strictly complying with the Kenya Data Protection Act 2019 and preserving fast load times on 3G mobile networks.
- **Options Considered:**
  1. *Google Analytics 4 (GA4):* Familiar, requested by owner, but injects third-party cookies and requires consent mode banner.
  2. *Privacy-First Cookieless Analytics (Plausible / Umami):* Lightweight (<1kB), zero cookies, 100% compliant with Kenya DPA without annoying consent banners.
  3. *Vercel Speed Insights:* Already in bundle, measures real Core Web Vitals, zero cookies.
- **Decision:** Implement a pluggable provider interface in `src/services/analytics.js`. Default provider is `none`. GA4 is supported behind an explicit consent banner. Speed Insights is retained.
- **Status:** Provider interface established.

---

## D3: LLM Provider for WhatsApp Commerce Assistant
- **Context:** An AI layer is planned for WhatsApp styling consultations and style inquiries.
- **Options Considered:**
  1. *Qwen 2.5 / 3.8 Vision (DashScope API):* Very low token cost, but high geographic latency from East Africa to Asian hosting regions.
  2. *Claude 3.5 Haiku:* High reasoning quality and guardrail adherence, higher pricing.
  3. *Gemini 2.5 Flash:* Low token cost, native multimodal capabilities, rapid TTFT (~250ms), and Firebase AI Logic SDK support.
- **Decision:** Build a vendor-neutral LLM provider interface in `server/whatsapp/llm/` with a mock implementation for automated tests. No live API keys or vendor lock-in in core code.
- **Status:** Mock interface established. Vendor selection is a human gate.

---

## D4: Background Queue and Durable Rate Limiting
- **Context:** WhatsApp webhooks require immediate 200 OK (<3s) while processing messages asynchronously.
- **Options Considered:**
  1. *Upstash Redis / QStash:* Managed serverless queue, generous free tier, but introduces external cloud credential.
  2. *In-Memory Queue:* Works in local dev/tests, but serverless instances are ephemeral.
  3. *Cloud Firestore as Queue:* Uses existing database with status flags (`pending`, `processing`, `completed`).
- **Decision:** Define queue and rate-limiting interfaces in `server/core/rateLimit.js` with an in-memory test implementation.
- **Status:** Interface implemented.

---

## D5: Legal Disclosures & Kenya Data Protection Act 2019
- **Context:** Terms of Service, Privacy Policy, and reference photo collection involve statutory obligations under the Kenya Data Protection Act (Act No. 24 of 2019).
- **Decision:** Technical controls implement data minimization, affirmative consent, and automatic EXIF stripping. All user-facing legal text is marked with `{/* TODO(legal-review) */}` for final human sign-off.
- **Status:** Human gate.

---

## D6: Credentials, Keys, and Console Configuration
- **Context:** Cloudinary presets, Firebase service account keys, Meta WhatsApp tokens, and EmailJS domain locks require console actions.
- **Decision:** No automated script or agent will attempt live external authentication. All mandatory manual steps are consolidated in `docs/RUNBOOK-HUMAN-STEPS.md`.
- **Status:** Documented in runbook.
