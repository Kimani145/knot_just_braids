/**
 * src/utils/tiktokStrategy.js
 * Strategy selector for TikTok photo-mode post rendering.
 *
 * Strategies:
 * - 'link-only': (Default / Safe) No iframe embedding for photo posts. Renders customer
 *   images in the carousel, a calm 'See original photo post on TikTok ↗' link below,
 *   and MediaPlaceholder if no images exist.
 * - 'embed-v2': Renders https://www.tiktok.com/embed/v2/{id} in an isolated iframe.
 * - 'player-v1': Renders https://www.tiktok.com/player/v1/{id} with documented image parameters.
 *
 * Re-test date: 2026-11-20 (review after owner runs human lab protocol)
 */

export const VALID_STRATEGIES = ['link-only', 'embed-v2', 'player-v1']

// Safe default: link-only
const DEFAULT_STRATEGY = 'link-only'

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
