# Lab Logs & Empirical Test Data

This directory contains verified, timestamped logs from empirical testing of TikTok embeds and oEmbed endpoints.

## Files
1. `browser-2026-10-22.json`:
   - Empirical browser test log generated 2026-10-22T06:51:35.596Z from Chrome (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36`).
   - Evaluated 5 iframe variants across photo and video post IDs:
     - **V1 (WINNER): Official oEmbed iframe without sandbox:**
       - URL: `https://www.tiktok.com/player/v1/{id}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1`
       - Allow: `accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share`
       - Sandbox: `null` (no sandbox attribute).
       - Results: Successfully hydrated photo carousel! Emitted `onPlayerReady`, `onStateChange`, `onCurrentTime`, and `onImageChange`. Human verification recorded `seen: true`. Video controls also loaded successfully (`ready`).
     - **V2: Official player with 5-flag app sandbox:** Emitted timeouts / lacked consistent visual rendering.
     - **V3 & V4: Sandboxed variants with custom or minimal params:** Threw `onPlayerError` with `3002 AUTOPLAY_ERROR`.
     - **V5: Legacy embed/v2:** Timed out without emitting player lifecycle events.
2. `curl-oembed-results.json`:
   - Raw output from testing all 7 requested photo posts (`7681345289243905298`, `7679743513151655186`, `7615692003048721671`, `7578240185691819276`, `7616082104308272392`, `7578246008988011788`, `7682109303737552136`) and 2 video control posts (`7671327868349123848`, `7682424844671012114`).
   - Results:
     - Direct `/photo/` oEmbed request $\rightarrow$ `HTTP 400` ("Something went wrong").
     - Rewritten `/video/` oEmbed request $\rightarrow$ `HTTP 200`, returning TikTok's official iframe markup: `<iframe height="578" width="325" src="https://www.tiktok.com/player/v1/{id}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`.
3. Lab Test Harness:
   - Preserved in repository at `docs/research/lab/tiktok-lab.html`.
