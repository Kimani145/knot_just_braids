# Human Protocol: TikTok Embed Empirical Lab Verification

**Purpose:** Provide the store owner with clear, step-by-step instructions to run the local Lab v2 test harness across desktop and mobile devices to evaluate TikTok photo embed behavior and unblock future strategy switching.

---

## 1. Prerequisites & Serving the Lab

1. Open your terminal in the project directory.
2. Ensure the test harness `/tmp/tiktok-lab/index.html` exists.
3. Start a local HTTP server:
   ```bash
   python3 -m http.server 8080 --directory /tmp/tiktok-lab
   ```
4. Access the lab:
   - **On Desktop:** Open `http://localhost:8080/index.html`
   - **On Mobile (Same Wi-Fi):** Find your computer's local IP address (`ip route get 1.1.1.1` or `hostname -I`) and open `http://<YOUR_IP>:8080/index.html` on your phone.

---

## 2. Test Matrix & Protocol

### Step 1: Baseline Load
1. Click **"Mount Selected Tests"** with the default filter (*All Variants*).
2. Wait 5–10 seconds for initial network responses.

### Step 2: Evaluation Across Browsers
Run this check across as many of the following browser environments as available:
- [ ] **Chrome (Desktop):** Normal mode
- [ ] **Chrome (Desktop):** Incognito mode (third-party cookies blocked)
- [ ] **Safari (macOS / iOS):** With Intelligent Tracking Prevention (ITP)
- [ ] **Firefox (Desktop / Android):** Strict Tracking Protection
- [ ] **Brave:** Shields Enabled

### Step 3: What to Observe
For each photo post (`7681345289243905298`, `7679743513151655186`, etc.):
1. **`embed/v2` variant:**
   - Does a swipeable photo carousel appear inside the frame?
   - Does it render a blank black frame or cookie prompt?
   - Can you swipe or tap arrow buttons to navigate through photos?
2. **`player/v1 (Image Params)` variant:**
   - Does it load pictures or does it emit error `1001` (`INVALID_VIDEO`)?
3. **`player/v1 (Full Video Params)` variant:**
   - Confirm whether it fails with error 1001.
4. **Video Control (`7671327868349123848`):**
   - Confirm that official video embeds play normally.

---

## 3. Capturing & Submitting Evidence

1. **Download Event Logs:**
   - Scroll down to the bottom of the lab page and click the **"Download Logs (JSON)"** button.
   - Save the generated `tiktok-lab-logs-*.json` file.
2. **Screenshots:**
   - Take screenshots of:
     1. One `embed/v2` card on mobile and desktop.
     2. One `player/v1` card showing its state.
     3. The live event log table showing postMessage origins and types.
3. **Save Results:**
   - Place the JSON log into `docs/research/lab-logs/` (e.g. `docs/research/lab-logs/human-lab-desktop-chrome.json`).
   - Note your findings in your review comments.

---

## 4. Activating Strategy Once Verified

If `embed/v2` displays photos reliably across your tested devices and you wish to activate it in production:
1. Set the environment variable in your deployment:
   ```bash
   VITE_TIKTOK_PHOTO_STRATEGY=embed-v2
   ```
2. Re-deploy. The storefront will automatically mount `embed/v2` iframes for photo posts without requiring code changes.
