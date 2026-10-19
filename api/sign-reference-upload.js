/**
 * api/sign-reference-upload.js
 * Vercel Serverless Function: POST /api/sign-reference-upload
 * Customer-facing: Generates signed parameters for customer reference photo uploads.
 * Scoped strictly to knot_just/reference_photos.
 */

import { generateReferencePhotoSignature } from '../server/core/cloudinary.js'
import { createApiHandler } from '../server/adapters/httpUtils.js'
import { AppError } from '../server/core/errors.js'

export default createApiHandler(
  async (_req, res) => {
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME

    if (!apiSecret || !apiKey || !cloudName) {
      throw new AppError('Cloudinary server credentials are not configured', 500, 'CONFIG_ERROR')
    }

    const signedParams = generateReferencePhotoSignature({
      folder: 'knot_just/reference_photos',
      apiSecret,
      apiKey,
      cloudName,
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        ...signedParams,
      })
    )
  },
  {
    methods: ['POST'],
    rateLimit: { limit: 15, windowMs: 60 * 1000 }, // 15 uploads per minute per IP
  }
)
