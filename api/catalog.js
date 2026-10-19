/**
 * api/catalog.js
 * Vercel Serverless Function: GET /api/catalog
 * Retrieves full salon styles and bead products catalog with CDN cache headers.
 */

import { fetchFullCatalog } from '../server/core/catalog.js'
import { getStore } from '../server/adapters/firestoreStore.js'
import { createApiHandler } from '../server/adapters/httpUtils.js'

export default createApiHandler(
  async (_req, res) => {
    const store = getStore()
    const catalog = await fetchFullCatalog(store)

    // Edge cache for 60 seconds; stale-while-revalidate for 5 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        ...catalog,
      })
    )
  },
  {
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60 * 1000 },
  }
)
