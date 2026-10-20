/**
 * src/utils/tiktokOembed.js
 * In-memory cached oEmbed resolver and idempotent script loader for TikTok posts.
 */

const oembedCache = new Map()
let embedScriptPromise = null

/**
 * Idempotently injects https://www.tiktok.com/embed.js once per document.
 *
 * @returns {Promise<boolean>}
 */
export function loadTikTokEmbedScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)

  if (
    window.tiktokEmbedLoaded ||
    document.querySelector('script[src="https://www.tiktok.com/embed.js"]')
  ) {
    return Promise.resolve(true)
  }

  if (embedScriptPromise) return embedScriptPromise

  embedScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://www.tiktok.com/embed.js'
    script.async = true
    script.onload = () => {
      window.tiktokEmbedLoaded = true
      resolve(true)
    }
    script.onerror = () => {
      resolve(false)
    }
    document.body.appendChild(script)
  })

  return embedScriptPromise
}

/**
 * Resolves TikTok oEmbed metadata with in-memory caching and 8-second timeout.
 *
 * @param {string} canonicalUrl
 * @returns {Promise<{ ok: boolean, html?: string, authorName?: string, title?: string }>}
 */
export async function fetchTikTokOEmbed(canonicalUrl) {
  if (!canonicalUrl || typeof canonicalUrl !== 'string') {
    return { ok: false }
  }

  const trimmed = canonicalUrl.trim()
  if (oembedCache.has(trimmed)) {
    return oembedCache.get(trimmed)
  }

  const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(trimmed)}`

  try {
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 7500)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timerId)

    if (!response.ok) {
      const failure = { ok: false }
      oembedCache.set(trimmed, failure)
      return failure
    }

    const data = await response.json()
    if (!data || typeof data.html !== 'string' || !data.html.trim()) {
      const failure = { ok: false }
      oembedCache.set(trimmed, failure)
      return failure
    }

    const success = {
      ok: true,
      html: data.html,
      authorName: data.author_name || '',
      title: data.title || '',
    }
    oembedCache.set(trimmed, success)
    return success
  } catch {
    const failure = { ok: false }
    oembedCache.set(trimmed, failure)
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
  } catch {
    // If range context fails, fallback safely
  }
}
