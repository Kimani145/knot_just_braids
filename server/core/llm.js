import { RateLimitError } from './errors.js'

/**
 * Server Core - LLM Provider Interface & Security Guardrails
 * Implements Decision Gate D3:
 * - Provider interface with Mock provider for testing and zero-cost operation.
 * - Prompt injection & jailbreak detection heuristics.
 * - Per-user token / message rate limiting to prevent cost abuse.
 * - Safe human escalation routing.
 */

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+(?:an?\s+unfiltered|dan|developer\s+mode)/i,
  /forget\s+(?:all\s+)?your\s+instructions/i,
  /reveal\s+(?:your\s+)?(?:secret|api\s+key|prompt)/i,
  /developer\s+mode\s+active/i,
  /override\s+(?:all\s+)?safety/i,
  /simulate\s+a\s+virtual\s+machine/i,
  /base64\s+decode\s*:/i,
]

const HUMAN_ESCALATION_KEYWORDS = [
  /\bhuman\b/i,
  /\bagent\b/i,
  /\bowner\b/i,
  /\bmanager\b/i,
  /\bcall\s+me\b/i,
  /\bspeak\s+to\s+someone\b/i,
  /\btalk\s+to\s+a\s+person\b/i,
  /\breal\s+person\b/i,
]

/**
 * Evaluates whether text contains prompt injection or jailbreak indicators.
 * @param {string} text
 * @returns {{ isThreat: boolean, reason?: string }}
 */
export function detectPromptInjection(text = '') {
  if (typeof text !== 'string') return { isThreat: false }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isThreat: true,
        reason: `Matched prompt guardrail heuristic: ${pattern.source}`,
      }
    }
  }

  return { isThreat: false }
}

/**
 * Determines whether a customer request should escalate to human staff.
 * @param {string} text
 * @param {number} [unresolvedTurnCount=0]
 * @returns {{ escalate: boolean, reason?: string, contactUrl: string }}
 */
export function shouldEscalateToHuman(text = '', unresolvedTurnCount = 0) {
  const injection = detectPromptInjection(text)
  if (injection.isThreat) {
    return {
      escalate: true,
      reason: 'security_guardrail_triggered',
      contactUrl: 'https://wa.me/254700000000',
    }
  }

  for (const pattern of HUMAN_ESCALATION_KEYWORDS) {
    if (pattern.test(text)) {
      return {
        escalate: true,
        reason: 'customer_requested_human',
        contactUrl: 'https://wa.me/254700000000',
      }
    }
  }

  if (unresolvedTurnCount >= 4) {
    return {
      escalate: true,
      reason: 'turn_count_threshold_exceeded',
      contactUrl: 'https://wa.me/254700000000',
    }
  }

  return {
    escalate: false,
    contactUrl: 'https://wa.me/254700000000',
  }
}

/**
 * Sliding window rate limiter for inbound WhatsApp AI messages per phone number.
 */
export class WhatsAppRateLimiter {
  constructor({ maxRequests = 10, windowMs = 3600000 } = {}) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.history = new Map()
  }

  check(phoneNumber) {
    const now = Date.now()
    const timestamps = (this.history.get(phoneNumber) || []).filter(
      (ts) => now - ts < this.windowMs,
    )

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0]
      const retryAfter = Math.ceil((oldest + this.windowMs - now) / 1000)
      return { allowed: false, retryAfter }
    }

    timestamps.push(now)
    this.history.set(phoneNumber, timestamps)
    return { allowed: true, retryAfter: 0 }
  }

  assertAllowed(phoneNumber) {
    const result = this.check(phoneNumber)
    if (!result.allowed) {
      throw new RateLimitError(
        `Too many automated requests. Please wait ${result.retryAfter} seconds before trying again.`,
        { retryAfter: result.retryAfter },
      )
    }
  }
}

/**
 * Base Abstract LLM Provider
 */
export class LlmProvider {
  /**
   * @param {string} prompt
   * @param {Record<string, any>} [context]
   * @returns {Promise<string>}
   */
  async generateReply(prompt, context = {}) { // eslint-disable-line no-unused-vars
    throw new Error('generateReply must be implemented by concrete provider')
  }
}

/**
 * Deterministic Mock LLM Provider for Knot Just storefront inquiries.
 * Zero external calls, zero API token burn.
 */
export class MockLlmProvider extends LlmProvider {
  constructor({ brandName = 'Knot Just' } = {}) {
    super()
    this.brandName = brandName
  }

  async generateReply(prompt, context = {}) {
    const text = (prompt || '').toLowerCase()

    if (context.injectionDetected) {
      return `I can only assist with ${this.brandName} salon styles, appointments, and beadwork. If you'd like to reach our staff directly, please tap here: https://wa.me/254700000000`
    }

    if (text.includes('price') || text.includes('cost') || text.includes('how much')) {
      return `Our beadwork starts from Kshs 25 to Kshs 250, and braiding salon styles range from Kshs 1,200 to Kshs 4,500 depending on length and complexity. View our full interactive catalog online!`
    }

    if (text.includes('book') || text.includes('appointment') || text.includes('hair')) {
      return `We'd love to braid your hair! 🌸 You can select your preferred style, date, and time directly on our storefront booking sheet, or let me know what style you're interested in.`
    }

    if (text.includes('location') || text.includes('where') || text.includes('salon')) {
      return `We are located in Kasarani, Nairobi, and are also available for house calls! 🏠`
    }

    return `Hello from ${this.brandName}! ✨ I can assist you with our braiding styles, handcrafted beadwork, or booking an appointment. What would you like to know?`
  }
}
