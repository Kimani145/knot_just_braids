# Lab Logs & Empirical Test Data

This directory contains verified, timestamped logs from empirical testing of TikTok embeds and oEmbed endpoints.

## Files
1. `curl-oembed-results.json`:
   - Raw output from testing all 7 requested photo posts (`7681345289243905298`, `7679743513151655186`, `7615692003048721671`, `7578240185691819276`, `7616082104308272392`, `7578246008988011788`, `7682109303737552136`) and 2 video control posts (`7671327868349123848`, `7682424844671012114`).
   - Results:
     - Direct `/photo/` oEmbed $\rightarrow$ `HTTP 400` across 100% of photo posts.
     - Rewritten `/video/` oEmbed $\rightarrow$ `HTTP 200`, returning an iframe to `player/v1/{id}` (which in-browser errors with `1001 INVALID_VIDEO`).
     - Video controls $\rightarrow$ `HTTP 200`, returning full video embed HTML.
2. Lab Test Harness:
   - Located at `/tmp/tiktok-lab/index.html` (outside git repo).
   - Servable via `python3 -m http.server 8080 --directory /tmp/tiktok-lab`.
   - Instructions for human browser verification across desktop and mobile are documented in `docs/research/LAB-HUMAN-PROTOCOL.md`.
