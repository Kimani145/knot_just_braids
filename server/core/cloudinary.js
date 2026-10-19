/**
 * server/core/cloudinary.js
 * Pure JavaScript Cloudinary signature generator using Node crypto.
 * Zero external SDK dependencies.
 */

import crypto from 'node:crypto'
import { ValidationError } from './errors.js'

/**
 * Generate a Cloudinary SHA-1 upload signature according to official specification.
 * Sorts parameters alphabetically, joins as key=value&key2=value2, appends secret, and hashes with SHA-1.
 *
 * @param {Record<string, any>} params - upload parameters to sign
 * @param {string} apiSecret - Cloudinary API Secret
 * @returns {string} hex-encoded SHA-1 signature
 */
export function generateCloudinarySignature(params, apiSecret) {
  if (!apiSecret || typeof apiSecret !== 'string') {
    throw new ValidationError('Cloudinary API secret is required for signing')
  }

  // Filter out parameters that must NOT be signed per Cloudinary docs
  const ignoredKeys = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature'])

  const filteredKeys = Object.keys(params)
    .filter((key) => !ignoredKeys.has(key) && params[key] !== undefined && params[key] !== null)
    .sort()

  const stringToSign =
    filteredKeys.map((key) => `${key}=${params[key]}`).join('&') + apiSecret

  return crypto.createHash('sha1').update(stringToSign).digest('hex')
}

/**
 * Generate signed upload parameters for admin asset uploads.
 */
export function generateAdminUploadSignature({
  folder = 'knot_just/catalog',
  apiSecret,
  apiKey,
  cloudName,
  tags,
}) {
  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = {
    folder,
    timestamp,
    ...(tags ? { tags } : {}),
  }

  const signature = generateCloudinarySignature(paramsToSign, apiSecret)

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    ...(tags ? { tags } : {}),
  }
}

/**
 * Generate signed upload parameters for customer reference photos.
 * Scoped strictly to the reference_photos folder.
 */
export function generateReferencePhotoSignature({
  folder = 'knot_just/reference_photos',
  apiSecret,
  apiKey,
  cloudName,
}) {
  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = {
    folder,
    timestamp,
  }

  const signature = generateCloudinarySignature(paramsToSign, apiSecret)

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  }
}

/**
 * Generate signed parameters for Cloudinary asset deletion (Destroy API).
 */
export function generateDestroySignature({ publicId, apiSecret, apiKey, cloudName }) {
  if (!publicId || typeof publicId !== 'string') {
    throw new ValidationError('publicId is required to delete an asset')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = {
    public_id: publicId,
    timestamp,
  }

  const signature = generateCloudinarySignature(paramsToSign, apiSecret)

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    publicId,
  }
}
