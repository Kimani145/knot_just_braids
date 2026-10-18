/**
 * tests/cloudinary.test.js
 * Unit tests for Cloudinary signature generation and signed upload helpers.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  generateAdminUploadSignature,
  generateCloudinarySignature,
  generateDestroySignature,
  generateReferencePhotoSignature,
} from '../server/core/cloudinary.js'
import { ValidationError } from '../server/core/errors.js'

describe('Server Core - Cloudinary Signatures', () => {
  const mockSecret = 'test_api_secret_12345'
  const mockKey = '1234567890'
  const mockCloud = 'knotjust-cloud'

  it('generates SHA-1 signature according to Cloudinary specification', () => {
    // Official test case simulation:
    // params: folder: 'test', timestamp: 12345678
    // stringToSign: 'folder=test&timestamp=12345678' + secret
    const params = { folder: 'test', timestamp: 12345678 }
    const expectedHash = crypto
      .createHash('sha1')
      .update(`folder=test&timestamp=12345678${mockSecret}`)
      .digest('hex')

    const sig = generateCloudinarySignature(params, mockSecret)
    assert.equal(sig, expectedHash)
  })

  it('ignores file, cloud_name, api_key, and signature when sorting parameters', () => {
    const params = {
      folder: 'knot_just/catalog',
      timestamp: 1700000000,
      file: 'data:image/png;base64,...',
      cloud_name: 'testcloud',
      api_key: '987654321',
      signature: 'ignore_me',
      tags: 'salon,braids',
    }

    const expectedString = `folder=knot_just/catalog&tags=salon,braids&timestamp=1700000000${mockSecret}`
    const expectedHash = crypto.createHash('sha1').update(expectedString).digest('hex')

    const sig = generateCloudinarySignature(params, mockSecret)
    assert.equal(sig, expectedHash)
  })

  it('throws ValidationError when API secret is missing or empty', () => {
    assert.throws(() => generateCloudinarySignature({ folder: 'test' }, ''), ValidationError)
    assert.throws(() => generateCloudinarySignature({ folder: 'test' }, null), ValidationError)
  })

  it('generates admin upload signature with catalog folder default', () => {
    const signed = generateAdminUploadSignature({
      apiSecret: mockSecret,
      apiKey: mockKey,
      cloudName: mockCloud,
    })

    assert.equal(signed.apiKey, mockKey)
    assert.equal(signed.cloudName, mockCloud)
    assert.equal(signed.folder, 'knot_just/catalog')
    assert.ok(signed.timestamp > 0)
    assert.ok(typeof signed.signature === 'string' && signed.signature.length === 40)
  })

  it('generates customer reference photo signature scoped to reference_photos', () => {
    const signed = generateReferencePhotoSignature({
      apiSecret: mockSecret,
      apiKey: mockKey,
      cloudName: mockCloud,
    })

    assert.equal(signed.folder, 'knot_just/reference_photos')
    assert.ok(typeof signed.signature === 'string' && signed.signature.length === 40)
  })

  it('generates destroy signature and validates publicId', () => {
    assert.throws(
      () =>
        generateDestroySignature({
          publicId: '',
          apiSecret: mockSecret,
          apiKey: mockKey,
          cloudName: mockCloud,
        }),
      ValidationError
    )

    const signed = generateDestroySignature({
      publicId: 'knot_just/catalog/sample_bead',
      apiSecret: mockSecret,
      apiKey: mockKey,
      cloudName: mockCloud,
    })

    assert.equal(signed.publicId, 'knot_just/catalog/sample_bead')
    assert.ok(typeof signed.signature === 'string' && signed.signature.length === 40)
  })
})
