/**
 * src/utils/imageCompressor.test.js
 * Unit tests for image compressor dimension calculations and fallbacks.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateAspectRatioFit, compressImage } from './imageCompressor.js'

describe('Image Compressor - Dimension Calculations', () => {
  it('preserves dimensions if already smaller than maximum bounds', () => {
    const fit = calculateAspectRatioFit(800, 600, 1280, 1280)
    assert.deepEqual(fit, { width: 800, height: 600 })
  })

  it('scales down landscape dimensions proportionally', () => {
    // 4000x2000 scaled to max 1280
    const fit = calculateAspectRatioFit(4000, 2000, 1280, 1280)
    assert.equal(fit.width, 1280)
    assert.equal(fit.height, 640)
  })

  it('scales down portrait dimensions proportionally', () => {
    // 2000x4000 scaled to max 1280
    const fit = calculateAspectRatioFit(2000, 4000, 1280, 1280)
    assert.equal(fit.width, 640)
    assert.equal(fit.height, 1280)
  })

  it('handles non-browser environment gracefully by returning file as-is', async () => {
    const fakeFile = { name: 'test.jpg', type: 'image/jpeg', size: 1000 }
    const result = await compressImage(fakeFile)
    assert.deepEqual(result, fakeFile)
  })
})
