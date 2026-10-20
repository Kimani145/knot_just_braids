/**
 * api/tiktok-oembed.js
 * Vercel Serverless Function: GET /api/tiktok-oembed?url=<encoded-tiktok-url>
 *
 * Validates TikTok URLs, proxies official TikTok oEmbed requests server-side
 * to eliminate browser CORS limitations, and caches results in memory.
 */

import { createApiHandler } from '../server/adapters/httpUtils.js'

// In-memory cache for serverless instance lifetime
const oembedCache = new Map()
const MAX_CACHE_SIZE = 200

/**
 * Validates and normalizes an input URL into an official canonical TikTok URL.
 * Restricts to known patterns to prevent open-proxy abuse.
 *
 * @param {string} inputUrl
 * @returns {string|null} Canonical TikTok URL or null if invalid
 */
export function validateAndNormalizeTikTokUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null

  const trimmed = inputUrl.trim()
  if (trimmed.length > 2048) return null

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null

  const host = parsed.hostname.toLowerCase()
  if (host !== 'tiktok.com' && !host.endsWith('.tiktok.com')) return null

  // Ensure path matches standard pattern /@handle/(video|photo)/<id>
  const pathMatch = parsed.pathname.match(/^\/@([A-Za-z0-9._]{2,32})\/(video|photo)\/(\d{10,25})/i)
  if (!pathMatch) return null

  const handle = pathMatch[1]
  const kind = pathMatch[2].toLowerCase()
  const id = pathMatch[3]

  return `https://www.tiktok.com/@${handle}/${kind}/${id}`
}

export default createApiHandler(
  async (req, res) => {
    const rawUrl = req.query?.url || new URL(req.url, 'http://localhost').searchParams.get('url')

    const canonicalUrl = validateAndNormalizeTikTokUrl(rawUrl)
    if (!canonicalUrl) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: false,
          reason: 'invalid-url',
          message: 'Invalid or unsupported TikTok URL.',
        })
      )
      return
    }

    // Check memory cache
    if (oembedCache.has(canonicalUrl)) {
      const cached = oembedCache.get(canonicalUrl)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      res.end(JSON.stringify(cached))
      return
    }

    const upstreamUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)

      const upstreamRes = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KnotJustBraids-Storefront/1.0',
        },
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!upstreamRes.ok) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            ok: false,
            reason: 'non-ok-status',
            status: upstreamRes.status,
            message: 'Upstream TikTok oEmbed service returned an error.',
          })
        )
        return
      }

      const data = await upstreamRes.json()

      if (!data || typeof data.html !== 'string' || !data.html.trim()) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            ok: false,
            reason: 'missing-html',
            message: 'TikTok oEmbed payload contained no embed HTML.',
          })
        )
        return
      }

      const responsePayload = {
        ok: true,
        html: data.html,
        title: typeof data.title === 'string' ? data.title : '',
        author_name: typeof data.author_name === 'string' ? data.author_name : '',
        thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      }

      if (oembedCache.size >= MAX_CACHE_SIZE) {
        const firstKey = oembedCache.keys().next().value
        oembedCache.delete(firstKey)
      }
      oembedCache.set(canonicalUrl, responsePayload)

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      res.end(JSON.stringify(responsePayload))
    } catch (err) {
      const isTimeout = err?.name === 'AbortError'
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: false,
          reason: isTimeout ? 'timeout' : 'network-error',
          message: isTimeout
            ? 'Upstream TikTok oEmbed timed out.'
            : 'Could not connect to TikTok oEmbed service.',
        })
      )
    }
  },
  {
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60 * 1000 },
  }
)
