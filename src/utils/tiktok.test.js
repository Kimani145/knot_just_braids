import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_VIDEOS_PER_ITEM,
  TIKTOK_URL_ERRORS,
  parseTikTokUrl,
  sanitizeVideos,
  buildPlayerSrc,
  buildWatchUrl,
} from './tiktok.js'

test('MAX_VIDEOS_PER_ITEM is 2', () => {
  assert.equal(MAX_VIDEOS_PER_ITEM, 2)
})

test('TIKTOK_URL_ERRORS contains all reasons and correct messages', () => {
  const reasons = [
    'empty',
    'too_long',
    'not_url',
    'not_https',
    'host_not_allowed',
    'short_link',
    'unsupported_path',
    'bad_id',
  ]
  for (const reason of reasons) {
    assert.equal(typeof TIKTOK_URL_ERRORS[reason], 'string')
  }
  assert.match(
    TIKTOK_URL_ERRORS.short_link,
    /Open the link in your phone browser, then copy the address from the browser bar/,
  )
})

test('parseTikTokUrl - ACCEPT corpus', () => {
  // Standard video url
  const res1 = parseTikTokUrl('https://www.tiktok.com/@knotjust/video/7312345678901234567')
  assert.deepEqual(res1, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'video',
  })

  // Standard photo url
  const resPhoto = parseTikTokUrl('https://www.tiktok.com/@knotjust/photo/7312345678901234567')
  assert.deepEqual(resPhoto, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'photo',
  })

  // Photo url with query parameters
  const resPhotoQuery = parseTikTokUrl(
    'https://www.tiktok.com/@knotjust/photo/7312345678901234567?is_from_webapp=1',
  )
  assert.deepEqual(resPhotoQuery, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'photo',
  })

  // With query parameters
  const res2 = parseTikTokUrl(
    'https://www.tiktok.com/@knotjust/video/7312345678901234567?is_from_webapp=1&sender_device=pc',
  )
  assert.deepEqual(res2, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'video',
  })

  // Trailing slash
  const res3 = parseTikTokUrl('https://www.tiktok.com/@knotjust/video/7312345678901234567/')
  assert.deepEqual(res3, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'video',
  })

  // tiktok.com without www and dot/underscore handle
  const res4 = parseTikTokUrl('https://tiktok.com/@a.b_c/video/7312345678901234567')
  assert.deepEqual(res4, {
    ok: true,
    id: '7312345678901234567',
    handle: 'a.b_c',
    kind: 'video',
  })

  // Uppercase scheme/host
  const res5 = parseTikTokUrl('HTTPS://WWW.TIKTOK.COM/@knotjust/video/7312345678901234567')
  assert.deepEqual(res5, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'video',
  })

  // Surrounding whitespace and newlines
  const res6 = parseTikTokUrl(
    '  \n https://www.tiktok.com/@knotjust/video/7312345678901234567 \t\n  ',
  )
  assert.deepEqual(res6, {
    ok: true,
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'video',
  })
})

test('parseTikTokUrl - REJECT corpus', () => {
  // http://
  assert.deepEqual(
    parseTikTokUrl('http://www.tiktok.com/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'not_https' },
  )

  // vm./vt./m. short links
  assert.deepEqual(parseTikTokUrl('https://vm.tiktok.com/ZM8abc123/'), {
    ok: false,
    reason: 'short_link',
  })
  assert.deepEqual(parseTikTokUrl('https://vt.tiktok.com/ZS8abc123/'), {
    ok: false,
    reason: 'short_link',
  })
  assert.deepEqual(parseTikTokUrl('https://m.tiktok.com/v/7312345678901234567.html'), {
    ok: false,
    reason: 'short_link',
  })

  // Host tricks
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com.evil.com/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )
  assert.deepEqual(
    parseTikTokUrl('https://evil.com/?u=https://www.tiktok.com/@a/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com@evil.com/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )
  assert.deepEqual(
    parseTikTokUrl('https://user:pass@www.tiktok.com/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )

  // Protocol-relative and non-HTTP schemes
  assert.deepEqual(
    parseTikTokUrl('//www.tiktok.com/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'not_url' },
  )
  assert.deepEqual(parseTikTokUrl('javascript:alert(1)'), {
    ok: false,
    reason: 'not_https',
  })
  assert.deepEqual(parseTikTokUrl('data:text/html,payload'), {
    ok: false,
    reason: 'not_https',
  })

  // Non-default port
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com:8443/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )

  // Trailing-dot host
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com./@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )

  // Cyrillic / homoglyph
  assert.deepEqual(
    parseTikTokUrl('https://www.tіktok.com/@knotjust/video/7312345678901234567'),
    { ok: false, reason: 'host_not_allowed' },
  )

  // Unsupported paths (/music/, root, profile only)
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com/@knotjust/music/7312345678901234567'),
    { ok: false, reason: 'unsupported_path' },
  )
  assert.deepEqual(parseTikTokUrl('https://www.tiktok.com/'), {
    ok: false,
    reason: 'unsupported_path',
  })
  assert.deepEqual(parseTikTokUrl('https://www.tiktok.com/@knotjust'), {
    ok: false,
    reason: 'unsupported_path',
  })

  // Bad ID (non-digit, <10 digits, >25 digits, path traversal, encoded slashes)
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com/@knotjust/video/123456789'),
    { ok: false, reason: 'bad_id' },
  )
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com/@knotjust/video/12345678901234567890123456'),
    { ok: false, reason: 'bad_id' },
  )
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com/@knotjust/video/notanidhere'),
    { ok: false, reason: 'bad_id' },
  )
  assert.deepEqual(
    parseTikTokUrl('https://www.tiktok.com/@knotjust/video/7312345678901234567%2f..'),
    { ok: false, reason: 'bad_id' },
  )

  // Length check (>2048 chars)
  const longUrl = 'https://www.tiktok.com/@knotjust/video/7312345678901234567?' + 'a'.repeat(2100)
  assert.deepEqual(parseTikTokUrl(longUrl), { ok: false, reason: 'too_long' })

  // Empty / whitespace
  assert.deepEqual(parseTikTokUrl(''), { ok: false, reason: 'empty' })
  assert.deepEqual(parseTikTokUrl('   \n  '), { ok: false, reason: 'empty' })

  // Non-string inputs
  assert.deepEqual(parseTikTokUrl(null), { ok: false, reason: 'empty' })
  assert.deepEqual(parseTikTokUrl(undefined), { ok: false, reason: 'empty' })
  assert.deepEqual(parseTikTokUrl(12345), { ok: false, reason: 'not_url' })
  assert.deepEqual(parseTikTokUrl({}), { ok: false, reason: 'not_url' })
})

test('sanitizeVideos handles edge cases, dropping invalid and deduping', () => {
  assert.deepEqual(sanitizeVideos(null), [])
  assert.deepEqual(sanitizeVideos(undefined), [])
  assert.deepEqual(sanitizeVideos('not an array'), [])
  assert.deepEqual(sanitizeVideos({}), [])
  assert.deepEqual(sanitizeVideos([null, 'x', 42]), [])

  // Provider injection
  assert.deepEqual(
    sanitizeVideos([{ provider: 'javascript', id: '7312345678901234567', handle: 'knotjust' }]),
    [],
  )

  // XSS injection in id or handle
  assert.deepEqual(
    sanitizeVideos([
      { provider: 'tiktok', id: '1"><img src=x onerror=alert(1)>', handle: 'knotjust' },
      { provider: 'tiktok', id: '7312345678901234567', handle: '<script>alert(1)</script>' },
      { provider: 'tiktok', id: '123/../../x', handle: 'knotjust' },
    ]),
    [],
  )

  // Valid videos and photo posts, deduping and max 2
  const rawList = [
    { provider: 'tiktok', id: '7312345678901234567', handle: 'knotjust', kind: 'video' },
    { provider: 'tiktok', id: '7312345678901234567', handle: 'knotjust', kind: 'video' }, // dup
    { provider: 'tiktok', id: '7312345678901234568', handle: 'knotjust2', kind: 'photo' },
    { provider: 'tiktok', id: '7312345678901234569', handle: 'knotjust3', kind: 'video' }, // exceeds max 2
  ]
  const sanitized = sanitizeVideos(rawList)
  assert.equal(sanitized.length, 2)
  assert.deepEqual(sanitized, [
    { provider: 'tiktok', id: '7312345678901234567', handle: 'knotjust', kind: 'video' },
    { provider: 'tiktok', id: '7312345678901234568', handle: 'knotjust2', kind: 'photo' },
  ])
})

test('buildPlayerSrc generates official documented embed URL with query params', () => {
  const src = buildPlayerSrc('7312345678901234567')
  assert.equal(
    src,
    'https://www.tiktok.com/player/v1/7312345678901234567?autoplay=1&controls=1&description=0&loop=0&music_info=0',
  )

  assert.equal(buildPlayerSrc('invalid-id'), null)
  assert.equal(buildPlayerSrc(12345), null)
  assert.equal(buildPlayerSrc(''), null)
})

test('buildWatchUrl generates standard watch link honoring kind', () => {
  const videoWatch = buildWatchUrl({ id: '7312345678901234567', handle: 'knotjust' })
  assert.equal(videoWatch, 'https://www.tiktok.com/@knotjust/video/7312345678901234567')

  const photoWatch = buildWatchUrl({
    id: '7312345678901234567',
    handle: 'knotjust',
    kind: 'photo',
  })
  assert.equal(photoWatch, 'https://www.tiktok.com/@knotjust/photo/7312345678901234567')

  assert.equal(buildWatchUrl({ id: 'invalid', handle: 'knotjust' }), null)
  assert.equal(buildWatchUrl({ id: '7312345678901234567', handle: 'invalid handle!' }), null)
  assert.equal(buildWatchUrl({ id: '7312345678901234567' }), null)
})
