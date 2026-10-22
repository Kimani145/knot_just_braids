/**
 * tests/red-team-tiktok.test.js
 * Red-team security and integrity attack suite for TikTok embedding.
 * Attacks input sanitation, iframe src constraints, postMessage envelope checks,
 * audio unmount guarantees, and photo post degradation states.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildPlayerSrc,
  buildEmbedV2Src,
  buildWatchUrl,
  sanitizeVideos,
} from '../src/utils/tiktok.js'
import { isRetryableError } from '../src/utils/tiktokErrors.js'

test('RED-TEAM 1: Poisoned and path-traversal IDs are strictly rejected', () => {
  const attacks = [
    '123/../evil',
    '7681345289243905298/../../secret',
    'javascript:alert(1)',
    '<script>alert(1)</script>',
    'http://attacker.com/evil',
    '//attacker.com/7681345289243905298',
    '7681345289243905298?extra=param&leak=true',
    '7681345289243905298#fragment',
    '7681345289243905298\r\nHeader-Injection: true',
    '   ',
    '',
    null,
    undefined,
    123456789012345, // Numbers must not be converted (prevents precision loss & coercion bugs)
    {},
    [],
  ]

  for (const attack of attacks) {
    assert.equal(buildPlayerSrc(attack), null, `buildPlayerSrc must reject: ${attack}`)
    assert.equal(buildEmbedV2Src(attack), null, `buildEmbedV2Src must reject: ${attack}`)
    assert.equal(buildWatchUrl({ id: attack, handle: 'knot.justbraids' }), null, `buildWatchUrl must reject: ${attack}`)
  }
})

test('RED-TEAM 2: buildEmbedV2Src language parameter prevents header injection and XSS', () => {
  const attackLangs = [
    '<script>',
    'en-US&evil=1',
    'en-US\r\nSet-Cookie: evil',
    '../../etc',
    'a'.repeat(50),
  ]

  for (const lang of attackLangs) {
    const res = buildEmbedV2Src('7681345289243905298', { lang })
    // If invalid lang is passed, it must fallback to en-US or reject safely
    assert.ok(res.includes('lang=en-US'), `Must sanitize poisoned lang: ${lang}`)
  }
})

test('RED-TEAM 3: Iframe src hosts and paths are strictly constrained', () => {
  const validId = '7681345289243905298'
  const playerUrl = new URL(buildPlayerSrc(validId))
  const embedV2Url = new URL(buildEmbedV2Src(validId))

  assert.equal(playerUrl.protocol, 'https:')
  assert.equal(playerUrl.hostname, 'www.tiktok.com')
  assert.equal(playerUrl.pathname, `/player/v1/${validId}`)

  assert.equal(embedV2Url.protocol, 'https:')
  assert.equal(embedV2Url.hostname, 'www.tiktok.com')
  assert.equal(embedV2Url.pathname, `/embed/v2/${validId}`)
})

test('RED-TEAM 4: TikTokPlayer verifies origin, contentWindow source, and envelope', () => {
  const playerFile = path.resolve('src/components/client/TikTokPlayer.jsx')
  const code = fs.readFileSync(playerFile, 'utf8')

  // Origin check
  assert.ok(
    code.includes("event.origin !== 'https://www.tiktok.com'"),
    'Must reject postMessage from any origin other than https://www.tiktok.com'
  )

  // Source check
  assert.ok(
    code.includes('event.source !== iframeRef.current.contentWindow'),
    "Must verify postMessage source matches player iframe's contentWindow"
  )

  // Envelope check
  assert.ok(
    code.includes("event.data['x-tiktok-player'] !== true"),
    'Must validate x-tiktok-player envelope flag'
  )
})

test('RED-TEAM 5: Audio unmount guarantee when modal closes or slide changes', () => {
  const playerFile = path.resolve('src/components/client/TikTokPlayer.jsx')
  const code = fs.readFileSync(playerFile, 'utf8')

  // Play state reset condition
  assert.ok(
    code.includes('if (!isOpen || !isActiveSlide)'),
    'Must check if modal is open and current slide is active'
  )
  assert.ok(
    code.includes('setHasUserTappedPlay(false)'),
    'Must reset hasUserTappedPlay when slide becomes inactive or modal closes'
  )
  assert.ok(
    code.includes("setPlayerStatus('idle')"),
    'Must reset player status to idle on unmount'
  )
})

test('RED-TEAM 6: Non-retryable error 1001 INVALID_VIDEO suppresses retry loop', () => {
  assert.equal(isRetryableError(1001), false)
  assert.equal(isRetryableError('1001'), false)
  assert.equal(isRetryableError(2001), true)

  const playerFile = path.resolve('src/components/client/TikTokPlayer.jsx')
  const code = fs.readFileSync(playerFile, 'utf8')

  assert.ok(
    code.includes('!isPermanentError') && code.includes('isRetryableError'),
    'Retry button must never be shown for permanent non-retryable error 1001'
  )
})

test('RED-TEAM 7: sanitizeVideos drops poisoned, empty, and excess videos', () => {
  const raw = [
    { provider: 'youtube', id: 'abc' }, // wrong provider
    { provider: 'tiktok', id: '123/../evil', handle: 'valid_handle' }, // traversal
    { provider: 'tiktok', id: '7681345289243905298', handle: '<script>' }, // xss handle
    { provider: 'tiktok', id: '7681345289243905298', handle: 'valid_handle', kind: 'photo' }, // valid
    { provider: 'tiktok', id: '7681345289243905298', handle: 'valid_handle', kind: 'photo' }, // dup
    { provider: 'tiktok', id: '7671327868349123848', handle: 'valid_handle', kind: 'video' }, // valid
    { provider: 'tiktok', id: '7682424844671012114', handle: 'valid_handle', kind: 'video' }, // excess (>2)
  ]

  const clean = sanitizeVideos(raw)
  assert.equal(clean.length, 2)
  assert.equal(clean[0].id, '7681345289243905298')
  assert.equal(clean[0].kind, 'photo')
  assert.equal(clean[1].id, '7671327868349123848')
  assert.equal(clean[1].kind, 'video')
})
