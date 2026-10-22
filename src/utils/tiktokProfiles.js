/**
 * src/utils/tiktokProfiles.js
 * Pure iframe configuration profiles for TikTok embedding.
 *
 * Each profile defines:
 * - buildSrc: pure function returning the complete iframe URL
 * - allow: explicit feature policy permissions string
 * - sandbox: sandbox directive string, or null when omitting sandbox
 * - referrerPolicy: HTTP referrer policy
 *
 * Verified against TikTok oEmbed output and browser lab logs (2026-10-22).
 */

export const OFFICIAL_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'

export const SANDBOX_APP =
  'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox'

export const REFERRER_POLICY = 'strict-origin-when-cross-origin'

function isValidTikTokId(id) {
  return typeof id === 'string' && /^\d{10,25}$/.test(id.trim())
}

export const TIKTOK_IFRAME_PROFILES = Object.freeze({
  // V1 Winner: Official oEmbed iframe without sandbox
  'official-player': Object.freeze({
    name: 'official-player',
    description: 'Official TikTok oEmbed player/v1 parameters with official allow string and no sandbox',
    buildSrc: (id) => {
      if (!isValidTikTokId(id)) return null
      return `https://www.tiktok.com/player/v1/${id.trim()}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1`
    },
    allow: OFFICIAL_ALLOW,
    sandbox: null,
    referrerPolicy: REFERRER_POLICY,
    supportsMessages: true,
  }),

  // V2: Official player with app sandbox
  'official-player-sandboxed': Object.freeze({
    name: 'official-player-sandboxed',
    description: 'Official oEmbed parameters constrained with standard 5-flag sandbox',
    buildSrc: (id) => {
      if (!isValidTikTokId(id)) return null
      return `https://www.tiktok.com/player/v1/${id.trim()}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1`
    },
    allow: OFFICIAL_ALLOW,
    sandbox: SANDBOX_APP,
    referrerPolicy: REFERRER_POLICY,
    supportsMessages: true,
  }),

  // V4: Minimal player
  'minimal-player': Object.freeze({
    name: 'minimal-player',
    description: 'Minimal player/v1 without custom query parameters',
    buildSrc: (id) => {
      if (!isValidTikTokId(id)) return null
      return `https://www.tiktok.com/player/v1/${id.trim()}`
    },
    allow: OFFICIAL_ALLOW,
    sandbox: SANDBOX_APP,
    referrerPolicy: REFERRER_POLICY,
    supportsMessages: true,
  }),

  // V5: embed/v2 legacy endpoint
  'embed-v2': Object.freeze({
    name: 'embed-v2',
    description: 'TikTok embed/v2 endpoint with language parameter',
    buildSrc: (id, { lang = 'en-US' } = {}) => {
      if (!isValidTikTokId(id)) return null
      const cleanLang = typeof lang === 'string' && /^[A-Za-z-]{2,10}$/.test(lang) ? lang : 'en-US'
      return `https://www.tiktok.com/embed/v2/${id.trim()}?lang=${cleanLang}`
    },
    allow: OFFICIAL_ALLOW,
    sandbox: SANDBOX_APP,
    referrerPolicy: REFERRER_POLICY,
    supportsMessages: false,
  }),

  // Safe fallback: no iframe
  'link-only': Object.freeze({
    name: 'link-only',
    description: 'No iframe embedding; customer photos with direct link',
    buildSrc: () => null,
    allow: null,
    sandbox: null,
    referrerPolicy: REFERRER_POLICY,
    supportsMessages: false,
  }),
})

/**
 * Resolves the complete iframe configuration for a TikTok item under a given profile.
 *
 * @param {object} video - Object with { id, handle, kind }
 * @param {string} profileName - One of the TIKTOK_IFRAME_PROFILES keys
 * @returns {object|null} Configuration object or null if invalid or link-only
 */
export function getIframeConfig(video, profileName = 'official-player') {
  if (!video || typeof video !== 'object') return null
  const id = typeof video.id === 'string' ? video.id.trim() : ''
  if (!isValidTikTokId(id)) return null

  const profile = TIKTOK_IFRAME_PROFILES[profileName]
  if (!profile || profileName === 'link-only') return null

  const src = profile.buildSrc(id, { kind: video.kind })
  if (!src) return null

  return {
    profile: profile.name,
    src,
    allow: profile.allow,
    sandbox: profile.sandbox,
    referrerPolicy: profile.referrerPolicy,
    supportsMessages: profile.supportsMessages,
  }
}

// Session-level failure cache per post ID to avoid repeated failed iframe loads
const failedPostIds = new Set()

export function markPostFailed(id) {
  if (!id) return
  const strId = String(id).trim()
  failedPostIds.add(strId)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`tiktok_fail_${strId}`, '1')
    }
  } catch {
    // Ignore storage errors (quota, private browsing)
  }
}

export function isPostFailed(id) {
  if (!id) return false
  const strId = String(id).trim()
  if (failedPostIds.has(strId)) return true
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(`tiktok_fail_${strId}`) === '1'
    }
  } catch {
    // Ignore storage errors
  }
  return false
}

export function clearPostFailure(id) {
  if (!id) return
  const strId = String(id).trim()
  failedPostIds.delete(strId)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(`tiktok_fail_${strId}`)
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearSessionFailures() {
  failedPostIds.clear()
}
