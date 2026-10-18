# Human Runbook: Production Setup & Operational Steps

This runbook documents all human-only deployment, security, and account configuration steps.

---

## Step 1: Pre-Deployment Baseline Verification
1. Open the storefront in an incognito mobile browser (or 360px device emulation).
2. Verify catalog loads, quick view opens via portal, and tap-to-play video embeds operate without breaking layout.
3. Test a legacy checkout to confirm live behavior before switching flags.

---

## Step 2: Hosting & Infrastructure Evaluation (Gate D1)
1. Log into your Vercel dashboard.
2. Confirm whether the deployment is on Vercel Hobby or Vercel Pro.
   - *Note:* If commercial transactions are processed, consider upgrading to Vercel Pro or configuring Cloudflare Workers adapter for `/api`.

---

## Step 3: Cloudinary Security Clamping (Gate D6 / WS6)
1. Log into Cloudinary Console (`https://console.cloudinary.com`).
2. Navigate to **Settings > Upload > Upload Presets**.
3. Locate the existing unsigned preset (`VITE_CLOUDINARY_UPLOAD_PRESET`):
   - Set **Folder** to `customer_references/` (prevents polluting root or catalog).
   - Set **Max file size** to `5 MB`.
   - Set **Allowed formats** to `jpg, png, webp` (disallow svg, html, pdf, mp4).
   - Uncheck **Allow overwrite**.
4. Once **WS6c** (signed uploads) is deployed and verified:
   - Switch the upload preset mode from **Unsigned** to **Signed** to permanently close anonymous upload abuse.

---

## Step 4: EmailJS Origin Restriction
1. Log into EmailJS Dashboard (`https://dashboard.emailjs.com`).
2. Navigate to **Account > Security**.
3. Under **Allowed Domains / Origins**, restrict API requests strictly to your verified domain (e.g. `https://knotjust.vercel.app` and `http://localhost:5173` for testing).
4. This prevents third parties from stealing your public key and sending spam using your monthly email quota.

---

## Step 5: Firebase Service Account & Environment Variables
1. Open Firebase Console (`https://console.firebase.google.com`).
2. Navigate to **Project Settings > Service Accounts**.
3. Click **Generate new private key** (downloads a JSON credentials file).
4. Base64-encode the JSON file in your terminal:
   ```bash
   base64 -w 0 <path-to-service-account>.json
   ```
5. In your Vercel project settings (Environment Variables), set:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: The base64 string from above.
   - `ADMIN_UIDS`: Comma-separated list of Firebase Auth UIDs authorized as admins.
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key.
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret.
   - `ALLOWED_ORIGINS`: Comma-separated allowed CORS origins.
   - `APPCHECK_ENFORCE`: `false` initially; set `true` after registering app with reCAPTCHA Enterprise.

---

## Step 6: Deploying & Verifying Firestore Security Rules
1. **Initial Deployment (WS1 - Appendix A):**
   - Copy the contents of `firestore.rules` (which includes the temporary anonymous stock decrement carve-out).
   - In Firebase Console > Firestore Database > Rules, paste and deploy.
   - Replace `'PASTE_ADMIN_UID_HERE'` with your actual admin UID(s).

2. **Rules Playground Test Case Matrix:**
   Test these cases in Firebase Console > Rules > Rules Playground before public launch:
   - **Case 1: Anonymous Read Catalog (`/bead_products/p1`, `/salon_styles/s1`)**
     - Type: `get` / `list`
     - Auth: Unauthenticated
     - Expected: **ALLOW**
   - **Case 2: Anonymous Valid Stock Decrement (`/bead_products/p1`)**
     - Type: `update`
     - Auth: Unauthenticated
     - Data: `{ stock: 8 }` on existing doc `{ stock: 10 }` (delta <= 50, only `stock` changed)
     - Expected: **ALLOW**
   - **Case 3: Anonymous Price Tampering (`/bead_products/p1`)**
     - Type: `update`
     - Auth: Unauthenticated
     - Data: `{ price: 1, stock: 9 }`
     - Expected: **DENY** (only `stock` is permitted to change)
   - **Case 4: Anonymous Stock Increment or Negative Stock (`/bead_products/p1`)**
     - Type: `update`
     - Auth: Unauthenticated
     - Data: `{ stock: 15 }` (increment) or `{ stock: -1 }` (negative)
     - Expected: **DENY**
   - **Case 5: Anonymous Order Creation (`/orders/ord1`)**
     - Type: `create`
     - Auth: Unauthenticated
     - Data: Valid payload matching `validOrder()` (`status: 'pending'`, `agreedToPolicy: true`, `createdAt: request.time`, bounded `total` and `lineItems`)
     - Expected: **ALLOW**
   - **Case 6: Malformed Order Creation (`/orders/ord1`)**
     - Type: `create`
     - Auth: Unauthenticated
     - Data: Injected fields like `{ total: -50 }` or `{ status: 'completed' }` or extra unknown keys
     - Expected: **DENY**
   - **Case 7: Admin Write Any Collection**
     - Type: `create` / `update` / `delete`
     - Auth: Authenticated with UID in `isAdmin()` allowlist
     - Expected: **ALLOW**

3. **Hardened Cut-Over (WS5d - Rules v2):**
   - **DO NOT APPLY UNTIL THE API CHECKOUT IS CONFIRMED LIVE AND `VITE_USE_API_CHECKOUT=true`!**
   - Deploy the v2 rules from `firestore.rules.v2` which completely lock down writes to admin UIDs and backend service accounts.

---

## Step 7: Meta WhatsApp Cloud API Setup (Gate D3 / WS10)
1. Go to Meta Developers (`https://developers.facebook.com`).
2. Create a Business App and add the **WhatsApp** product.
3. Configure the webhook URL to: `https://your-domain.vercel.app/api/whatsapp-webhook`.
4. Enter your custom `WHATSAPP_VERIFY_TOKEN`.
5. Subscribe to the `messages` webhook field.
6. Submit transactional utility templates for order receipts and appointment confirmations for Meta approval.

---

## Step 8: Legal & Regulatory Review Checklist (Kenya DPA 2019)
- [ ] Review customer photo retention policy (automatic purge after 30 days recommended).
- [ ] Ensure affirmative consent checkbox is selected before checkout and booking submission.
- [ ] Verify terms and privacy policy disclosures at `/privacy` and `/terms`.
