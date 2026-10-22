import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
} from './photoCarousel.js'

describe('photoCarousel utilities and reducer', () => {
  it('exports verified constants matching specifications', () => {
    assert.equal(AUTO_ADVANCE_GUARD_WINDOW_MS, 3000)
    assert.equal(COMMAND_THROTTLE_MS, 150)
    assert.equal(END_DETECTION_TIMEOUT_MS, 700)
    assert.equal(TIKTOK_TARGET_ORIGIN, 'https://www.tiktok.com')
  })

  it('createTikTokCommand formats compliant envelope with x-tiktok-player flag', () => {
    const navCmd = createTikTokCommand('navigateTo', 2)
    assert.deepEqual(navCmd, {
      type: 'navigateTo',
      value: 2,
      'x-tiktok-player': true,
    })

    const pauseCmd = createTikTokCommand('pause')
    assert.deepEqual(pauseCmd, {
      type: 'pause',
      value: null,
      'x-tiktok-player': true,
    })

    assert.throws(() => createTikTokCommand(''), /non-empty string/)
    assert.throws(() => createTikTokCommand(null), /non-empty string/)
  })

  it('postTikTokCommand sends message with strict origin and honors throttling', () => {
    const messages = []
    const mockWindow = {
      postMessage: (msg, origin) => {
        messages.push({ msg, origin })
      },
    }

    const throttleState = { lastSentAt: 0 }
    const t0 = 1000

    // First message succeeds
    const sent1 = postTikTokCommand(mockWindow, 'pause', null, throttleState, t0)
    assert.equal(sent1, true)
    assert.equal(messages.length, 1)
    assert.equal(messages[0].origin, 'https://www.tiktok.com')
    assert.deepEqual(messages[0].msg, {
      type: 'pause',
      value: null,
      'x-tiktok-player': true,
    })

    // Immediate second message is throttled (< 150ms)
    const sent2 = postTikTokCommand(mockWindow, 'navigateTo', 1, throttleState, t0 + 50)
    assert.equal(sent2, false)
    assert.equal(messages.length, 1)

    // Message after throttle window succeeds
    const sent3 = postTikTokCommand(mockWindow, 'navigateTo', 1, throttleState, t0 + 160)
    assert.equal(sent3, true)
    assert.equal(messages.length, 2)
    assert.equal(messages[1].origin, 'https://www.tiktok.com')
    assert.equal(messages[1].msg.value, 1)
  })

  it('isValidImageIndex strictly accepts valid non-negative integers', () => {
    assert.equal(isValidImageIndex(0), true)
    assert.equal(isValidImageIndex(5), true)
    assert.equal(isValidImageIndex(99), true)

    assert.equal(isValidImageIndex(-1), false)
    assert.equal(isValidImageIndex(100), false)
    assert.equal(isValidImageIndex(1.5), false)
    assert.equal(isValidImageIndex('0'), false)
    assert.equal(isValidImageIndex(null), false)
    assert.equal(isValidImageIndex(undefined), false)
    assert.equal(isValidImageIndex(NaN), false)
  })

  it('photoCarouselReducer: auto-advance guard intercepts early automated onImageChange', () => {
    let state = initialPhotoCarouselState

    // 1. Player reaches ready at t = 1000
    state = photoCarouselReducer(state, { type: 'PLAYER_READY', readyAt: 1000 })
    assert.equal(state.readyAt, 1000)
    assert.equal(state.guardActive, true)
    assert.equal(state.guardTriggered, false)

    // 2. Early automated slide jump to index 1 arrives at t = 2200 (within 3000ms guard window)
    state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 1, now: 2200 })
    assert.equal(state.currentIndex, 1)
    assert.equal(state.maxIndexSeen, 1)
    assert.equal(state.guardTriggered, true)
    assert.equal(state.guardActive, false)
    assert.equal(state.needsResetToZero, true)

    // 3. Acknowledged reset to zero
    state = photoCarouselReducer(state, { type: 'ACK_RESET_TO_ZERO' })
    assert.equal(state.needsResetToZero, false)

    // 4. Reset to photo 0 arrives
    state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 0, now: 2250 })
    assert.equal(state.currentIndex, 0)
    assert.equal(state.needsResetToZero, false)
  })

  it('photoCarouselReducer: user interaction immediately cancels guard', () => {
    let state = photoCarouselReducer(initialPhotoCarouselState, { type: 'PLAYER_READY', readyAt: 1000 })
    assert.equal(state.guardActive, true)

    // User navigates forward
    state = photoCarouselReducer(state, { type: 'USER_NAVIGATE', targetIndex: 1 })
    assert.equal(state.guardActive, false)
    assert.equal(state.pendingTargetIndex, 1)

    // onImageChange arrives: guard is not triggered because user initiated
    state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 1, now: 1200 })
    assert.equal(state.guardTriggered, false)
    assert.equal(state.needsResetToZero, false)
    assert.equal(state.currentIndex, 1)
  })

  it('photoCarouselReducer: end discovery via NAVIGATE_TIMEOUT', () => {
    let state = initialPhotoCarouselState

    // Reached index 1
    state = photoCarouselReducer(state, { type: 'IMAGE_CHANGE', index: 1, now: 1000 })
    assert.equal(state.currentIndex, 1)
    assert.equal(state.maxIndexSeen, 1)
    assert.equal(state.totalPhotos, null)

    // User attempts to navigate to index 2
    state = photoCarouselReducer(state, { type: 'USER_NAVIGATE', targetIndex: 2 })
    assert.equal(state.pendingTargetIndex, 2)

    // 700ms timeout passes with no onImageChange
    state = photoCarouselReducer(state, { type: 'NAVIGATE_TIMEOUT', targetIndex: 2 })
    assert.equal(state.totalPhotos, 2) // Discovered total photos = 2 (indices 0 and 1)
    assert.equal(state.isAtEnd, true)
    assert.equal(state.currentIndex, 1)
    assert.equal(state.pendingTargetIndex, null)
  })
})
