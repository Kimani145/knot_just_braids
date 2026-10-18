# PR: WS10 WhatsApp Channel with AI Guardrails & Human Escalation

## Summary
Implements the backend foundation for a conversational WhatsApp customer channel powered by the Meta WhatsApp Cloud API with multi-layered AI security guardrails, rate limiting, and seamless human escalation:
1. **Meta WhatsApp Cloud API Webhook Adapter (`api/whatsapp.js`):**
   - **GET Challenge Handler:** Validates Meta webhook subscription verification tokens (`hub.mode === 'subscribe'` and `hub.verify_token === WHATSAPP_VERIFY_TOKEN`) and responds with the plaintext challenge.
   - **POST Inbound Message Handler:** Validates `x-hub-signature-256` HMAC-SHA256 against `WHATSAPP_APP_SECRET`. Provides fast acknowledgment (<3s requirement by Meta) to prevent redundant webhooks.
2. **Server Core WhatsApp Utilities (`server/core/whatsapp.js`):**
   - Host-agnostic webhook challenge validation (`verifyWebhookChallenge`).
   - Timing-safe HMAC-SHA256 signature verification (`verifyMetaSignature`).
   - Inbound message parsing (`parseInboundWhatsAppMessage`) supporting customer text queries and reference media.
   - Outbound message formatters (`formatOutboundWhatsAppText`).
3. **AI Security Guardrails & Human Escalation (`server/core/llm.js`):**
   - **Prompt Injection Defense (`detectPromptInjection`):** Regex heuristics scanning inbound text for jailbreak and prompt leak attempts (`"ignore previous instructions"`, `"system prompt"`, `"you are now DAN"`, `"developer mode"`, `"forget instructions"`).
   - **Token Cost Gating (`WhatsAppRateLimiter`):** Sliding-window rate limiter per customer phone number (15 requests/hour by default) preventing automated token burn.
   - **Human Escalation Trigger (`shouldEscalateToHuman`):** Automatically routes customers to the human owner (`https://wa.me/254...`) when injection is detected, when the customer explicitly requests human support ("human", "agent", "call me", "speak to someone"), or after 4 unresolved turns.
   - **Decision Gate D3 Implementation (`MockLlmProvider`):** Abstract provider interface with a deterministic zero-cost mock provider answering salon style queries, beadwork prices, location ("Kasarani, Nairobi"), and booking hours without live API dependencies.

## Key Changes
- `server/core/whatsapp.js`: Meta webhook challenge validation, signature verification, and payload parser.
- `server/core/llm.js`: AI security guardrails, rate limiter, human escalation rules, and `MockLlmProvider`.
- `api/whatsapp.js`: Serverless webhook endpoint.
- `tests/whatsapp.test.js`: 11 unit tests covering challenge verification, HMAC signatures, inbound parsing, injection detection, rate limiting, and mock replies.

## Decision Log
- **Decision Gate D3 (LLM Vendor):** Implemented behind the `LlmProvider` interface. No third-party LLM APIs (e.g. Meta LLaMA, OpenAI, Qwen) are called directly in tests or default builds, guaranteeing zero external dependencies and zero unexpected token costs.
- **Fast ACK Compliance:** Webhook responds with HTTP 200 immediately to meet Meta's strict 3-second SLA while async message parsing proceeds safely.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 90 passed, 0 failed (+11 tests covering WhatsApp utilities and AI guardrails).
- `npm run build`: Successful.

## Risks & Rollback
- Risk: Inactive until Meta developer webhook URL is configured.
- Rollback: `git checkout feat/ws5d-rules-lockdown`.

## Human Steps
- Configure Meta App for WhatsApp Cloud API.
- Set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_PHONE_NUMBER_ID` in Vercel project settings.
- Point Meta Webhook URL to `https://<your-domain>.vercel.app/api/whatsapp`.

## Dependency
- Stacked on: `feat/ws5d-rules-lockdown` (@ `24f377b`).
