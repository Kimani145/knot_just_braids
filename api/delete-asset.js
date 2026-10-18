/**
 * api/delete-asset.js
 * Vercel Serverless Function: POST /api/delete-asset
 * Admin-only: Deletes an asset from Cloudinary using Cloudinary Destroy API.
 */

import { generateDestroySignature } from '../server/core/cloudinary.js'
import { requireAdmin } from '../server/adapters/authAdapter.js'
import { createApiHandler } from '../server/adapters/httpUtils.js'
import { AppError, ValidationError } from '../server/core/errors.js'
import { logger } from '../server/core/log.js'

export default createApiHandler(
  async (req, res, { body }) => {
    // 1. Admin authorization check
    await requireAdmin(req)

    const publicId = body.publicId
    if (!publicId || typeof publicId !== 'string') {
      throw new ValidationError('publicId is required in request body', { field: 'publicId' })
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME

    if (!apiSecret || !apiKey || !cloudName) {
      throw new AppError('Cloudinary server credentials are not configured', 500, 'CONFIG_ERROR')
    }

    const signed = generateDestroySignature({
      publicId,
      apiSecret,
      apiKey,
      cloudName,
    })

    const formData = new URLSearchParams()
    formData.append('public_id', signed.publicId)
    formData.append('timestamp', signed.timestamp.toString())
    formData.append('api_key', signed.apiKey)
    formData.append('signature', signed.signature)

    const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`

    logger.info('Calling Cloudinary destroy API for asset', { publicId })

    const cloudinaryResponse = await fetch(destroyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const responseData = await cloudinaryResponse.json().catch(() => ({}))

    if (!cloudinaryResponse.ok) {
      throw new AppError(
        responseData.error?.message || 'Failed to destroy asset on Cloudinary',
        cloudinaryResponse.status,
        'CLOUDINARY_ERROR',
        responseData
      )
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        result: responseData.result || 'ok',
        publicId,
      })
    )
  },
  {
    methods: ['POST'],
    rateLimit: { limit: 20, windowMs: 60 * 1000 },
  }
)
