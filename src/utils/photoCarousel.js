/**
 * src/utils/photoCarousel.js
 * Pure state reducer and message envelope utilities for TikTok photo carousel embeds.
 *
 * Grounded in LAB2_RESULT (2026-10-22):
 * - TikTok's official player/v1 image player auto-advances if music/autoplay is enabled.
 * - The auto-advance guard intercepts automated onImageChange events within 3s of onPlayerReady
 *   and resets to photo 0 once, unless a user action occurs earlier.
 * - N (total photo count) is not reported by TikTok: lazy discovery is used where a navigateTo(idx+1)
 *   that produces no onImageChange within ~700ms signifies the end of the carousel.
 */

// Window within which automated onImageChange will be reset to photo 0 once
// Citing LAB2_RESULT (2026-10-22): onPlayerReady at ~5-6s, state change to 1 (playing), followed by early onImageChange.
export const AUTO_ADVANCE_GUARD_WINDOW_MS = 3000

// Command throttle to avoid flooding postMessage channel
export const COMMAND_THROTTLE_MS = 150

// Timeout to infer carousel end when navigating forward produces no response
export const END_DETECTION_TIMEOUT_MS = 700

// Strict target origin for all host -> iframe postMessage communication
export const TIKTOK_TARGET_ORIGIN = 'https://www.tiktok.com'

/**
 * Validates whether an incoming index is a safe, non-negative integer under reasonable bound.
 *
 * @param {unknown} val
 * @returns {boolean}
 */
export function isValidImageIndex(val) {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0 && val < 100
}

/**
 * Builds a strict TikTok player command envelope.
 *
 * @param {string} type - Command type (e.g. 'navigateTo', 'pause', 'play', 'mute', 'unMute')
 * @param {unknown} [value=null] - Command argument (e.g. image index integer)
 * @returns {object} Formatted envelope object
 */
export function createTikTokCommand(type, value = null) {
  if (typeof type !== 'string' || !type.trim()) {
    throw new Error('TikTok command type must be a non-empty string')
  }
  return {
    type: type.trim(),
    value: value !== undefined ? value : null,
    'x-tiktok-player': true,
  }
}

/**
 * Safely posts a command to the TikTok player iframe contentWindow with origin enforcement and throttling.
 *
 * @param {Window|null} contentWindow - Target iframe contentWindow
 * @param {string} type - Command name
 * @param {unknown} value - Command value
 * @param {object} throttleState - Mutable or managed tracker { lastSentAt: number }
 * @param {number} [now=Date.now()] - Current timestamp
 * @returns {boolean} True if message was posted, false if throttled or invalid
 */
export function postTikTokCommand(
  contentWindow,
  type,
  value = null,
  throttleState = { lastSentAt: 0 },
  now = Date.now()
) {
  if (!contentWindow || typeof contentWindow.postMessage !== 'function') {
    return false
  }

  const elapsed = now - (throttleState.lastSentAt || 0)
  if (elapsed < COMMAND_THROTTLE_MS) {
    return false
  }

  const envelope = createTikTokCommand(type, value)
  try {
    contentWindow.postMessage(envelope, TIKTOK_TARGET_ORIGIN)
    throttleState.lastSentAt = now
    return true
  } catch {
    return false
  }
}

export const initialPhotoCarouselState = Object.freeze({
  currentIndex: 0,
  maxIndexSeen: 0,
  totalPhotos: null, // null until end detected or known
  pendingTargetIndex: null,
  guardActive: true,
  guardTriggered: false,
  readyAt: null,
  isAtEnd: false,
  needsResetToZero: false,
})

/**
 * Pure state reducer for TikTok photo carousel interaction and discovery.
 *
 * @param {typeof initialPhotoCarouselState} state
 * @param {object} action
 * @returns {typeof initialPhotoCarouselState}
 */
export function photoCarouselReducer(state, action) {
  if (!action || typeof action !== 'object') return state

  switch (action.type) {
    case 'PLAYER_READY': {
      const readyAt = typeof action.readyAt === 'number' ? action.readyAt : Date.now()
      return {
        ...state,
        readyAt,
        guardActive: true,
        guardTriggered: false,
        needsResetToZero: false,
      }
    }

    case 'IMAGE_CHANGE': {
      const { index, now = Date.now() } = action
      if (!isValidImageIndex(index)) {
        return state
      }

      const nextMax = Math.max(state.maxIndexSeen, index)
      let guardActive = state.guardActive
      let guardTriggered = state.guardTriggered
      let needsReset = false

      // Auto-advance guard: If an onImageChange occurs within the guard window without user command,
      // and index > 0, we flag that it should be reset to 0 once.
      if (guardActive && !guardTriggered && state.readyAt !== null) {
        const elapsedSinceReady = now - state.readyAt
        if (elapsedSinceReady <= AUTO_ADVANCE_GUARD_WINDOW_MS) {
          if (index > 0) {
            guardTriggered = true
            guardActive = false
            needsReset = true
          }
        } else {
          // Guard window expired naturally
          guardActive = false
        }
      }

      // If we landed on or past totalPhotos - 1, update isAtEnd
      const isAtEnd = state.totalPhotos !== null && index >= state.totalPhotos - 1

      return {
        ...state,
        currentIndex: index,
        maxIndexSeen: nextMax,
        pendingTargetIndex: null,
        guardActive,
        guardTriggered,
        isAtEnd,
        needsResetToZero: needsReset,
      }
    }

    case 'ACK_RESET_TO_ZERO': {
      return {
        ...state,
        needsResetToZero: false,
      }
    }

    case 'USER_NAVIGATE': {
      const { targetIndex } = action
      if (!isValidImageIndex(targetIndex)) {
        return state
      }
      return {
        ...state,
        guardActive: false, // Any user interaction immediately cancels auto-advance guard
        needsResetToZero: false,
        pendingTargetIndex: targetIndex,
      }
    }

    case 'NAVIGATE_TIMEOUT': {
      // If we sent navigateTo(targetIndex) where targetIndex > currentIndex and got no response,
      // we reached the end of the carousel.
      const { targetIndex } = action
      if (
        state.pendingTargetIndex === targetIndex &&
        typeof targetIndex === 'number' &&
        targetIndex > state.currentIndex
      ) {
        const discoveredTotal = Math.max(state.maxIndexSeen + 1, targetIndex)
        return {
          ...state,
          totalPhotos: discoveredTotal,
          isAtEnd: true,
          pendingTargetIndex: null,
        }
      }
      return {
        ...state,
        pendingTargetIndex: null,
      }
    }

    case 'CANCEL_GUARD': {
      return {
        ...state,
        guardActive: false,
        needsResetToZero: false,
      }
    }

    case 'RESET': {
      return { ...initialPhotoCarouselState }
    }

    default:
      return state
  }
}
