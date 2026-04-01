# Knot Just

Knot Just is a production-ready React + Vite platform that combines:

- salon booking workflows
- handcrafted beadwork e-commerce
- a secured admin command center
- real-time Firebase data synchronization

The project is designed for direct consumer use on the storefront and daily operations use by staff in the admin panel.

## Highlights

- Dual customer feed: Braids and Beads
- Real-time catalog sync from Firestore
- Booking, cart, checkout, and order flows
- Admin authentication with Firebase Auth
- Admin dashboard, history ledger, urgent alerts, and reminder actions
- Cloudinary-based asset pipeline with gallery republish tools
- Light and dark theme support
- Vercel-ready SPA routing via rewrites
- PWA baseline assets: favicons, Apple touch icon, manifest, and theme-color metadata

## Tech Stack

- React 19
- Vite 8
- Firebase Authentication
- Cloud Firestore
- Cloudinary
- EmailJS
- Vercel Speed Insights

## Project Status

This repository reflects the current production baseline for Knot Just, including admin UX enhancements, routing hardening, and branding/PWA setup.

## Quick Start

1. Install dependencies

npm install

2. Create an environment file from the template

cp .env.example .env.local

3. Fill in required environment variables (see Environment Variables section)

4. Start development server

npm run dev

5. Open the app

http://localhost:5173

6. Build production bundle

npm run build

7. Preview production build

npm run preview

## Environment Variables

Use .env.local at the project root.

Required Firebase and media variables:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_CLOUDINARY_CLOUD_NAME
- VITE_CLOUDINARY_UPLOAD_PRESET

Required for admin reminder and transactional email workflows:

- VITE_EMAILJS_PUBLIC_KEY
- VITE_EMAILJS_SERVICE_ID
- VITE_EMAILJS_MASTER_TEMPLATE or VITE_EMAILJS_MASTER_TEMPLATE_ID

Reference example:

VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_MASTER_TEMPLATE=your_emailjs_template_id

## Routing and Deployment

Knot Just uses client-side route switching for storefront and admin views.

- / renders client storefront
- /admin renders admin login or admin command center

For production SPA routing on Vercel, rewrites are configured in [vercel.json](vercel.json).

## PWA and Branding Assets

Branding and installability assets are served from public:

- favicon.ico
- favicon-16x16.png
- favicon-32x32.png
- apple-touch-icon.png
- site.webmanifest

The HTML entry point includes full favicon links, Apple touch icon, manifest link, and theme-color metadata in [index.html](index.html).

## Core Product Flows

### Storefront

- Theme-aware navigation and feed toggle
- Live salon and bead catalogs from Firestore
- Booking request modal for salon services
- Cart and checkout modals for bead purchases
- Local persistence for selected feed and shopper details

### Admin

- Auth-gated access at /admin
- Login with password visibility toggle and reset support
- Dashboard and history views
- Urgent alerts for near-term pending actions
- Reminder modal with WhatsApp/email pathways
- Security dialog and session controls
- Inventory edits and republish from asset gallery

## Firestore Collections

Current application collections:

- salon_styles
- bead_products
- bookings
- orders
- assets_metadata

Collection constants are defined in [src/constants/catalog.js](src/constants/catalog.js).

## Folder Structure

- [src/components/client](src/components/client): storefront UX
- [src/components/admin](src/components/admin): admin command center and operations tools
- [src/components/modals](src/components/modals): booking, cart, checkout, and policy overlays
- [src/components/layout](src/components/layout): nav, footer, feed toggle, and skeletons
- [src/utils](src/utils): formatting, email, and storage helpers
- [public](public): static branding/PWA assets

## Operations Notes

- Keep Firestore security rules aligned with admin-only write operations.
- Ensure Cloudinary preset is unsigned only if constrained by strict upload rules.
- Validate EmailJS keys in each environment to avoid reminder delivery failures.
- Use Vercel rewrite config for all non-file routes to prevent 404 on hard refresh.

## Scripts

- npm run dev
- npm run build
- npm run preview
- npm run lint

## Changelog Snapshot

Recent updates reflected in this documentation:

- Admin UX expansion: dashboard/history toggle, urgent alerts, reminder modal, security workflow
- Improved admin login UX including password visibility control
- Footer cleanup removing storefront staff portal trigger
- Light theme contrast and mobile header alignment hardening
- Added vercel.json SPA rewrites
- Added production favicon suite and web manifest wiring

## License

Private project. All rights reserved unless explicitly stated by repository owner.
