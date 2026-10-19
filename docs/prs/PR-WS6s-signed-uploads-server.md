# PR: WS6s Signed Uploads & Cloudinary Server Endpoints

## Summary
Implements server-side Cloudinary upload signing and asset deletion endpoints, closing the unsigned upload security surface (Issue I3):
1. **Cloudinary Signature Core (`server/core/cloudinary.js`):**
   - Zero-dependency SHA-1 parameter signing implementation utilizing native Node `crypto`.
   - Strictly conforms to Cloudinary's signature specification (alphabetically sorted query strings with secret suffixing, ignoring non-signed keys).
2. **Admin Catalog Upload Signing (`api/sign-upload.js`):**
   - Admin-only endpoint protected by `requireAdmin` (Firebase Admin auth token verification against `ADMIN_UIDS`).
   - Scoped to `knot_just/catalog` (or requested sub-folders).
3. **Scoped Customer Reference Photo Signing (`api/sign-reference-upload.js`):**
   - Customer-facing upload signing scoped strictly to `knot_just/reference_photos`.
   - Rate-limited per IP (15 requests/min) to prevent abuse of image storage quotas.
4. **Cloudinary Asset Deletion Endpoint (`api/delete-asset.js`):**
   - Admin-only endpoint to destroy assets on Cloudinary via the official Destroy API (`https://api.cloudinary.com/v1_1/<cloudName>/image/destroy`).
   - Enables physical image cleanup when assets are deleted from the asset gallery.

## Key Changes
- `server/core/cloudinary.js`: Pure signature generation utilities (`generateCloudinarySignature`, `generateAdminUploadSignature`, `generateReferencePhotoSignature`, `generateDestroySignature`).
- `server/core/index.js`: Re-exported Cloudinary utilities.
- `server/adapters/authAdapter.js`: `requireAdmin` helper verifying Firebase tokens and checking `ADMIN_UIDS`.
- `api/sign-upload.js`: Signed upload parameters endpoint for admin catalog media.
- `api/sign-reference-upload.js`: Signed upload parameters endpoint for appointment reference photos.
- `api/delete-asset.js`: Cloudinary Destroy API proxy with signature generation.
- `tests/cloudinary.test.js`: 6 unit tests covering signature hashing, parameter exclusion, folder scoping, and public ID validation.

## Decision Log
- **Zero Third-Party Cloudinary SDK:** Cloudinary signatures and destroy API calls use standard `crypto.createHash('sha1')` and `fetch()`, adding 0 kB of runtime dependencies to the project.
- **Folder Scoping:** Reference photos uploaded by customers are strictly sandboxed into `knot_just/reference_photos` with signed timestamps, preventing unauthorized uploads to catalog paths.

## Verification
- `npm run lint`: 0 errors, 0 warnings.
- `npm run test:unit`: 53 passed, 0 failed (+6 tests covering Cloudinary signing).
- `npm run build`: Successful (client bundle unchanged at 816.17 kB raw / 244.28 kB gzip).

## Risks & Rollback
- Risk: Low. Endpoints operate independently; client migration to signed uploads happens in WS6c.
- Rollback: `git checkout feat/ws5b-adapters`.

## Human Steps
- Configure `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `ADMIN_UIDS` in the Vercel console or `.env`.

## Dependency
- Stacked on: `feat/ws5b-adapters` (@ `6a45917`).
