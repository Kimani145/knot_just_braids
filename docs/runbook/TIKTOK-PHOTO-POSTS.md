# Runbook: Managing TikTok Photo Posts & Catalog Media

This runbook guides the store owner on attaching photos to styles that currently only feature TikTok photo links, and toggling embed strategies safely.

---

## 1. Why Photo-Post Styles Require Uploaded Photos

The 8 salon styles (`Sisterlocs N-R`, `Braided Style N-R`, `Ponytail N-R`, etc.) were imported with links to TikTok photo carousels in their `videos` field, but have `assetUrl: ""` and zero uploaded images in Firestore.

Because TikTok's official oEmbed API refuses direct embedding of `/photo/` posts (HTTP 400), the storefront uses the safe **`link-only`** strategy by default:
- It highlights your uploaded photos in the quick-view swipe carousel.
- It provides a prominent, direct link to `"See the original photo post on TikTok ↗"`.
- If an item has NO images uploaded, customers see a clean `"Photos on TikTok"` placeholder card instead of an interactive photo carousel.

---

## 2. Step-by-Step: Adding Photos in the Admin Portal

1. Log into your Admin Portal at `/admin`.
2. Look at the **Catalog Health** banner at the top of the inventory view.
3. Items flagged with `photo-post-without-images` will have a convenient **"Add photos"** button.
4. Click **"Add photos"** (or click **Edit** on any style in the Salon Manager list).
5. In the Edit Style modal:
   - Scroll to the **Cover Image / Photos** section.
   - Drop or browse photo files for this hairstyle.
   - Verify that the image uploader compresses and uploads the pictures to Cloudinary.
   - (Optional) Confirm or adjust the hairstyle name, description, and pricing.
   - Click **Save**.
6. Check the live storefront:
   - The style will now display your real uploaded pictures in the customer carousel, with the link to TikTok right below it!

---

## 3. Re-running the Empirical Embed Lab

To test whether TikTok has enabled official photo carousel embedding in your region or across devices:
1. Follow the instructions in `docs/research/LAB-HUMAN-PROTOCOL.md`.
2. Serve the lab harness:
   ```bash
   python3 -m http.server 8080 --directory /tmp/tiktok-lab
   ```
3. Open `http://localhost:8080/index.html` in your browser.
4. Review the `embed/v2` and `player/v1` columns.
5. If `embed/v2` renders photos cleanly on your target devices, toggle the strategy flag in your `.env` or Vercel dashboard:
   ```env
   VITE_TIKTOK_PHOTO_STRATEGY=embed-v2
   ```
   Deploy to activate.
