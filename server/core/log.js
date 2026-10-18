/**
 * server/core/log.js
 * Structured logging with Kenya Data Protection Act 2019 compliance (PII masking).
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(\+?254|0)[17]\d{8}/g
const GENERIC_PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g

/**
 * Mask an email address: john.doe@example.com -> j***e@example.com
 */
export function maskEmail(email) {
  if (typeof email !== 'string') return email
  return email.replace(EMAIL_REGEX, (match) => {
    const [user, domain] = match.split('@')
    if (user.length <= 2) {
      return `${user[0]}***@${domain}`
    }
    return `${user[0]}***${user[user.length - 1]}@${domain}`
  })
}

/**
 * Mask a Kenyan or international phone number: +254712345678 -> +254****5678
 */
export function maskPhone(phone) {
  if (typeof phone !== 'string') return phone
  return phone.replace(PHONE_REGEX, (match) => {
    const prefix = match.slice(0, 4)
    const suffix = match.slice(-4)
    return `${prefix}****${suffix}`
  })
}

/**
 * Recursively sanitize objects or arrays to redact known PII keys and pattern matches.
 */
export function redactPII(value) {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return maskPhone(maskEmail(value))
  }

  if (Array.isArray(value)) {
    return value.map(redactPII)
  }

  if (typeof value === 'object') {
    const sanitized = {}
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase()
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('auth')
      ) {
        sanitized[key] = '[REDACTED_SECRET]'
      } else if (
        lowerKey.includes('address') ||
        lowerKey === 'clientaddress' ||
        lowerKey === 'deliveryaddress'
      ) {
        sanitized[key] = typeof val === 'string' && val.length > 0 ? '[REDACTED_ADDRESS]' : val
      } else if (lowerKey.includes('email')) {
        sanitized[key] = typeof val === 'string' ? maskEmail(val) : val
      } else if (lowerKey.includes('phone')) {
        sanitized[key] = typeof val === 'string' ? maskPhone(val) : val
      } else {
        sanitized[key] = redactPII(val)
      }
    }
    return sanitized
  }

  return value
}

/**
 * Structured logger
 */
class Logger {
  constructor(options = {}) {
    this.env = options.env || process.env.NODE_ENV || 'development'
  }

  _format(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const sanitizedMeta = redactPII(meta)

    return {
      timestamp,
      level,
      message: redactPII(message),
      ...(Object.keys(sanitizedMeta).length ? { meta: sanitizedMeta } : {}),
    }
  }

  info(message, meta) {
    const entry = this._format('info', message, meta)
    if (this.env === 'test') return entry
    console.info(JSON.stringify(entry))
    return entry
  }

  warn(message, meta) {
    const entry = this._format('warn', message, meta)
    if (this.env === 'test') return entry
    console.warn(JSON.stringify(entry))
    return entry
  }

  error(message, error, meta = {}) {
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: this.env === 'production' ? undefined : error.stack,
            ...(error.code ? { code: error.code } : {}),
            ...(error.details ? { details: error.details } : {}),
          }
        : error

    const entry = this._format('error', message, {
      ...meta,
      error: errorDetails,
    })
    if (this.env === 'test') return entry
    console.error(JSON.stringify(entry))
    return entry
  }

  debug(message, meta) {
    if (this.env === 'production' || this.env === 'test') return null
    const entry = this._format('debug', message, meta)
    console.debug(JSON.stringify(entry))
    return entry
  }
}

export const logger = new Logger()
export default logger
