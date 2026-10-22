/**
 * src/utils/tiktokStrategy.js
 * Strategy selector for TikTok photo-mode post rendering.
 *
 * Strategies correspond to profiles defined in src/utils/tiktokProfiles.js:
 * - 'official-player': (Default - V1 Winner) Verified working profile without sandbox.
 *   Uses official oEmbed query parameters and official allow permissions.
 * - 'official-player-sandboxed': (V2) Official parameters with 5-flag sandbox.
 * - 'minimal-player': (V4) Minimal player/v1 without custom query parameters.
 * - 'embed-v2': (V5) Legacy embed/v2 endpoint.
 * - 'link-only': Safe fallback; no iframe embedding.
 *
 * Verified empirically in lab testing on 2026-10-22 (docs/research/lab-logs/browser-2026-10-22.json).
 * Re-test date: 2026-11-20
 */

import { TIKTOK_IFRAME_PROFILES } from './tiktokProfiles.js'

export const VALID_STRATEGIES = Object.keys(TIKTOK_IFRAME_PROFILES)

// V1 Winner: official-player verified in browser lab
export const DEFAULT_STRATEGY = 'official-player'

// Feature flag / kill-switch override via VITE_TIKTOK_PHOTO_STRATEGY
const envStrategy =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_TIKTOK_PHOTO_STRATEGY
    ? String(import.meta.env.VITE_TIKTOK_PHOTO_STRATEGY).trim().toLowerCase()
    : null

export const PHOTO_EMBED_STRATEGY =
  envStrategy && VALID_STRATEGIES.includes(envStrategy)
    ? envStrategy
    : DEFAULT_STRATEGY

export function isPhotoEmbedEnabled() {
  return PHOTO_EMBED_STRATEGY !== 'link-only'
}
