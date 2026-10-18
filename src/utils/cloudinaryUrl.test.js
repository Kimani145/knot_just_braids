/**
 * src/utils/cloudinaryUrl.test.js
 * Unit tests for Cloudinary responsive URL transformations.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getOptimizedCloudinaryUrl } from './cloudinaryUrl.js'

describe('Cloudinary URL Optimizer', () => {
  const sampleUrl =
    'https://res.cloudinary.com/knotjust/image/upload/v1700000000/knot_just/catalog/anklet_blue.jpg'

  it('injects f_auto,q_auto and width constraints', () => {
    const optimized = getOptimizedCloudinaryUrl(sampleUrl, { width: 400 })
    assert.equal(
      optimized,
      'https://res.cloudinary.com/knotjust/image/upload/f_auto,q_auto,w_400,c_limit/v1700000000/knot_just/catalog/anklet_blue.jpg'
    )
  })

  it('preserves non-Cloudinary URLs unmodified', () => {
    const external = 'https://images.unsplash.com/photo-1234'
    assert.equal(getOptimizedCloudinaryUrl(external, { width: 400 }), external)
    assert.equal(getOptimizedCloudinaryUrl('data:image/png;base64,...'), 'data:image/png;base64,...')
  })

  it('handles empty or missing URLs gracefully', () => {
    assert.equal(getOptimizedCloudinaryUrl(''), '')
    assert.equal(getOptimizedCloudinaryUrl(null), '')
  })

  it('avoids duplicate transformation segments if already transformed', () => {
    const alreadyOptimized =
      'https://res.cloudinary.com/knotjust/image/upload/f_auto,q_auto/v1700000000/anklet.jpg'
    assert.equal(getOptimizedCloudinaryUrl(alreadyOptimized, { width: 600 }), alreadyOptimized)
  })
})
