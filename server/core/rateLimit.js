/**
 * server/core/rateLimit.js
 * In-memory sliding-window rate limiter.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

import { RateLimitError } from './errors.js'

export class InMemoryRateLimiter {
  constructor(options = {}) {
    this.defaultLimit = options.defaultLimit || 20 // max requests
    this.defaultWindowMs = options.defaultWindowMs || 60 * 1000 // 1 minute
    this.hits = new Map() // key -> Array<timestamp>

    // Periodically clean up stale records every 5 minutes if timer available
    this._cleanupInterval = options.cleanupInterval || 5 * 60 * 1000
    this._lastCleanup = Date.now()
  }

  _cleanup(now = Date.now()) {
    if (now - this._lastCleanup < this._cleanupInterval) return
    this._lastCleanup = now

    for (const [key, timestamps] of this.hits.entries()) {
      const recent = timestamps.filter((t) => now - t < this.defaultWindowMs)
      if (recent.length === 0) {
        this.hits.delete(key)
      } else {
        this.hits.set(key, recent)
      }
    }
  }

  /**
   * Check rate limit for a given key.
   * @param {string} key - e.g. client IP or user ID
   * @param {object} [config] - override limit and windowMs
   * @returns {{ allowed: boolean, remaining: number, resetSeconds: number, limit: number }}
   */
  check(key, config = {}) {
    const limit = config.limit || this.defaultLimit
    const windowMs = config.windowMs || this.defaultWindowMs
    const now = config.now || Date.now()

    this._cleanup(now)

    let timestamps = this.hits.get(key) || []
    // Keep only timestamps within current sliding window
    timestamps = timestamps.filter((t) => now - t < windowMs)

    if (timestamps.length >= limit) {
      const oldest = timestamps[0]
      const resetMs = Math.max(0, windowMs - (now - oldest))
      const resetSeconds = Math.ceil(resetMs / 1000)

      this.hits.set(key, timestamps)
      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
        limit,
      }
    }

    timestamps.push(now)
    this.hits.set(key, timestamps)

    const resetMs = windowMs - (now - timestamps[0])
    return {
      allowed: true,
      remaining: limit - timestamps.length,
      resetSeconds: Math.ceil(resetMs / 1000),
      limit,
    }
  }

  /**
   * Convenience assertion that throws RateLimitError if not allowed.
   */
  assertAllowed(key, config = {}) {
    const result = this.check(key, config)
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${result.resetSeconds} seconds.`,
        result.resetSeconds
      )
    }
    return result
  }

  /**
   * Reset store (useful for tests)
   */
  reset() {
    this.hits.clear()
  }
}

export const defaultRateLimiter = new InMemoryRateLimiter()
