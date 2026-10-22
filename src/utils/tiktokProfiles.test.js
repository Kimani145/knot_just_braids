import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TIKTOK_IFRAME_PROFILES,
  getIframeConfig,
  OFFICIAL_ALLOW,
  SANDBOX_APP,
  REFERRER_POLICY,
} from './tiktokProfiles.js'

describe('TIKTOK_IFRAME_PROFILES configuration and purity', () => {
  const validPhotoId = '7679743513151655186'
  const validVideoId = '7671327868349123848'

  it('exports immutable profiles object with all defined strategies', () => {
    assert.ok(TIKTOK_IFRAME_PROFILES['official-player'])
    assert.ok(TIKTOK_IFRAME_PROFILES['official-player-sandboxed'])
    assert.ok(TIKTOK_IFRAME_PROFILES['minimal-player'])
    assert.ok(TIKTOK_IFRAME_PROFILES['embed-v2'])
    assert.ok(TIKTOK_IFRAME_PROFILES['link-only'])
  })

  it('official-player (V1 Winner) matches verified oEmbed output with kind-aware photo/video parameters', () => {
    const profile = TIKTOK_IFRAME_PROFILES['official-player']
    assert.equal(profile.name, 'official-player')
    assert.equal(profile.sandbox, null)
    assert.equal(profile.allow, OFFICIAL_ALLOW)
    assert.equal(profile.referrerPolicy, REFERRER_POLICY)
    assert.equal(profile.supportsMessages, true)

    // Video URL includes autoplay=1 and music_info=1
    const videoSrc = profile.buildSrc(validVideoId, { kind: 'video' })
    assert.equal(
      videoSrc,
      `https://www.tiktok.com/player/v1/${validVideoId}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1`
    )

    // Photo URL omits autoplay and disables music_info/description/volume_control per LAB2_RESULT
    const photoSrc = profile.buildSrc(validPhotoId, { kind: 'photo' })
    assert.equal(
      photoSrc,
      `https://www.tiktok.com/player/v1/${validPhotoId}?embed_from=oembed&music_info=0&description=0&muted=1&volume_control=0`
    )
  })

  it('official-player-sandboxed includes standard 5-flag sandbox', () => {
    const profile = TIKTOK_IFRAME_PROFILES['official-player-sandboxed']
    assert.equal(profile.sandbox, SANDBOX_APP)
    assert.equal(profile.allow, OFFICIAL_ALLOW)
    const src = profile.buildSrc(validPhotoId)
    assert.ok(src.includes('embed_from=oembed'))
  })

  it('minimal-player builds minimal player URL with sandbox', () => {
    const profile = TIKTOK_IFRAME_PROFILES['minimal-player']
    assert.equal(profile.sandbox, SANDBOX_APP)
    const src = profile.buildSrc(validPhotoId)
    assert.equal(src, `https://www.tiktok.com/player/v1/${validPhotoId}`)
  })

  it('embed-v2 builds legacy embed URL and sanitizes lang parameter', () => {
    const profile = TIKTOK_IFRAME_PROFILES['embed-v2']
    assert.equal(profile.sandbox, SANDBOX_APP)
    assert.equal(profile.supportsMessages, false)

    const srcNormal = profile.buildSrc(validPhotoId)
    assert.equal(srcNormal, `https://www.tiktok.com/embed/v2/${validPhotoId}?lang=en-US`)

    const srcLang = profile.buildSrc(validPhotoId, { lang: 'fr' })
    assert.equal(srcLang, `https://www.tiktok.com/embed/v2/${validPhotoId}?lang=fr`)

    const srcMalicious = profile.buildSrc(validPhotoId, { lang: 'en" onerror="alert(1)' })
    assert.equal(srcMalicious, `https://www.tiktok.com/embed/v2/${validPhotoId}?lang=en-US`)
  })

  it('link-only returns null for iframe src and permissions', () => {
    const profile = TIKTOK_IFRAME_PROFILES['link-only']
    assert.equal(profile.buildSrc(validPhotoId), null)
    assert.equal(profile.allow, null)
    assert.equal(profile.sandbox, null)
  })

  it('strictly validates TikTok IDs using ^\\d{10,25}$ and rejects malformed inputs', () => {
    const maliciousOrInvalid = [
      '',
      '   ',
      'abc',
      '123456789', // 9 digits (too short)
      '12345678901234567890123456', // 26 digits (too long)
      '7679743513151655186/extra',
      '7679743513151655186?attack=1',
      '7679743513151655186#frag',
      '../7679743513151655186',
      '<script>alert(1)</script>',
      null,
      undefined,
      1234567890123456789n,
      {},
      [],
    ]

    for (const badId of maliciousOrInvalid) {
      assert.equal(
        TIKTOK_IFRAME_PROFILES['official-player'].buildSrc(badId),
        null,
        `Should reject bad ID: ${String(badId)}`
      )
      assert.equal(
        getIframeConfig({ id: badId }, 'official-player'),
        null,
        `getIframeConfig should reject bad ID: ${String(badId)}`
      )
    }
  })

  it('getIframeConfig resolves complete config for valid video and photo items', () => {
    const photoConfig = getIframeConfig(
      { id: validPhotoId, handle: 'knot.justbraids', kind: 'photo' },
      'official-player'
    )
    assert.deepEqual(photoConfig, {
      profile: 'official-player',
      src: `https://www.tiktok.com/player/v1/${validPhotoId}?embed_from=oembed&music_info=0&description=0&muted=1&volume_control=0`,
      allow: OFFICIAL_ALLOW,
      sandbox: null,
      referrerPolicy: REFERRER_POLICY,
      supportsMessages: true,
    })

    const videoConfig = getIframeConfig(
      { id: validVideoId, handle: 'knot.justbraids', kind: 'video' },
      'official-player-sandboxed'
    )
    assert.equal(videoConfig.sandbox, SANDBOX_APP)
    assert.ok(videoConfig.src.includes(validVideoId))

    const linkOnlyConfig = getIframeConfig(
      { id: validPhotoId, handle: 'knot.justbraids', kind: 'photo' },
      'link-only'
    )
    assert.equal(linkOnlyConfig, null)
  })
})
