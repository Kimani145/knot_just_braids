/**
 * src/utils/tiktokOembed.js
 * Client-side helper for proxying TikTok oEmbed requests via /api/tiktok-oembed,
 * mounting markup safely, and loading embed.js with re-initialization support.
 */

const oembedCache = new Map()
let embedScriptPromise = null

const isDev = Boolean(
  (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV === 'development') ||
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
)

/**
 * Diagnostic logger active only in development.
 * Never logs user PII or raw HTML.
 */
function logDiagnostic(event, details = {}) {
  if (isDev && typeof console !== 'undefined' && console.info) {
    console.info(`[TikTok oEmbed Diagnostic] ${event}`, details)
  }
}

/**
 * Idempotently injects or triggers https://www.tiktok.com/embed.js.
 * If embed.js is already loaded, triggers re-initialization for newly mounted blockquotes.
 *
 * @returns {Promise<boolean>}
 */
export function loadTikTokEmbedScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)

  // 1. Check if TikTok runtime exposed a global controller
  if (window.tiktokEmbed && typeof window.tiktokEmbed.load === 'function') {
    try {
      window.tiktokEmbed.load()
      logDiagnostic('re-initialized-via-global', { method: 'window.tiktokEmbed.load()' })
      return Promise.resolve(true)
    } catch {
      // Fall through to script execution
    }
  }

  // 2. If embed.js script tag already exists in DOM, re-injecting a controlled tag
  // allows TikTok's script loader to scan newly appended .tiktok-embed blockquotes
  const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]')
  if (existingScript) {
    const reinitScript = document.createElement('script')
    reinitScript.src = 'https://www.tiktok.com/embed.js'
    reinitScript.async = true
    reinitScript.onload = () => {
      logDiagnostic('re-initialized-via-script-reload')
    }
    document.body.appendChild(reinitScript)
    return Promise.resolve(true)
  }

  if (embedScriptPromise) return embedScriptPromise

  embedScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://www.tiktok.com/embed.js'
    script.async = true
    script.onload = () => {
      window.tiktokEmbedLoaded = true
      logDiagnostic('embed-script-loaded')
      resolve(true)
    }
    script.onerror = () => {
      logDiagnostic('embed-script-failed')
      resolve(false)
    }
    document.body.appendChild(script)
  })

  return embedScriptPromise
}

/**
 * Resolves TikTok oEmbed metadata via serverless proxy /api/tiktok-oembed.
 * Eliminates browser CORS failures and caches results in memory.
 *
 * @param {string} canonicalUrl
 * @returns {Promise<{ ok: boolean, html?: string, authorName?: string, title?: string, reason?: string }>}
 */
export async function fetchTikTokOEmbed(canonicalUrl) {
  if (!canonicalUrl || typeof canonicalUrl !== 'string') {
    logDiagnostic('failed', { reason: 'invalid-url' })
    return { ok: false, reason: 'invalid-url' }
  }

  const trimmed = canonicalUrl.trim()
  if (oembedCache.has(trimmed)) {
    logDiagnostic('cache-hit', { url: trimmed.slice(0, 45) })
    return oembedCache.get(trimmed)
  }

  const endpoint = `/api/tiktok-oembed?url=${encodeURIComponent(trimmed)}`

  logDiagnostic('request-sent', {
    target: 'server-proxy',
    endpoint,
    origin: typeof window !== 'undefined' ? window.location?.origin : 'ssr',
  })

  try {
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timerId)

    logDiagnostic('response-received', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const failure = { ok: false, reason: 'non-ok-status' }
      oembedCache.set(trimmed, failure)
      logDiagnostic('failed', { reason: 'non-ok-status', status: response.status })
      return failure
    }

    const data = await response.json()

    if (!data.ok || typeof data.html !== 'string' || !data.html.trim()) {
      const failureReason = data.reason || 'missing-html'
      const failure = { ok: false, reason: failureReason }
      oembedCache.set(trimmed, failure)
      logDiagnostic('failed', {
        reason: failureReason,
        htmlLength: typeof data?.html === 'string' ? data.html.length : 0,
      })
      return failure
    }

    const success = {
      ok: true,
      html: data.html,
      authorName: data.author_name || '',
      title: data.title || '',
      thumbnailUrl: data.thumbnail_url || null,
    }
    oembedCache.set(trimmed, success)

    logDiagnostic('success', {
      htmlLength: data.html.length,
      author: data.author_name || 'unknown',
    })

    return success
  } catch (err) {
    const isTimeout = err?.name === 'AbortError'
    const reason = isTimeout ? 'timeout' : 'network-error'
    const failure = { ok: false, reason }
    oembedCache.set(trimmed, failure)
    logDiagnostic('failed', { reason, errorName: err?.name })
    return failure
  }
}

/**
 * Safely mounts oEmbed HTML string into a DOM element using ContextualFragment.
 *
 * @param {HTMLElement} targetElement
 * @param {string} htmlContent
 */
export function mountOEmbedHtml(targetElement, htmlContent) {
  if (!targetElement || typeof htmlContent !== 'string') return
  try {
    const range = document.createRange()
    const fragment = range.createContextualFragment(htmlContent)
    targetElement.replaceChildren(fragment)
    logDiagnostic('mounted-fragment', { length: htmlContent.length })
  } catch (err) {
    logDiagnostic('mount-failed', { error: err?.message })
  }
}
