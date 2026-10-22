/**
 * tests/pr-h-photo-carousel.test.js
 * Verification suite for PR-H: Photo-post carousel navigation, auto-advance guard,
 * messaging safety, lazy end-detection, and non-overlapping layout.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  TIKTOK_IFRAME_PROFILES,
  getIframeConfig,
} from '../src/utils/tiktokProfiles.js'
import {
  AUTO_ADVANCE_GUARD_WINDOW_MS,
  COMMAND_THROTTLE_MS,
  END_DETECTION_TIMEOUT_MS,
  TIKTOK_TARGET_ORIGIN,
  createTikTokCommand,
  postTikTokCommand,
  isValidImageIndex,
  initialPhotoCarouselState,
  photoCarouselReducer,
} from '../src/utils/photoCarousel.js'

test('PR-H 1: Kind-aware photo profile query parameters', () => {
  const photoId = '7616082104308272392'
  const videoId = '7671327868349123848'

  const photoConfig = getIframeConfig({ id: photoId, kind: 'photo' }, 'official-player')
  assert.ok(photoConfig)
  assert.ok(
    photoConfig.src.includes('embed_from=oembed&music_info=0&description=0&muted=1&volume_control=0'),
    'Photo post URL must match LAB2_RESULT (no autoplay, music_info=0, description=0, muted=1, volume_control=0)'
  )
  assert.ok(!photoConfig.src.includes('autoplay=1'), 'Photo post URL must not include autoplay=1')

  const videoConfig = getIframeConfig({ id: videoId, kind: 'video' }, 'official-player')
  assert.ok(videoConfig)
  assert.ok(
    videoConfig.src.includes('autoplay=1&muted=1'),
    'Video post URL must retain autoplay=1 and standard playback parameters'
  )
})

test('PR-H 2: postTikTokCommand enforces exact origin https://www.tiktok.com and throttling', () => {
  const sent = []
  const mockWindow = {
    postMessage: (msg, origin) => {
      sent.push({ msg, origin })
    },
  }

  const throttle = { lastSentAt: 0 }
  const t0 = 1000

  // 1. First command
  const ok1 = postTikTokCommand(mockWindow, 'navigateTo', 0, throttle, t0)
  assert.equal(ok1, true)
  assert.equal(sent[0].origin, TIKTOK_TARGET_ORIGIN)
  assert.equal(sent[0].origin, 'https://www.tiktok.com')
  assert.deepEqual(sent[0].msg, {
    type: 'navigateTo',
    value: 0,
    'x-tiktok-player': true,
  })

  // 2. Throttled attempt (< 150ms)
  const ok2 = postTikTokCommand(mockWindow, 'navigateTo', 1, throttle, t0 + 100)
  assert.equal(ok2, false)
  assert.equal(sent.length, 1)

  // 3. Command after throttle window (>= 150ms)
  const ok3 = postTikTokCommand(mockWindow, 'navigateTo', 1, throttle, t0 + 160)
  assert.equal(ok3, true)
  assert.equal(sent.length, 2)
  assert.equal(sent[1].msg.value, 1)
})

test('PR-H 3: Auto-advance guard intercepts early automated onImageChange', () => {
  let state = initialPhotoCarouselState

  // onPlayerReady arrives at t = 5000
  state = photoCarouselReducer(state, { type: 'PLAYER_READY', readyAt: 5000 })
  assert.equal(state.guardActive, true)
  assert.equal(state.readyAt, 5000)

  // Automated onImageChange arrives at t = 6200 (within 3000ms window) with index = 1
  state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 1, now: 6200 })
  assert.equal(state.currentIndex, 1)
  assert.equal(state.guardTriggered, true)
  assert.equal(state.guardActive, false)
  assert.equal(state.needsResetToZero, true, 'Guard must signal a reset to photo 0')

  // Component acknowledges reset and sends navigateTo(0)
  state = photoCarouselReducer(state, { type: 'ACK_RESET_TO_ZERO' })
  assert.equal(state.needsResetToZero, false)

  // Reset arrives at t = 6250
  state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 0, now: 6250 })
  assert.equal(state.currentIndex, 0)
})

test('PR-H 4: User interaction immediately cancels auto-advance guard', () => {
  let state = photoCarouselReducer(initialPhotoCarouselState, { type: 'PLAYER_READY', readyAt: 5000 })
  assert.equal(state.guardActive, true)

  // User taps Next (index = 1)
  state = photoCarouselReducer(state, { type: 'USER_NAVIGATE', targetIndex: 1 })
  assert.equal(state.guardActive, false)
  assert.equal(state.pendingTargetIndex, 1)

  // onImageChange to index 1 arrives
  state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 1, now: 5200 })
  assert.equal(state.currentIndex, 1)
  assert.equal(state.guardTriggered, false, 'Guard must not trigger on user-initiated navigation')
  assert.equal(state.needsResetToZero, false)
})

test('PR-H 5: Lazy end-detection via NAVIGATE_TIMEOUT', () => {
  let state = initialPhotoCarouselState

  // Item is currently on photo 1 (index 0 and 1 seen)
  state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 0, now: 1000 })
  state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 1, now: 2000 })
  assert.equal(state.currentIndex, 1)
  assert.equal(state.maxIndexSeen, 1)
  assert.equal(state.totalPhotos, null)
  assert.equal(state.isAtEnd, false)

  // User tries to navigate to photo 3 (index 2)
  state = photoCarouselReducer(state, { type: 'USER_NAVIGATE', targetIndex: 2 })
  assert.equal(state.pendingTargetIndex, 2)

  // 700ms timeout elapses with no onImageChange from TikTok
  state = photoCarouselReducer(state, { type: 'NAVIGATE_TIMEOUT', targetIndex: 2 })
  assert.equal(state.totalPhotos, 2, 'Total photos must be discovered as 2')
  assert.equal(state.isAtEnd, true, 'isAtEnd must be true at the discovered boundary')
  assert.equal(state.currentIndex, 1, 'Current index stays at 1')
  assert.equal(state.pendingTargetIndex, null)
})

test('PR-H 6: TikTokPlayer enforces security origin, envelope, and safe validation in code', () => {
  const playerFile = path.resolve('src/components/client/TikTokPlayer.jsx')
  const code = fs.readFileSync(playerFile, 'utf8')

  // 1. Origin check
  assert.ok(code.includes("event.origin !== 'https://www.tiktok.com'"))

  // 2. Source check matching iframe contentWindow
  assert.ok(code.includes('event.source !== iframeRef.current.contentWindow'))

  // 3. Envelope check
  assert.ok(code.includes("event.data['x-tiktok-player'] !== true"))

  // 4. Index validation helper
  assert.ok(code.includes('isValidImageIndex(value)'))

  // 5. 44px touch targets on photo controls
  assert.ok(code.includes('tiktok-photo-nav-btn prev'))
  assert.ok(code.includes('tiktok-photo-nav-btn next'))

  // 6. Live region
  assert.ok(code.includes('aria-live="polite"'))

  // 7. Keyboard navigation
  assert.ok(code.includes("e.key === 'ArrowLeft'"))
  assert.ok(code.includes("e.key === 'ArrowRight'"))
})

test('PR-H 7: ProductQuickView applies carousel-photo-mode for 9:16 sizing', () => {
  const quickViewFile = path.resolve('src/components/client/ProductQuickView.jsx')
  const code = fs.readFileSync(quickViewFile, 'utf8')

  assert.ok(code.includes('carousel-photo-mode'))
  assert.ok(code.includes("activeSlide?.video?.kind === 'photo'"))
})
