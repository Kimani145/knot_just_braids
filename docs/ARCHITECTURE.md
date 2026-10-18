# System Architecture

## Overview
Knot Just is a mobile-first e-commerce and salon booking application tailored for Kenyan mobile users (360px viewport baseline, Safaricom mobile data networks).

```
                        ┌──────────────────────────────────────────────┐
                        │              Customer Client                 │
                        │ (React 19 + Vite 8 SPA, Tailwind/Vanilla CSS)│
                        └──────────────┬───────────────────────────────┘
                                       │
                 ┌─────────────────────┼─────────────────────┐
                 │ (Public Read)       │ (Order Submit)      │ (Direct Assets)
                 ▼                     ▼                     ▼
        ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
        │ Cloud Firestore │   │  Vercel Server  │   │   Cloudinary    │
        │ Catalog Read    │   │  /api/checkout  │   │  CDN Media CDN  │
        └─────────────────┘   └────────┬────────┘   └─────────────────┘
                                       │ (Admin SDK)
                                       ▼
                              ┌─────────────────┐
                              │ Cloud Firestore │
                              │ Locked /orders/ │
                              └─────────────────┘
```

## Layers
1. **Presentation (Client):**
   - React 19.2 Single Page Application built with Vite 8.
   - Core storefront for salon appointment requests and handcrafted beadwork purchasing.
   - Tap-to-play TikTok embed facade for video previews with zero initial network overhead.
   - WAI-ARIA compliant modal sheets for checkout, bookings, and product quick-views.
2. **Serverless Application Layer (`server/core` & `api/`):**
   - Thin Vercel HTTP adapters (`api/checkout.js`, `api/booking.js`, `api/catalog.js`, `api/sign-upload.js`).
   - Host-agnostic business logic in `server/core/` (validation, authoritative pricing, rate limiting, redacting logger).
3. **Data Layer (Firebase & Firestore):**
   - Collections: `bead_products`, `salon_styles`, `orders`, `bookings`, `assets_metadata`.
   - Firestore Security Rules enforce strict authorization: public reads on catalogs, admin-only writes, and backend service-account order writes.
4. **Media Pipeline (Cloudinary):**
   - Signed uploads for admin catalog assets.
   - Restricted customer reference photo uploads with client-side image downscaling (1280px, WebP ~80%) to strip EXIF data and optimize mobile bandwidth.
