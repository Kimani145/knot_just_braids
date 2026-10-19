/**
 * api/booking.js
 * Vercel Serverless Function: POST /api/booking
 * Processes salon appointment booking requests with input validation and policy checks.
 */

import { processBooking } from '../server/core/booking.js'
import { getStore } from '../server/adapters/firestoreStore.js'
import { createApiHandler } from '../server/adapters/httpUtils.js'

export default createApiHandler(
  async (_req, res, { body }) => {
    const store = getStore()
    const result = await processBooking(store, body)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result))
  },
  {
    methods: ['POST'],
    rateLimit: { limit: 15, windowMs: 60 * 1000 }, // 15 bookings/min per IP
  }
)
