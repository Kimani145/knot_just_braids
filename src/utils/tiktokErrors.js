/**
 * src/utils/tiktokErrors.js
 * Error mapping for TikTok Embed Player postMessage errors and playback states.
 */

export const TIKTOK_PLAYER_ERRORS = {
  1001: 'invalid-or-unsupported-media',
  2001: 'embed-load-failure',
  3001: 'player-timeout',
  3002: 'player-runtime-failure',
}

export const TIKTOK_DOCS_ERROR_NAMES = {
  1001: 'INVALID_VIDEO',
  2001: 'SERVER_ERROR',
  3001: 'PLAYBACK_ERROR',
  3002: 'AUTOPLAY_ERROR',
}

export function isRetryableError(code) {
  const numeric = Number(code)
  // 1001 INVALID_VIDEO is permanent; never show retry
  if (numeric === 1001) return false
  return true
}

export const TIKTOK_PLAYER_MESSAGES = {
  'invalid-or-unsupported-media': {
    title: 'Content unavailable for direct playback',
    desc: 'This post is not available for embedded playback or is restricted by TikTok.',
  },
  'embed-load-failure': {
    title: 'TikTok service unreachable',
    desc: 'Failed to connect to TikTok embed services. Please verify your connection.',
  },
  'player-timeout': {
    title: 'Playback timed out',
    desc: 'The TikTok player took too long to load on this connection.',
  },
  'player-runtime-failure': {
    title: 'Playback blocked',
    desc: 'Autoplay was restricted by browser settings. Tap to retry.',
  },
  'unknown': {
    title: 'Could not load player',
    desc: 'Unable to stream this TikTok post directly.',
  },
}

/**
 * Maps a numeric or string error code from TikTok player's onPlayerError event
 * to a standardized error key.
 *
 * @param {number|string} code
 * @returns {string} Error key matching TIKTOK_PLAYER_ERRORS or 'unknown'
 */
export function mapPlayerError(code) {
  const numericCode = Number(code)
  if (TIKTOK_PLAYER_ERRORS[numericCode]) {
    return TIKTOK_PLAYER_ERRORS[numericCode]
  }
  return 'unknown'
}

/**
 * Returns calm user-facing title and description for player error codes.
 *
 * @param {number|string} code
 * @returns {{ title: string, desc: string, key: string }}
 */
export function getPlayerErrorInfo(code) {
  const key = mapPlayerError(code)
  const info = TIKTOK_PLAYER_MESSAGES[key] || TIKTOK_PLAYER_MESSAGES.unknown
  return {
    key,
    title: info.title,
    desc: info.desc,
  }
}
