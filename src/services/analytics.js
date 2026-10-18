/**
 * Privacy-first Analytics Provider Interface.
 * Implements Decision Gate D2:
 * - Default provider is 'none'.
 * - Strict consent gating (requires explicit customer consent under Kenya Data Protection Act 2019).
 * - Automatic PII sanitization (drops customer names, emails, phones, addresses).
 */

export const CONSENT_STORAGE_KEY = 'knot_just_cookie_consent'

const SENSITIVE_PARAM_KEYS = [
  'name',
  'clientname',
  'firstname',
  'lastname',
  'email',
  'clientemail',
  'phone',
  'clientphone',
  'address',
  'notes',
  'referencephotourls',
  'referencephotos',
  'password',
  'token',
]

/**
 * Strips PII and unsupported types from analytics parameters.
 * @param {Record<string, any>} [params]
 * @returns {Record<string, string | number | boolean>}
 */
export function sanitizeAnalyticsParams(params = {}) {
  if (!params || typeof params !== 'object') return {}

  const sanitized = {}
  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '')
    const isSensitive = SENSITIVE_PARAM_KEYS.some((pattern) => lowerKey.includes(pattern))

    if (isSensitive) {
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (typeof value === 'string') {
      sanitized[key] = value.slice(0, 100)
    }
  }
  return sanitized
}

/**
 * Returns the current consent status: 'granted' | 'denied' | 'pending'
 * @returns {'granted' | 'denied' | 'pending'}
 */
export function getConsentStatus() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'denied'
  }
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored === 'granted' || stored === 'denied') {
      return stored
    }
  } catch {
    return 'denied'
  }
  return 'pending'
}

/**
 * Persists the user's consent choice.
 * @param {'granted' | 'denied'} status
 */
export function setConsentStatus(status) {
  if (status !== 'granted' && status !== 'denied') return

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, status)
    } catch {
      // Ignore storage write errors (e.g. private browsing quota)
    }
  }

  const measurementId = getEnvVar('VITE_GA4_MEASUREMENT_ID')
  if (measurementId && typeof window !== 'undefined') {
    if (status === 'denied') {
      window[`ga-disable-${measurementId}`] = true
    } else {
      window[`ga-disable-${measurementId}`] = false
      initAnalytics()
    }
  }

  // Dispatch custom event for reactive UI updates
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('consentChange', { detail: { status } }))
    } catch {
      // Ignore event dispatch failure in non-standard runtimes
    }
  }
}

function getEnvVar(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[name] !== undefined) {
    return import.meta.env[name]
  }
  if (typeof globalThis !== 'undefined' && globalThis.process?.env?.[name] !== undefined) {
    return globalThis.process.env[name]
  }
  return undefined
}

/**
 * Resolves the configured analytics provider ('none' | 'ga4').
 * Defaults to 'none'.
 */
export function getAnalyticsProvider() {
  const provider = (getEnvVar('VITE_ANALYTICS_PROVIDER') || 'none').toLowerCase()
  if (provider === 'ga4') return 'ga4'
  return 'none'
}

let isGtagLoaded = false

/**
 * Initializes the analytics provider if consent is granted.
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return false

  const consent = getConsentStatus()
  if (consent !== 'granted') return false

  const provider = getAnalyticsProvider()
  if (provider === 'none') return false

  if (provider === 'ga4') {
    const measurementId = getEnvVar('VITE_GA4_MEASUREMENT_ID')
    if (!measurementId) return false

    if (!isGtagLoaded && typeof document !== 'undefined') {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
      document.head.appendChild(script)

      window.dataLayer = window.dataLayer || []
      window.gtag = function () {
        window.dataLayer.push(arguments)
      }
      window.gtag('js', new Date())
      window.gtag('config', measurementId, {
        anonymize_ip: true,
        send_page_view: false,
      })

      isGtagLoaded = true
    }
    return true
  }

  return false
}

/**
 * Tracks a page view if consent is granted.
 * @param {string} path
 * @param {string} [title]
 * @returns {boolean}
 */
export function trackPageView(path, title = '') {
  if (getConsentStatus() !== 'granted') return false

  const provider = getAnalyticsProvider()
  if (provider === 'none') return false

  // Strip query strings to ensure no PII is accidentally sent in URLs
  const cleanPath = path.split('?')[0]

  if (provider === 'ga4' && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: cleanPath,
      page_title: title,
    })
    return true
  }

  return false
}

/**
 * Tracks a custom event if consent is granted.
 * @param {string} eventName
 * @param {Record<string, any>} [params]
 * @returns {boolean}
 */
export function trackEvent(eventName, params = {}) {
  if (getConsentStatus() !== 'granted') return false

  const provider = getAnalyticsProvider()
  if (provider === 'none') return false

  const safeParams = sanitizeAnalyticsParams(params)

  if (provider === 'ga4' && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, safeParams)
    return true
  }

  return false
}
