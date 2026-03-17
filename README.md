# GlowBook

GlowBook is a Vite + React storefront and admin dashboard for a salon and beadwork shop. It includes booking, cart flow, and an asset gallery backed by Cloudinary + Firestore.

## Quick Start

1. npm install
2. npm run dev
3. Open http://localhost:5173

## Admin

- The admin dashboard lives at `/admin` and is not linked from the client UI.

## Configuration

- Firebase: update `src/firebase.js` with your project keys.
- Cloudinary: update `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in `src/components/admin/ImageUploader.jsx`.
- Firestore: assets are stored in the `assets_metadata` collection.

## Project Structure

- `src/components/client` client storefront UI
- `src/components/admin` admin dashboard and asset gallery
- `src/components/modals` booking, cart, and checkout sheets
- `src/components/layout` navigation, footer, and feed toggle
- `src/utils` shared helpers

## Notes

- Prices are stored as numbers and rendered via `src/utils/formatCurrency.js`.
