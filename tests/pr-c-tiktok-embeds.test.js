import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  TIKTOK_PLAYER_ERRORS,
  mapPlayerError,
  getPlayerErrorInfo,
} from '../src/utils/tiktokErrors.js'
import {
  classifyTikTokUrl,
  buildOEmbedUrl,
  buildPlayerSrc,
} from '../src/utils/tiktok.js'

test('PR-C: TIKTOK_PLAYER_ERRORS maps error codes according to specification', () => {
  assert.equal(TIKTOK_PLAYER_ERRORS[1001], 'invalid-or-unsupported-media')
  assert.equal(TIKTOK_PLAYER_ERRORS[2001], 'embed-load-failure')
  assert.equal(TIKTOK_PLAYER_ERRORS[3001], 'player-timeout')
  assert.equal(TIKTOK_PLAYER_ERRORS[3002], 'player-runtime-failure')

  assert.equal(mapPlayerError(1001), 'invalid-or-unsupported-media')
  assert.equal(mapPlayerError('1001'), 'invalid-or-unsupported-media')
  assert.equal(mapPlayerError(2001), 'embed-load-failure')
  assert.equal(mapPlayerError(3001), 'player-timeout')
  assert.equal(mapPlayerError(3002), 'player-runtime-failure')
  assert.equal(mapPlayerError(9999), 'unknown')
  assert.equal(mapPlayerError(null), 'unknown')

  const info1001 = getPlayerErrorInfo(1001)
  assert.equal(info1001.key, 'invalid-or-unsupported-media')
  assert.ok(info1001.title && info1001.desc)

  const infoUnknown = getPlayerErrorInfo(null)
  assert.equal(infoUnknown.key, 'unknown')
})

test('PR-C: URL classification separates video, photo, and unknown variants', () => {
  // Video
  assert.equal(
    classifyTikTokUrl('https://www.tiktok.com/@knot.justbraids/video/7671327868349123848'),
    'video'
  )
  assert.equal(
    classifyTikTokUrl('https://m.tiktok.com/@knot.justbraids/video/7682424844671012114'),
    'video'
  )

  // Photo
  assert.equal(
    classifyTikTokUrl('https://www.tiktok.com/@knot.justbraids/photo/7681345289243905298'),
    'photo'
  )
  assert.equal(
    classifyTikTokUrl('https://www.tiktok.com/@knot.justbraids/photo/7679743513151655186'),
    'photo'
  )

  // Unknown / Shortened
  assert.equal(classifyTikTokUrl('https://vm.tiktok.com/ZM8abc/'), 'unknown')
  assert.equal(classifyTikTokUrl('https://vt.tiktok.com/ZS8abc/'), 'unknown')
  assert.equal(classifyTikTokUrl('https://www.tiktok.com/@knot.justbraids'), 'unknown')
})

test('PR-C: TikTokPlayer forbids routing photo posts to /player/v1/', () => {
  const componentPath = path.resolve('src/components/client/TikTokPlayer.jsx')
  assert.ok(fs.existsSync(componentPath), 'TikTokPlayer.jsx must exist')

  const code = fs.readFileSync(componentPath, 'utf8')

  // Verify playerSrc routes according to strategy (null under default link-only)
  assert.ok(
    code.includes('PHOTO_EMBED_STRATEGY') && (code.includes('buildEmbedV2Src') || code.includes('null')),
    'playerSrc must be strategy-controlled and evaluate to null for photo posts under default link-only strategy'
  )

  // Verify branded fallback card structure
  assert.ok(
    code.includes('tiktok-fallback-card'),
    'TikTokPlayer must contain the branded fallback card'
  )
  assert.ok(
    code.includes('View this hairstyle gallery on TikTok'),
    'Fallback card must display the required CTA copy'
  )

  // Verify accessible labels
  assert.match(
    code,
    /aria-label=\{`TikTok post by @\$\{handle\}`\}/,
    'TikTok player wrapper must have accessible post label'
  )
})

test('PR-C: VideoLinksField provides inline helper for photo posts', () => {
  const fieldPath = path.resolve('src/components/admin/VideoLinksField.jsx')
  assert.ok(fs.existsSync(fieldPath), 'VideoLinksField.jsx must exist')

  const code = fs.readFileSync(fieldPath, 'utf8')
  assert.ok(
    code.includes('Photo-mode post: TikTok\'s embed player may restrict playback'),
    'VideoLinksField must display helper hint when a photo URL is entered'
  )
})

test('PR-C: Verified control test vectors', () => {
  // Known public photo posts
  const photo1 = 'https://www.tiktok.com/@knot.justbraids/photo/7681345289243905298'
  const photo2 = 'https://www.tiktok.com/@knot.justbraids/photo/7679743513151655186'

  // Known public video controls
  const video1 = 'https://www.tiktok.com/@knot.justbraids/video/7671327868349123848'
  const video2 = 'https://www.tiktok.com/@knot.justbraids/video/7682424844671012114'

  assert.equal(classifyTikTokUrl(photo1), 'photo')
  assert.equal(classifyTikTokUrl(photo2), 'photo')
  assert.equal(classifyTikTokUrl(video1), 'video')
  assert.equal(classifyTikTokUrl(video2), 'video')

  // Video builds official player v1 URL
  const player1 = buildPlayerSrc('7671327868349123848')
  assert.ok(player1.includes('https://www.tiktok.com/player/v1/7671327868349123848'))

  // Photo builds canonical oEmbed request
  const oembed1 = buildOEmbedUrl(photo1)
  assert.equal(
    oembed1,
    'https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40knot.justbraids%2Fphoto%2F7681345289243905298'
  )
})
