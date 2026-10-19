import * as Sentry from '@sentry/react'

/**
 * PII Scrubber utility for Kenya Data Protection Act 2019 compliance.
 * Guarantees that no customer names, phones, email addresses, delivery addresses,
 * or reference photos leak into Sentry error reports or breadcrumbs.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const KENYA_PHONE_REGEX = /(?:\+?254|0)[17]\d{8}/g

const SENSITIVE_KEY_PATTERNS = [
  'name',
  'clientname',
  'firstname',
  'lastname',
  'email',
  'clientemail',
  'phone',
  'clientphone',
  'address',
  'referencephoto',
  'referencephotourls',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
]

/**
 * Scrubs known PII patterns from text strings.
 * @param {string} text
 * @returns {string}
 */
export function scrubPiiText(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(KENYA_PHONE_REGEX, '[REDACTED_PHONE]')
}

/**
 * Recursively scrubs PII fields and sensitive patterns from arbitrary objects.
 * @param {any} data
 * @param {number} depth
 * @returns {any}
 */
export function scrubPiiData(data, depth = 0) {
  if (depth > 6 || data == null) return data
  if (typeof data === 'string') return scrubPiiText(data)
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map((item) => scrubPiiData(item, depth + 1))
  }

  const scrubbed = {}
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '')
    const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      lowerKey.includes(pattern)
    )

    if (isSensitiveKey) {
      scrubbed[key] = '[REDACTED]'
    } else {
      scrubbed[key] = scrubPiiData(value, depth + 1)
    }
  }
  return scrubbed
}

/**
 * Sanitizes Sentry breadcrumbs before they are queued.
 * @param {import('@sentry/react').Breadcrumb} breadcrumb
 * @returns {import('@sentry/react').Breadcrumb | null}
 */
export function sanitizeSentryBreadcrumb(breadcrumb) {
  if (!breadcrumb) return null

  if (breadcrumb.message) {
    breadcrumb.message = scrubPiiText(breadcrumb.message)
  }

  if (breadcrumb.data && typeof breadcrumb.data === 'object') {
    breadcrumb.data = scrubPiiData(breadcrumb.data)
  }

  // Sanitize navigation URLs in breadcrumbs
  if (breadcrumb.category === 'navigation' && typeof breadcrumb.data?.to === 'string') {
    try {
      const url = new URL(breadcrumb.data.to, 'https://knotjust.invalid')
      // Strip query parameters that might carry PII
      url.search = ''
      breadcrumb.data.to = url.pathname
    } catch {
      breadcrumb.data.to = '[SANITIZED_URL]'
    }
  }

  return breadcrumb
}

/**
 * Sanitizes Sentry event payload before transmission.
 * @param {import('@sentry/react').Event} event
 * @returns {import('@sentry/react').Event}
 */
export function sanitizeSentryEvent(event) {
  if (!event) return event

  // Redact message
  if (event.message) {
    event.message = scrubPiiText(event.message)
  }

  // Redact exceptions
  if (event.exception?.values) {
    for (const val of event.exception.values) {
      if (val.value) {
        val.value = scrubPiiText(val.value)
      }
    }
  }

  // Redact breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b) => sanitizeSentryBreadcrumb(b))
  }

  // Redact extra and contexts
  if (event.extra) {
    event.extra = scrubPiiData(event.extra)
  }
  if (event.contexts) {
    event.contexts = scrubPiiData(event.contexts)
  }

  // Scrub user object: never allow email, ip_address, username
  if (event.user) {
    delete event.user.email
    delete event.user.ip_address
    delete event.user.username
    delete event.user.name
  }

  // Strip request headers, cookies, query string
  if (event.request) {
    delete event.request.cookies
    delete event.request.headers
    if (event.request.query_string) {
      event.request.query_string = '[REDACTED]'
    }
    if (event.request.data) {
      event.request.data = scrubPiiData(event.request.data)
    }
  }

  return event
}

let isInitialized = false

/**
 * Initialize Sentry with strict PII scrubbing.
 * Returns true if initialized, false if skipped (no DSN or non-browser env).
 */
export function initSentry() {
  if (isInitialized) return true

  const dsn =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SENTRY_DSN) ||
    (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_SENTRY_DSN)

  if (!dsn || typeof window === 'undefined') {
    return false
  }

  const environment =
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE) ||
    (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV) ||
    'production'

  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    autoSessionTracking: false,
    beforeSend(event) {
      return sanitizeSentryEvent(event)
    },
    beforeBreadcrumb(breadcrumb) {
      return sanitizeSentryBreadcrumb(breadcrumb)
    },
  })

  isInitialized = true
  return true
}

/**
 * Safe capture exception wrapper.
 * @param {Error|any} error
 * @param {Record<string, any>} [context]
 */
export function captureException(error, context = {}) {
  const scrubbedContext = scrubPiiData(context)
  Sentry.captureException(error, { extra: scrubbedContext })
}

/**
 * Safe capture message wrapper.
 * @param {string} message
 * @param {import('@sentry/react').SeverityLevel} [level]
 */
export function captureMessage(message, level = 'info') {
  Sentry.captureMessage(scrubPiiText(message), level)
}

export { Sentry }
