# Research Synthesis: TikTok Photo Post Embedding & Technical Evidence

**Date:** 2026-10-21  
**Author:** Knot Just Engineering  
**Evidence Source:** Raw curl logs under `docs/research/lab-logs/curl-oembed-results.json` and official documentation at `developers.tiktok.com/doc/embed-player`.

---

## 1. Executive Summary & Clarifications

Earlier documentation incorrectly stated that TikTok's official `/player/v1/` endpoint was strictly a video-only player. A rigorous review of the official documentation and live API responses reveals:
1. **Documented Types:** TikTok's Embed Player API documentation explicitly lists both `"video"` and `"image"` under supported post types.
2. **Carousel-Specific Events:** The documented postMessage interface includes image-mode specific commands and notifications: `navigateTo` and `onImageChange`.
3. **Video-Only Parameters:** Autoplay, loop, progress bar, play button, timestamp, and closed captions are officially flagged as video-only.
4. **Error 1001 Meaning:** Officially defined as `"Invalid Media ID, no video/photo found"`.
5. **Empirical Behavior:** Despite documentation stating `"video, image"` support, practical embedding of image slideshows using `/player/v1/` often results in error 1001 when video parameters are passed or when TikTok restrictions apply.

---

## 2. Empirical Test Results (Lab Matrix)

### A. oEmbed Endpoint Analysis (`https://www.tiktok.com/oembed?url=...`)

All 7 public photo post IDs for `@knot.justbraids` were tested via curl. Full logs are recorded in `docs/research/lab-logs/curl-oembed-results.json`.

| Post ID | Type | Direct oEmbed URL Status | Rewritten `/video/` oEmbed Status | oEmbed Returned Payload |
| :--- | :---: | :---: | :---: | :--- |
| `7681345289243905298` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` (fails in-browser with 1001) |
| `7679743513151655186` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` |
| `7615692003048721671` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` |
| `7578240185691819276` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` |
| `7616082104308272392` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` |
| `7578246008988011788` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` |
| `7682109303737552136` | Photo | **HTTP 400** | **HTTP 200** | Returns iframe to `/player/v1/{id}` |
| `7671327868349123848` | Video (Control) | N/A | **HTTP 200** | Returns valid video embed HTML |
| `7682424844671012114` | Video (Control) | N/A | **HTTP 200** | Returns valid video embed HTML |

**Direct Output from TikTok oEmbed for Photo URLs:**
```json
HTTP/2 400
{"message":"Something went wrong","code":400}
```

### B. WordPress Trac Ticket #64941 Lead: `embed/v2`

The WordPress Trac lead indicated that TikTok renders carousels through `https://www.tiktok.com/embed/v2/{id}`.
- Direct curl testing confirmed `embed/v2/{id}` returns `HTTP/2 200` with TikTok's Frontity-based standalone card markup.
- However, `embed/v2` is undocumented, relies on third-party cookies for some interactive features, and does not emit standard postMessage events.
- Because automated headless browser validation cannot run in sandboxed CI without display/snap support, this path is implemented under the feature flag `PHOTO_EMBED_STRATEGY = 'embed-v2'` for human testing, but is NOT the default.

---

## 3. Selected Strategy: `link-only`

### Rationale
1. **Zero Origin Vulnerability:** Eliminates third-party scripts and remote HTML injection.
2. **True UX:** Customers are never subjected to failing iframes, broken players, or mysterious spinners.
3. **Primary Experience:** Real customer photos uploaded to Firestore/Cloudinary are swiped in the carousel. The single link row `"See the original photo post on TikTok ↗"` provides an authentic gateway to the creator's TikTok post.
