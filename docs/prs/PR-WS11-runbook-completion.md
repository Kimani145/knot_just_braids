# PR: WS11 Architecture Decisions & Production Runbook Completion

## Summary
Completes the architectural documentation and operational handover runbooks for the Knot Just storefront:
1. **Architecture Decision Records (`docs/DECISIONS.md`):**
   - **D1 (Hosting & Serverless Architecture):** Comprehensive evaluation of Vercel Pro vs Cloudflare Workers vs Render vs Firebase Cloud Functions. Documents the host-agnostic `server/core/` pattern that enables seamless multi-cloud portability.
   - **D2 (Telemetry & Privacy):** Documents consent-gated analytics architecture, Sentry client-side PII scrubbing, and cookieless alternatives (Plausible/Umami).
   - **D3 (WhatsApp LLM Assistant):** Documents `LlmProvider` abstraction, prompt injection heuristics, rate limiting, and human escalation gates.
   - **D4 (State Store & Rate Limiting):** Documents sliding window memory rate limiting and transition paths to distributed Upstash Redis.
   - **D5 (Legal Disclosures & Kenya DPA 2019):** Summarizes technical data protection controls and legal review gates.
   - **D6 (Credentials & Operational Separation):** Formalizes strict boundary between client public keys and server secrets.
2. **Production Operations Runbook (`docs/RUNBOOK-HUMAN-STEPS.md`):**
   - Complete, step-by-step human guide covering:
     1. Incognito and mobile 360px viewport baseline validation.
     2. Vercel commercial plan evaluation.
     3. Cloudinary unsigned preset hardening and signed upload cutover.
     4. EmailJS origin lockdown.
     5. Firebase service account generation and base64 environment variable encoding.
     6. Cloud Firestore security rules deployment with complete Rules Playground test matrix.
     7. Sentry DSN configuration and PII scrubbing verification.
     8. Google Analytics 4 consent mode testing.
     9. Meta WhatsApp Cloud API registration and webhook handshake verification.
     10. Kenya Data Protection Act 2019 legal sign-off checklist.
     11. Disaster recovery and instant rollback procedures for API checkout, security rules, and upload signatures.

## Key Changes
- `docs/DECISIONS.md`: Expanded with detailed decisions for D1–D6.
- `docs/RUNBOOK-HUMAN-STEPS.md`: Comprehensive 11-step human operations and emergency runbook.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 90 passed, 0 failed.
- `npm run build`: Successful.

## Risks & Rollback
- Risk: None (documentation only).
- Rollback: `git checkout feat/ws10-whatsapp-channel`.

## Human Steps
- Read `docs/RUNBOOK-HUMAN-STEPS.md` and follow configuration steps for production launch.

## Dependency
- Stacked on: `feat/ws10-whatsapp-channel` (@ `d89c243`).
