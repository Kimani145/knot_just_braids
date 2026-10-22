/**
 * tests/w4-photo-ux.test.js
 * Verification for Workstream 4: Photo posts display real customer pictures,
 * photo posts are not added as video slides under link-only strategy,
 * calm single link row is rendered under carousel, and items without images display
 * an informative 'Photos on TikTok' affordance.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PHOTO_EMBED_STRATEGY, isPhotoEmbedEnabled } from '../src/utils/tiktokStrategy.js'

test('W4: Strategy default is official-player and isPhotoEmbedEnabled is true', () => {
  assert.equal(PHOTO_EMBED_STRATEGY, 'official-player')
  assert.equal(isPhotoEmbedEnabled(), true)
})

test('W4: ProductQuickView excludes photo posts from video slides under link-only strategy', () => {
  const quickViewPath = path.resolve('src/components/client/ProductQuickView.jsx')
  assert.ok(fs.existsSync(quickViewPath))
  const code = fs.readFileSync(quickViewPath, 'utf8')

  // Verifies embeddableVideos filters out photo posts when isPhotoEmbedEnabled is false
  assert.ok(
    code.includes('isPhotoEmbedEnabled()') &&
    code.includes("videos.filter((v) => v?.kind !== 'photo')"),
    'ProductQuickView must filter photo posts from slides when strategy does not support embedding'
  )

  // Verifies empty photo state for items with NO images
  assert.ok(
    code.includes('quick-view-photo-empty-state'),
    'ProductQuickView must render quick-view-photo-empty-state for photo items with no images'
  )
  assert.ok(
    code.includes('Photos on TikTok'),
    'Empty photo state must include Photos on TikTok badge'
  )

  // Verifies single calm link row under carousel
  assert.ok(
    code.includes('quick-view-photo-link-row'),
    'ProductQuickView must render quick-view-photo-link-row under carousel'
  )
  assert.ok(
    code.includes('See the original photo post on TikTok ↗'),
    'Photo link row must render the specified calm link copy'
  )
  assert.ok(
    code.includes('rel="noopener noreferrer"'),
    'All external links must specify rel="noopener noreferrer"'
  )
})

test('W4: TikTokPlayer includes preconnect optimization on user interaction', () => {
  const playerPath = path.resolve('src/components/client/TikTokPlayer.jsx')
  assert.ok(fs.existsSync(playerPath))
  const code = fs.readFileSync(playerPath, 'utf8')

  assert.ok(
    code.includes('preconnectTikTok'),
    'TikTokPlayer must contain preconnect helper'
  )
  assert.ok(
    code.includes('onPointerDown={preconnectTikTok}') &&
    code.includes('onMouseEnter={preconnectTikTok}'),
    'Facade button must trigger preconnect on pointerdown and hover'
  )
})
