# Knot Just

Knot Just is the Phase 1 MVP for a dual-feed beauty commerce platform: salon services on one side, beadwork retail on the other. The application combines a client-facing storefront, a secured admin command center, Cloudinary-backed asset uploads, Firestore-powered live catalog data, and Firebase Authentication for protected admin access.

## Phase 1 Delivery

Phase 1 established the production-ready MVP foundation across product, operations, and security:

- Rebranded the platform from GlowBook to Knot Just, including navigation, feed labels, admin surfaces, and a premium green visual system.
- Moved sensitive Cloudinary configuration into Vite environment variables.
- Migrated core catalog writes to Firestore for salon styles and bead products.
- Added live Firestore listeners so the client catalog updates in real time without reloads.
- Implemented an admin asset gallery backed by the `assets_metadata` collection.
- Added professional skeleton loading states across client and admin surfaces while Firestore resolves.
- Secured the admin route with Firebase Authentication, including sign-in, password reset, sign-out, and in-app password change controls.
- Added local storage persistence for client contact details and active feed selection.
- Added transactional checkout inventory protection so bead product stock is validated and decremented atomically before an order is created.

## Tech Stack

- Vite
- React
- Firebase Authentication
- Cloud Firestore
- Cloudinary

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `glowbook/.env.local` from the example file and provide your Firebase and Cloudinary credentials.

3. Start the development server:

```bash
npm run dev
```

4. Open the Vite URL shown in the terminal, typically `http://localhost:5173`.

## Environment Variables

The app expects Vite-prefixed environment variables in `glowbook/.env.local`.

```dotenv
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

## Runtime Architecture

### Client Experience

- Feed toggle between salon services and beadwork retail
- Live catalog rendering from Firestore
- Booking request flow for salon services
- Cart and checkout flow for bead purchases
- Local client detail autofill for repeat submissions

### Admin Command Center

- Protected `/admin` route with Firebase Authentication
- Secure login, password reset, and in-app password update
- Firestore-backed creation and deletion for salon styles and bead products
- Asset upload pipeline through Cloudinary with Firestore metadata logging
- Operational dashboard with live counts and loading placeholders

## Firestore Collections

- `salon_styles`
- `bead_products`
- `assets_metadata`
- `orders`

## Project Structure

- `src/components/client` contains storefront and catalog experiences
- `src/components/admin` contains the command center, security, and asset management UI
- `src/components/modals` contains booking, cart, and checkout flows
- `src/components/layout` contains navigation, feed controls, footer, and skeleton components
- `src/constants` contains shared collection names and design tokens used by the catalog
- `src/utils` contains formatting and local-storage helpers

## Quality Notes

- Prices are stored as numeric values and rendered with `src/utils/formatCurrency.js`.
- Checkout inventory changes are handled in a Firestore transaction to avoid overselling during concurrent purchases.
- Admin access depends on Firebase Authentication and should be paired with Firestore security rules in the Firebase console.

## Next Phase

Phase 1 is complete. Phase 2 will extend the platform with deeper operational workflows, broader Firestore coverage for bookings and orders, and stronger production hardening.
