/**
 * server/adapters/httpUtils.js
 * HTTP adapter utilities for Vercel Serverless Functions.
 * Handles CORS, JSON parsing, client IP extraction, rate limiting, and error responses.
 */

import { formatErrorResponse } from '../core/errors.js'
import { defaultRateLimiter } from '../core/rateLimit.js'
import { logger } from '../core/log.js'

/**
 * Extract client IP address for rate limiting.
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1'
}

/**
 * Apply standard CORS headers to response.
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || ''
  const allowedOriginsStr = process.env.ALLOWED_ORIGINS || ''
  const allowedOrigins = allowedOriginsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const isAllowed =
    allowedOrigins.length === 0 ||
    allowedOrigins.includes(origin) ||
    origin.startsWith('http://localhost:') ||
    origin.endsWith('.vercel.app')

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!allowedOriginsStr) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with')
  res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * Parse JSON body safely from incoming request.
 */
export async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body)
    } catch {
      throw new Error('Malformed JSON payload in request body')
    }
  }

  // Handle stream if body not pre-parsed
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Malformed JSON payload in request body'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Higher-order wrapper for Vercel serverless function handlers.
 * @param {Function} handler - async (req, res, context) => void
 * @param {object} [options] - configuration for rate limiting, methods, etc.
 */
export function createApiHandler(handler, options = {}) {
  const allowedMethods = options.methods || ['GET', 'POST']
  const rateLimitConfig = options.rateLimit || { limit: 30, windowMs: 60 * 1000 }

  return async function (req, res) {
    setCorsHeaders(req, res)

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    // Method guard
    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods.join(', '))
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} is not allowed. Allowed: ${allowedMethods.join(', ')}`,
          },
        })
      )
      return
    }

    // Rate limiting
    const ip = getClientIp(req)
    const rateLimit = defaultRateLimiter.check(ip, rateLimitConfig)
    res.setHeader('X-RateLimit-Limit', rateLimit.limit)
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
    res.setHeader('X-RateLimit-Reset', rateLimit.resetSeconds)

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', rateLimit.resetSeconds)
      res.statusCode = 429
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many requests from this network. Try again in ${rateLimit.resetSeconds}s.`,
          },
        })
      )
      return
    }

    try {
      let body = {}
      if (req.method === 'POST') {
        body = await parseJsonBody(req)
      }

      await handler(req, res, { body, ip, rateLimit })
    } catch (err) {
      logger.error('Unhandled API exception', err, { path: req.url, method: req.method })
      const { status, body } = formatErrorResponse(err)
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }
  }
}
