/**
 * src/services/api.js
 * Client-side API client for Knot Just backend services.
 * Supports signed Cloudinary uploads, asset deletion, and server-side checkout/bookings.
 */

const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key]
  }
  if (typeof globalThis !== 'undefined' && globalThis.process?.env && globalThis.process.env[key]) {
    return globalThis.process.env[key]
  }
  return ''
}

const API_BASE_URL = getEnvVar('VITE_API_BASE_URL')

/**
 * Feature flag check for backend API checkout/booking cutover.
 */
export function isApiCheckoutEnabled() {
  return getEnvVar('VITE_USE_API_CHECKOUT') === 'true'
}

/**
 * Submit an order to the backend checkout API.
 */
export async function submitApiCheckout(orderPayload) {
  const response = await fetch(`${API_BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.error?.message || `Checkout failed (${response.status})`)
    error.status = response.status
    error.code = data.error?.code
    error.details = data.error?.details
    throw error
  }

  return data
}

/**
 * Submit a salon booking appointment to the backend booking API.
 */
export async function submitApiBooking(bookingPayload) {
  const response = await fetch(`${API_BASE_URL}/api/booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingPayload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.error?.message || `Booking failed (${response.status})`)
    error.status = response.status
    error.code = data.error?.code
    error.details = data.error?.details
    throw error
  }

  return data
}

/**
 * Fetch signed upload parameters for admin catalog uploads.
 */
export async function fetchSignedUploadParams(authToken, folder = 'knot_just/catalog') {
  const response = await fetch(`${API_BASE_URL}/api/sign-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ folder }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Failed to sign upload (${response.status})`)
  }

  return await response.json()
}

/**
 * Fetch signed upload parameters for customer reference photo uploads.
 */
export async function fetchSignedReferenceUploadParams() {
  const response = await fetch(`${API_BASE_URL}/api/sign-reference-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message || `Failed to sign reference photo upload (${response.status})`
    )
  }

  return await response.json()
}

/**
 * Delete a Cloudinary asset via backend Destroy API.
 */
export async function deleteCloudinaryAsset(authToken, publicId) {
  const response = await fetch(`${API_BASE_URL}/api/delete-asset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ publicId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Failed to delete asset (${response.status})`)
  }

  return await response.json()
}

/**
 * Upload a file to Cloudinary using signed parameters.
 */
export async function uploadToCloudinarySigned(file, signedParams) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signedParams.apiKey)
  formData.append('timestamp', signedParams.timestamp.toString())
  formData.append('signature', signedParams.signature)
  if (signedParams.folder) {
    formData.append('folder', signedParams.folder)
  }
  if (signedParams.tags) {
    formData.append('tags', signedParams.tags)
  }

  const cloudName = signedParams.cloudName
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Cloudinary signed upload failed: ${errorText}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Upload an image to Cloudinary, trying signed upload first, and falling back to unsigned preset if configured.
 */
export async function uploadImageWithFallback(file, options = {}) {
  const { authToken, folder = 'knot_just/catalog', isReferencePhoto = false } = options
  const fallbackCloudName = getEnvVar('VITE_CLOUDINARY_CLOUD_NAME')
  const fallbackPreset = getEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET')

  // Attempt signed upload
  try {
    let signedParams
    if (isReferencePhoto) {
      signedParams = await fetchSignedReferenceUploadParams()
    } else if (authToken) {
      signedParams = await fetchSignedUploadParams(authToken, folder)
    }

    if (signedParams && signedParams.signature) {
      const result = await uploadToCloudinarySigned(file, signedParams)
      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
      }
    }
  } catch (signedErr) {
    console.warn(
      '[api/upload] Signed upload unavailable; attempting unsigned fallback:',
      signedErr.message
    )
  }

  // Fallback to legacy unsigned preset
  if (!fallbackCloudName || !fallbackPreset) {
    throw new Error('No Cloudinary credentials or fallback upload preset available.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', fallbackPreset)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${fallbackCloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Unsigned upload failed: ${errorText}`)
    }

    const data = await response.json()
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      format: data.format,
      bytes: data.bytes,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Extract Cloudinary public_id from an asset URL.
 * Handles both versioned and unversioned URLs, stripping file extensions.
 * e.g. "https://res.cloudinary.com/cloud/image/upload/v1234/knot_just/catalog/abc.webp" -> "knot_just/catalog/abc"
 */
export function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== 'string') return null
  const uploadIndex = url.indexOf('/upload/')
  if (uploadIndex === -1) return null
  let path = url.slice(uploadIndex + 8)
  path = path.replace(/^v\d+\//, '')
  path = path.replace(/\.[a-zA-Z0-9]+$/, '')
  return path || null
}

