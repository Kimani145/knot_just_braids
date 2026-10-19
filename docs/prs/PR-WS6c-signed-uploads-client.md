# PR: WS6c Client Signed Uploads & Canvas Compression

## Summary
Migrates client-side media uploads from unsigned presets to secure signed uploads, while introducing client canvas compression to dramatically cut data consumption on Kenyan mobile networks:
1. **Client-Side Image Compression (`src/utils/imageCompressor.js`):**
   - High-quality bicubic downscaling using HTML5 Canvas before uploading.
   - Constrains images to 1600px for admin catalog items and 1200px for customer reference photos, converting to WebP (with JPEG fallback).
   - Reduces a typical 8–12 MB smartphone camera capture to ~120–250 KB before transmission, providing major bandwidth savings for users on metered Safaricom cellular networks.
   - Safety guarantee: If a compressed blob is larger than the original file, or if running in a non-browser environment, the original file is preserved.
2. **API Client (`src/services/api.js`):**
   - Implements `fetchSignedUploadParams`, `fetchSignedReferenceUploadParams`, `deleteCloudinaryAsset`, and `uploadImageWithFallback`.
   - Supports safe environment variable extraction across both Vite client (`import.meta.env`) and Node (`globalThis.process.env`).
   - Graceful fallback: If signed upload endpoints are unreachable (e.g. offline dev), safely falls back to the configured preset with a clear advisory warning.
3. **Admin Image Uploader (`src/components/admin/ImageUploader.jsx`):**
   - Compresses images before upload.
   - Retrieves the admin's Firebase ID token and requests signed upload parameters for `knot_just/catalog`.
   - Records both `assetUrl` and `publicId` in Firestore `assets_metadata`.
4. **Customer Reference Photo Upload (`src/components/modals/BookingSheet.jsx`):**
   - Downscales customer reference photos to 1200px WebP.
   - Requests signed parameters scoped strictly to `knot_just/reference_photos`.
5. **Physical Cloudinary Asset Deletion (`src/components/admin/AdminGallery.jsx`):**
   - When deleting an asset, extracts `publicId` and calls `POST /api/delete-asset` via the admin auth token, physically cleaning up the asset on Cloudinary.

## Key Changes
- `src/utils/imageCompressor.js`: Canvas downscaling utility + aspect ratio calculations.
- `src/utils/imageCompressor.test.js`: Unit tests for dimension calculations and non-browser fallbacks.
- `src/services/api.js`: Signed upload client, asset deletion, and `extractCloudinaryPublicId`.
- `src/components/admin/ImageUploader.jsx`: Client pre-compression, signed upload, and `publicId` tracking.
- `src/components/modals/BookingSheet.jsx`: Pre-compression and signed reference photo uploads.
- `src/components/admin/AdminGallery.jsx`: Physical Cloudinary asset destruction upon metadata deletion.
- `tests/adapters.test.js`: Added unit tests for `extractCloudinaryPublicId`.

## Decision Log
- **Pre-Upload Compression:** Doing compression client-side prevents multi-megabyte transfers over slow mobile connections, directly improving upload success rates and cutting data costs.
- **Graceful Unsigned Fallback:** During transitional phases or offline development where backend functions are not active, the client gracefully falls back to the unsigned preset if present.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 58 passed, 0 failed (+5 tests covering image compressor and URL extraction).
- `npm run build`: Successful (821.41 kB raw / 245.88 kB gzip).

## Risks & Rollback
- Risk: Low. Fallback mechanisms preserve functionality if backend signing is unavailable.
- Rollback: `git checkout feat/ws6s-signed-uploads-server`.

## Human Steps
- None required.

## Dependency
- Stacked on: `feat/ws6s-signed-uploads-server` (@ `b37cb59`).
