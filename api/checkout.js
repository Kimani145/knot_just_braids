/**
 * api/checkout.js
 * Vercel Serverless Function: POST /api/checkout
 * Processes order checkout with server-side pricing and atomic inventory decrement.
 */

import { processCheckout } from '../server/core/checkout.js'
import { getStore } from '../server/adapters/firestoreStore.js'
import { createApiHandler } from '../server/adapters/httpUtils.js'

export default createApiHandler(
  async (_req, res, { body }) => {
    const store = getStore()
    const result = await processCheckout(store, body)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result))
  },
  {
    methods: ['POST'],
    rateLimit: { limit: 10, windowMs: 60 * 1000 }, // 10 checkouts/min per IP
  }
)
