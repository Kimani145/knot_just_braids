# Human Runbook: Production Setup, Configuration & Operational Procedures

This runbook documents all mandatory human-owned configuration, account provisioning, credentials management, security rules deployment, and rollback procedures for the Knot Just storefront.

---

## Table of Contents
1. [Pre-Deployment Storefront Verification](#1-pre-deployment-storefront-verification)
2. [Hosting & Infrastructure Plan (Gate D1)](#2-hosting--infrastructure-plan-gate-d1)
3. [Cloudinary Console Setup & Security Hardening (WS6)](#3-cloudinary-console-setup--security-hardening-ws6)
4. [EmailJS Origin Security Lockdown](#4-emailjs-origin-security-lockdown)
5. [Firebase Service Account & Server Environment Variables](#5-firebase-service-account--server-environment-variables)
6. [Cloud Firestore Security Rules Deployment & Verification (WS1 & WS5d)](#6-cloud-firestore-security-rules-deployment--verification-ws1--ws5d)
7. [Sentry Error Monitoring Configuration (WS8)](#7-sentry-error-monitoring-configuration-ws8)
8. [Google Analytics 4 & Consent Mode (WS8)](#8-google-analytics-4--consent-mode-ws8)
9. [Meta WhatsApp Cloud API Setup (WS10)](#9-meta-whatsapp-cloud-api-setup-ws10)
10. [Legal & Regulatory Review Checklist (Kenya DPA 2019)](#10-legal--regulatory-review-checklist-kenya-dpa-2019)
11. [Disaster Recovery & Rollback Runbook](#11-disaster-recovery--rollback-runbook)

---

## 1. Pre-Deployment Storefront Verification
1. Open the storefront in an incognito window or a mobile device viewport (baseline 360px width, e.g. Samsung Galaxy A12 / Safaricom network emulation).
2. Confirm the salon styles and bead products catalogs load smoothly from Firestore.
3. Open a product quick-view modal and verify the modal focus trap and tap-to-play TikTok embed facade function cleanly.
4. Add items to cart and inspect the cart drawer layout and responsive Cloudinary thumbnails.

---

## 2. Hosting & Infrastructure Plan (Gate D1)
1. Log into your Vercel Dashboard (`https://vercel.com`).
2. Review your account plan:
   - **Vercel Hobby:** Restricted to non-commercial personal projects.
   - **Vercel Pro ($20/month):** Required for commercial e-commerce storefronts processing customer payments and orders.
3. If running on Vercel Pro, ensure Function Region is set to `iad1` (US East) or closest to your Firebase database region to minimize round-trip database latency.

---

## 3. Cloudinary Console Setup & Security Hardening (WS6)
1. Log into the Cloudinary Management Console (`https://console.cloudinary.com`).
2. Navigate to **Settings > Upload > Upload presets**.
3. **Phase 1: Securing Legacy Unsigned Uploads (Immediate):**
   - Locate the preset configured in `VITE_CLOUDINARY_UPLOAD_PRESET`.
   - Set **Folder** to `catalog/`.
   - Set **Max file size** to `5 MB`.
   - Set **Allowed formats** to `jpg, png, webp` (explicitly disallow svg, html, pdf, mp4).
   - Uncheck **Allow overwrite**.
4. **Phase 2: Transitioning to Signed Uploads (WS6):**
   - In Cloudinary Settings, obtain your **API Key** and **API Secret**.
   - Create a dedicated signed upload preset (e.g. `knot_just_signed`) with:
     - Signing Mode: **Signed**.
     - Folder: `catalog/`.
   - Set server environment variables:
     - `CLOUDINARY_API_KEY`: Your Cloudinary API Key.
     - `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret.
5. **Physical Asset Deletion Verification:**
   - Verify that your Cloudinary API key has access to the Destroy API (`POST /image/destroy`).
   - When an admin deletes an asset in `AdminGallery.jsx`, the client calls `/api/delete-asset`, which signs and dispatches the destruction request to Cloudinary's servers.

---

## 4. EmailJS Origin Security Lockdown
1. Log into the EmailJS Dashboard (`https://dashboard.emailjs.com`).
2. Navigate to **Account > Security**.
3. Under **Allowed Domains / Origins**, enter:
   - `https://your-production-domain.com`
   - `https://your-project.vercel.app`
   - `http://localhost:5173` (for local development only).
4. Save changes. This prevents malicious actors from extracting `VITE_EMAILJS_PUBLIC_KEY` from client JavaScript bundles and abusing your monthly quota.

---

## 5. Firebase Service Account & Server Environment Variables
1. Open the Firebase Console (`https://console.firebase.google.com`).
2. Navigate to **Project Settings > Service Accounts**.
3. Under **Firebase Admin SDK**, select **Node.js** and click **Generate new private key**.
4. Download the generated JSON credentials file to a secure local folder (never commit this file).
5. Base64-encode the JSON file in your terminal:
   ```bash
   # Linux / macOS
   base64 -w 0 path/to/service-account.json
   ```
6. In your Vercel Project Settings under **Environment Variables**, configure the following:

| Variable Name | Environment | Value Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Production, Preview | Base64-encoded service account JSON string |
| `ADMIN_UIDS` | Production, Preview | Comma-separated Firebase Auth UIDs for authorized admins |
| `CLOUDINARY_API_KEY` | Production, Preview | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Production, Preview | Cloudinary API Secret |
| `ALLOWED_ORIGINS` | Production, Preview | e.g. `https://knotjust.co.ke,https://knotjust.vercel.app` |
| `VITE_USE_API_CHECKOUT` | Production | Set `false` initially; switch to `true` after verifying `/api/checkout` |
| `VITE_ANALYTICS_PROVIDER` | Production | `none` (default) or `ga4` |
| `VITE_GA4_MEASUREMENT_ID` | Production | `G-XXXXXXXXXX` (if GA4 is used) |
| `VITE_SENTRY_DSN` | Production | Sentry Project DSN (if error tracking is active) |
| `WHATSAPP_VERIFY_TOKEN` | Production | Custom secret token for Meta webhook handshake |
| `WHATSAPP_APP_SECRET` | Production | Meta App Secret from App Dashboard |
| `WHATSAPP_PHONE_NUMBER_ID`| Production | Meta WhatsApp Cloud API Phone Number ID |

---

## 6. Cloud Firestore Security Rules Deployment & Verification (WS1 & WS5d)

### Phase 1: Deploying Baseline Rules (WS1 - `firestore.rules`)
1. Open Firebase Console -> **Firestore Database** -> **Rules**.
2. Copy the contents of `firestore.rules` (Appendix A).
3. Replace `'PASTE_ADMIN_UID_HERE'` with your actual Firebase Auth user UID (from Firebase Console -> Authentication -> Users).
4. Click **Publish**.

### Rules Playground Test Matrix:
Execute these validation cases in Firebase Console -> Rules -> Rules Playground before launch:

| Test Case | Method | Document Path | Auth State | Payload | Expected Result |
|---|---|---|---|---|---|
| 1. Public Catalog Read | `get` / `list` | `/salon_styles/style1` | Unauthenticated | None | **ALLOW** |
| 2. Anonymous Valid Stock Decrement | `update` | `/bead_products/bead1` | Unauthenticated | `{ stock: 8 }` (before stock was 10) | **ALLOW** |
| 3. Anonymous Price Tampering | `update` | `/bead_products/bead1` | Unauthenticated | `{ price: 1, stock: 9 }` | **DENY** |
| 4. Anonymous Stock Increment | `update` | `/bead_products/bead1` | Unauthenticated | `{ stock: 15 }` (before stock was 10) | **DENY** |
| 5. Valid Customer Order | `create` | `/orders/order123` | Unauthenticated | Valid `validOrder()` payload | **ALLOW** |
| 6. Injected Malformed Order | `create` | `/orders/order123` | Unauthenticated | Extra keys / negative total | **DENY** |
| 7. Admin Catalog Write | `create` / `delete` | `/salon_styles/style2` | Authenticated (Admin UID) | Style document | **ALLOW** |

### Phase 2: Deploying Lockdown Rules (WS5d - `firestore.rules.v2`)
> [!CAUTION]
> **GATE PREREQUISITE:** Execute ONLY after setting `VITE_USE_API_CHECKOUT=true` and confirming backend orders succeed!
1. Copy the contents of `firestore.rules.v2`.
2. Replace `'PASTE_ADMIN_UID_HERE'` with your admin UID.
3. Click **Publish**.
4. In Rules Playground, re-test Case 2 and Case 5: both should now be **DENY** for unauthenticated users, confirming complete lockdown of client writes.

---

## 7. Sentry Error Monitoring Configuration (WS8)
1. Log into your Sentry account (`https://sentry.io`).
2. Create a new project: **React**.
3. Copy the **DSN** (`https://xxx@yyy.ingest.sentry.io/zzz`).
4. Set `VITE_SENTRY_DSN` in Vercel environment variables.
5. In Sentry Project Settings -> **Security & Privacy**:
   - Enable **Data Scrubber**.
   - Enable **Prevent Storing IP Addresses**.
6. Verify PII scrubbing: In a test environment, trigger an error with a mock Kenyan phone number (`0712345678`) and confirm in the Sentry dashboard that it appears as `[REDACTED_PHONE]`.

---

## 8. Google Analytics 4 & Consent Mode (WS8)
1. If Google Analytics 4 is desired:
   - Create a GA4 property in Google Analytics console.
   - Obtain your **Measurement ID** (`G-XXXXXXXXXX`).
   - Set in Vercel environment variables:
     - `VITE_ANALYTICS_PROVIDER=ga4`
     - `VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX`
2. Open the live storefront:
   - Confirm the `ConsentBanner.jsx` banner appears at the bottom.
   - Open browser DevTools Network tab: Verify that `googletagmanager.com/gtag/js` is **NOT loaded** until the customer explicitly clicks "Accept".
   - Click "Decline": Verify no tracking requests fire and preference is saved as `'denied'` in `localStorage`.

---

## 9. Meta WhatsApp Cloud API Setup (WS10)
1. Go to the Meta for Developers portal (`https://developers.facebook.com`).
2. Create an App -> Type: **Business**.
3. Under Products, add **WhatsApp**.
4. Set up WhatsApp Business Account and register your business phone number.
5. Under WhatsApp -> **Configuration**:
   - **Callback URL:** `https://your-domain.vercel.app/api/whatsapp`
   - **Verify Token:** Set to the exact value of your `WHATSAPP_VERIFY_TOKEN`.
   - Click **Verify and Save**. Meta will send a GET challenge request; `api/whatsapp.js` will respond with HTTP 200.
6. Under **Webhook fields**, click **Manage** and subscribe to `messages`.
7. Obtain your **App Secret** from App Settings -> Basic, and configure `WHATSAPP_APP_SECRET` in Vercel.

---

## 10. Legal & Regulatory Review Checklist (Kenya DPA 2019)
Before commercial launch, have Kenyan legal counsel review all sections marked `{/* TODO(legal-review) */}`:
- [ ] **Privacy Policy Section 3 & Embedded Media:** Disclosure of TikTok Player embed cookies and tap-to-play consent.
- [ ] **Privacy Policy Section 5:** Automated crash reporting disclosure (Sentry PII scrubbing).
- [ ] **Privacy Policy Section 6:** Cookie consent banner and analytics opt-in mechanism.
- [ ] **Privacy Policy Section 7:** Statutory enumeration of Data Subject Rights under Kenya Data Protection Act 2019 (right to access, rectification, erasure, and objection).
- [ ] **Terms of Service:** Salon appointment deposit policies, cancellation terms, and custom beadwork refund terms.
- [ ] **Data Retention:** Customer reference photos automatically purged from Cloudinary after 30 days.

---

## 11. Disaster Recovery & Rollback Runbook

### Rollback Scenario A: Backend API Checkout Degradation
If `/api/checkout` or `/api/booking` experiences downtime or high latency:
1. Open Vercel Project Settings -> **Environment Variables**.
2. Change `VITE_USE_API_CHECKOUT` from `true` to `false`.
3. Redeploy the latest production deployment.
4. The storefront instantly reverts to client-side Firestore transactions and bookings with zero downtime.

### Rollback Scenario B: Reverting Firestore Rules from v2 to v1
If lockdown rules were published prematurely:
1. Open Firebase Console -> Firestore Database -> Rules.
2. Paste the contents of `firestore.rules` (Appendix A).
3. Verify `'PASTE_ADMIN_UID_HERE'` contains your admin UID.
4. Click **Publish**. Client-side stock decrement carve-out is immediately restored.

### Rollback Scenario C: Cloudinary Upload Fallback
If backend signature generation fails:
1. The client-side `api.js` signed upload utility automatically detects signature failures and falls back to unsigned direct upload preset if available.
2. In Cloudinary Console, re-enable the fallback unsigned upload preset in emergency mode.
