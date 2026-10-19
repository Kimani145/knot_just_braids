# Security Policy

## 1. Supported Versions
Security updates and patches are actively applied to the default branch (`main`) and release branches.

| Branch / Version | Supported |
|---|---|
| `main` | :white_check_mark: |
| Feature / Staging Branches | :x: |

## 2. Reporting a Vulnerability
We welcome responsible security research and vulnerability disclosures.

If you believe you have discovered a vulnerability in the Knot Just storefront, serverless API, or data access rules:
1. **Do NOT open a public GitHub issue.**
2. Send a confidential report to the project owner or designated security contact.
3. Include detailed reproduction steps, proof-of-concept payload, and assessed impact.
4. Allow reasonable time for remediation before any public disclosure.

## 3. Scope
### In-Scope
- Cloud Firestore Security Rules (`firestore.rules`).
- Serverless backend endpoints (`api/*` and `server/core/*`).
- Client-side authentication and session handling (`src/firebase.js`, `src/components/admin/*`).
- Media upload and signature endpoints (`api/sign-upload.js`, `api/sign-reference-upload.js`).
- WhatsApp webhook endpoint and prompt injection guardrails (`api/whatsapp-webhook.js`).
- Protection of customer PII (names, phone numbers, delivery addresses, reference photos).

### Out-of-Scope
- Third-party infrastructure attacks (Cloudinary core infrastructure, Google Firebase platform outages, Meta WhatsApp platform).
- Denial of Service (DoS/DDoS) against third-party endpoints.
- Social engineering against salon operators or customers.

## 4. Legal & Regulatory Compliance
In accordance with the **Kenya Data Protection Act, 2019 (Act No. 24 of 2019)**:
- Customer personal data must be safeguarded with appropriate technical and organizational measures (Section 41).
- In the event of a security breach involving personal data, notification to the Office of the Data Protection Commissioner (ODPC) and affected data subjects will be initiated in accordance with statutory timelines (Section 43).
