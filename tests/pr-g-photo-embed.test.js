/**
 * tests/pr-g-photo-embed.test.js
 * Verification suite for PR-G: TikTok photo posts playback via official iframe profile
 * with safe fallback ladder, session failure caching, and strict security isolation.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  TIKTOK_IFRAME_PROFILES,
  getIframeConfig,
  OFFICIAL_ALLOW,
  REFERRER_POLICY,
  markPostFailed,
  isPostFailed,
  clearSessionFailures,
} from '../src/utils/tiktokProfiles.js'
import { PHOTO_EMBED_STRATEGY, isPhotoEmbedEnabled } from '../src/utils/tiktokStrategy.js'

test('PR-G 1: Default strategy is official-player with embedding enabled', () => {
  assert.equal(PHOTO_EMBED_STRATEGY, 'official-player')
  assert.equal(isPhotoEmbedEnabled(), true)
})

test('PR-G 2: Winning profile (official-player) generates official oEmbed iframe structure', () => {
  const photoId = '7679743513151655186'
  const photoConfig = getIframeConfig({ id: photoId, kind: 'photo' }, 'official-player')

  assert.ok(photoConfig)
  assert.equal(photoConfig.profile, 'official-player')
  assert.equal(
    photoConfig.src,
    `https://www.tiktok.com/player/v1/${photoId}?embed_from=oembed&music_info=0&description=0&muted=1&volume_control=0`
  )
  assert.equal(photoConfig.allow, OFFICIAL_ALLOW)
  assert.equal(photoConfig.sandbox, null, 'Official profile must omit sandbox attribute per lab findings')
  assert.equal(photoConfig.referrerPolicy, REFERRER_POLICY)
  assert.equal(photoConfig.supportsMessages, true)

  const videoId = '7671327868349123848'
  const videoConfig = getIframeConfig({ id: videoId, kind: 'video' }, 'official-player')
  assert.ok(videoConfig)
  assert.equal(
    videoConfig.src,
    `https://www.tiktok.com/player/v1/${videoId}?embed_from=oembed&music_info=1&description=1&autoplay=1&muted=1`
  )
})

test('PR-G 3: Session failure cache remembers failed post IDs and avoids infinite retry loops', () => {
  clearSessionFailures()
  const testId = '7681345289243905298'

  assert.equal(isPostFailed(testId), false)
  markPostFailed(testId)
  assert.equal(isPostFailed(testId), true)
  assert.equal(isPostFailed('9999999999999999999'), false)
  clearSessionFailures()
  assert.equal(isPostFailed(testId), false)
})

test('PR-G 4: Strict postMessage validation in TikTokPlayer', () => {
  const playerFile = path.resolve('src/components/client/TikTokPlayer.jsx')
  const code = fs.readFileSync(playerFile, 'utf8')

  // 1. Origin check
  assert.ok(
    code.includes("event.origin !== 'https://www.tiktok.com'"),
    'Must strictly verify event.origin === https://www.tiktok.com'
  )

  // 2. Source check matching iframe contentWindow
  assert.ok(
    code.includes('event.source !== iframeRef.current.contentWindow'),
    'Must strictly verify event.source === iframeRef.current.contentWindow'
  )

  // 3. Envelope check
  assert.ok(
    code.includes("event.data['x-tiktok-player'] !== true"),
    'Must validate x-tiktok-player envelope'
  )
})

test('PR-G 5: All external links in TikTokPlayer and ProductQuickView have rel="noopener noreferrer"', () => {
  const files = [
    path.resolve('src/components/client/TikTokPlayer.jsx'),
    path.resolve('src/components/client/ProductQuickView.jsx'),
    path.resolve('src/components/admin/VideoLinksField.jsx'),
  ]

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8')
    const regex = /<a\s+[^>]*target="_blank"[^>]*>/g
    let match
    while ((match = regex.exec(code)) !== null) {
      assert.ok(
        match[0].includes('rel="noopener noreferrer"'),
        `Target _blank link in ${path.basename(file)} must have rel="noopener noreferrer": ${match[0]}`
      )
    }
  }
})

test('PR-G 6: Preconnect optimization only on user interaction', () => {
  const playerFile = path.resolve('src/components/client/TikTokPlayer.jsx')
  const code = fs.readFileSync(playerFile, 'utf8')

  assert.ok(
    code.includes('onPointerDown={preconnectTikTok}') &&
    code.includes('onMouseEnter={preconnectTikTok}'),
    'Preconnect must only trigger on pointerdown / mouseenter on facade button'
  )
})
