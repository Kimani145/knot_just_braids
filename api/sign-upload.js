/**
 * api/sign-upload.js
 * Vercel Serverless Function: POST /api/sign-upload
 * Admin-only: Generates signed parameters for Cloudinary catalog asset uploads.
 */

import { generateAdminUploadSignature } from '../server/core/cloudinary.js'
import { requireAdmin } from '../server/adapters/authAdapter.js'
import { createApiHandler } from '../server/adapters/httpUtils.js'
import { AppError } from '../server/core/errors.js'

export default createApiHandler(
  async (req, res, { body }) => {
    // 1. Verify admin token
    await requireAdmin(req)

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME

    if (!apiSecret || !apiKey || !cloudName) {
      throw new AppError('Cloudinary server credentials are not configured', 500, 'CONFIG_ERROR')
    }

    const folder = body.folder || 'knot_just/catalog'
    const signedParams = generateAdminUploadSignature({
      folder,
      apiSecret,
      apiKey,
      cloudName,
      tags: body.tags,
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
    rateLimit: { limit: 30, windowMs: 60 * 1000 },
  }
)
