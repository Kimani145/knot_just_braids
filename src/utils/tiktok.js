export const MAX_VIDEOS_PER_ITEM = 2

export const TIKTOK_URL_ERRORS = {
  empty: 'Please enter a TikTok video URL.',
  too_long: 'The URL is too long (over 2048 characters).',
  not_url: 'Please enter a valid URL.',
  not_https: 'TikTok links must start with https://.',
  host_not_allowed: 'Only official tiktok.com links are allowed.',
  short_link:
    'Short links (vm/vt/m) cannot be embedded directly. Open the link in your phone browser, then copy the address from the browser bar.',
  unsupported_path: 'Please provide a standard TikTok video link (/@handle/video/id).',
  bad_id: 'The TikTok video ID in this link is invalid or unsupported.',
}

const SHORT_HOSTNAMES = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'])

export function parseTikTokUrl(input) {
  if (input === null || input === undefined) {
    return { ok: false, reason: 'empty' }
  }

  if (typeof input !== 'string') {
    return { ok: false, reason: 'not_url' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty' }
  }

  if (trimmed.length > 2048) {
    return { ok: false, reason: 'too_long' }
  }

  let url
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'not_url' }
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'not_https' }
  }

  if (url.username || url.password) {
    return { ok: false, reason: 'host_not_allowed' }
  }

  if (url.port && url.port !== '443') {
    return { ok: false, reason: 'host_not_allowed' }
  }

  const hostname = url.hostname.toLowerCase()

  if (SHORT_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: 'short_link' }
  }

  if (hostname !== 'tiktok.com' && hostname !== 'www.tiktok.com') {
    return { ok: false, reason: 'host_not_allowed' }
  }

  // Path must be /@handle/video/id[/]
  const matchVideoPrefix = url.pathname.match(/^\/@([A-Za-z0-9._]{2,32})\/video\/(.*)$/)
  if (!matchVideoPrefix) {
    return { ok: false, reason: 'unsupported_path' }
  }

  const handle = matchVideoPrefix[1]
  const rawId = matchVideoPrefix[2].replace(/\/$/, '')

  if (!/^\d{10,25}$/.test(rawId)) {
    return { ok: false, reason: 'bad_id' }
  }

  return {
    ok: true,
    id: rawId,
    handle,
  }
}

export function sanitizeVideos(raw) {
  if (!Array.isArray(raw)) {
    return []
  }

  const sanitized = []
  const seenIds = new Set()

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    if (item.provider !== 'tiktok') continue

    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const handle = typeof item.handle === 'string' ? item.handle.trim() : ''

    if (!/^\d{10,25}$/.test(id)) continue
    if (!/^[A-Za-z0-9._]{2,32}$/.test(handle)) continue

    if (seenIds.has(id)) continue
    seenIds.add(id)

    sanitized.push({
      provider: 'tiktok',
      id,
      handle,
    })

    if (sanitized.length >= MAX_VIDEOS_PER_ITEM) {
      break
    }
  }

  return sanitized
}

export function buildPlayerSrc(id) {
  if (typeof id !== 'string' || !/^\d{10,25}$/.test(id)) {
    return null
  }

  const params = new URLSearchParams({
    autoplay: '1',
    controls: '1',
    description: '0',
    loop: '0',
    music_info: '0',
  })

  return `https://www.tiktok.com/player/v1/${id}?${params.toString()}`
}

export function buildWatchUrl({ id, handle } = {}) {
  if (typeof id !== 'string' || !/^\d{10,25}$/.test(id)) {
    return null
  }

  if (typeof handle !== 'string' || !/^[A-Za-z0-9._]{2,32}$/.test(handle)) {
    return null
  }

  return `https://www.tiktok.com/@${handle}/video/${id}`
}
