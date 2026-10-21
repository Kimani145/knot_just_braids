# Workstream 0: Recon & Storefront Reproduction Findings

**Date:** 2026-10-21  
**Target:** Public Storefront (`https://knotjustbraids.vercel.app`) & Live Catalog  

---

## 1. Symptom Diagnosis & Root Cause Classification

### Symptom A: Tapping a photo-post tile on the storefront shows the fallback card almost instantly, with no photos
- **Classification:** **(b) TikTok-side** + **(a) Our Bug**
- **Root Cause Details:**
  1. TikTok's official oEmbed endpoint (`https://www.tiktok.com/oembed?url=...`) returns `HTTP/2 400 {"message":"Something went wrong","code":400}` for all public `/@knot.justbraids/photo/{id}` URLs.
  2. The previously merged PR-C attempted client-side/serverless oEmbed for photo posts. Upon receiving HTTP 400 from TikTok, it immediately transitioned to the fallback card.
  3. When the URL was rewritten to `/@knot.justbraids/video/{id}`, TikTok's oEmbed returned an iframe pointing to `player/v1/{id}`, which fails in the browser with error `1001 INVALID_VIDEO` ("Invalid Media ID, no video/photo found").

### Symptom B: Photo-post styles ("... N-R" styles) look empty: the card has no pictures at all
- **Classification:** **(c) Data Problem**
- **Root Cause Details:**
  1. Direct inspection of the live Firestore collection (`salon_styles`) via REST confirmed that all 8 `... N-R` salon style documents:
     - `Braided Style N-R`
     - `Sisterlocs N-R`
     - `Ponytail N-R`
     - `Natural Hairstyle N-R`
     - `Afro Wig N-R`
     - `Invincible Locs N-R`
     - `Spring Twists N-R`
     - `Distressed Locs N-R`
     have `assetUrl: ""` and NO `images` array attached.
  2. The only media attached to these styles is TikTok photo links in the `videos` array.
  3. Because the items have zero uploaded images of their own (`assetUrl === ''` and `images.length === 0`), `coverImage` was `undefined`. When the fallback card rendered, it fell back to `<MediaPlaceholder bare>` which rendered only an icon and title, with zero pictures.

### Symptom C: Cloudinary Image Optimization Audit (`cld()` / `getOptimizedCloudinaryUrl`)
- **Classification:** **Clean / Verified Working**
- **Inspection Details:**
  1. Inspected bead products in Firestore (`bead_products`):
     - `Hair Charms` (`pHYkueSKxxeHKs5a7JJj`): image `https://res.cloudinary.com/dgtcve0py/image/upload/v1789892794/atzkwren8drs6gou5hrn.jpg`
     - `Hair Charms` (`P3yyc8bRx0e0sSQCsFuk`): image `https://res.cloudinary.com/dgtcve0py/image/upload/v1789892925/rifaeumbpqxeiszacztc.jpg`
     - `Waist Beads` (`rzm9bS9KyOBl0qV3bJnc`): image `https://res.cloudinary.com/dgtcve0py/image/upload/v1789894057/yf11lgcunzsy0d71qyjn.jpg`
     - `Bracelet` (`xRUBiPwad0UhJZ4UGZUJ`): image `https://res.cloudinary.com/dgtcve0py/image/upload/v1789894229/a1rbywl6gbbxvbjjz6ky.jpg`
  2. Tested transformed URLs via live HTTP HEAD requests:
     - `https://res.cloudinary.com/dgtcve0py/image/upload/f_auto,q_auto,w_450,c_limit/v1789892794/atzkwren8drs6gou5hrn.jpg`
     - Result: `HTTP/2 200`, `content-type: image/jpeg`, reduced from ~3MB to 29kB.
  3. Verified `src/utils/cloudinaryUrl.js`:
     - Preserves non-Cloudinary URLs unmodified.
     - Handles empty/null gracefully.
     - Avoids duplicate `f_auto,q_auto` transformations if already present.

---

## 2. Summary of Required Actions
1. **Security (W1):** Remove `api/tiktok-oembed.js` and `src/utils/tiktokOembed.js` (remote HTML injection and `embed.js` script load).
2. **Strategy (W3):** Set default `PHOTO_EMBED_STRATEGY = 'link-only'`, which prevents photo posts from attempting broken embeds or showing empty fallback spinners.
3. **UX (W4):** Photo posts under `link-only` are not rendered as video slides; instead, show customer images in the carousel and render a calm "See original photo post on TikTok ↗" link row below. If an item has NO images, display `MediaPlaceholder` with a clean "Photos on TikTok" link affordance.
4. **Admin (W5):** Add admin guidance in `VideoLinksField` and a new catalog lint rule `photo-post-without-images` directing the owner to upload photos for the 8 N-R styles.
