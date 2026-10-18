/**
 * src/utils/cloudinaryUrl.js
 * Responsive Cloudinary image URL transformation utility.
 * Injects automatic format negotiation (f_auto), quality optimization (q_auto),
 * and width constraints to optimize bandwidth on Kenyan mobile networks.
 */

/**
 * Generate an optimized Cloudinary delivery URL with responsive width, auto format, and quality.
 *
 * @param {string|null|undefined} url - Original image URL
 * @param {object} [options]
 * @param {number} [options.width] - Maximum image width in pixels
 * @param {string} [options.quality='auto'] - Compression quality ('auto', 'auto:eco', 'auto:good')
 * @param {string} [options.format='auto'] - Target format ('auto' for WebP/AVIF content negotiation)
 * @param {string} [options.crop='limit'] - Resize mode ('limit', 'fill', 'scale')
 * @param {number} [options.dpr] - Device pixel ratio multiplier (optional)
 * @returns {string} Optimized URL or original URL if not Cloudinary
 */
export function getOptimizedCloudinaryUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return ''

  // Only apply to Cloudinary delivery URLs
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url
  }

  const {
    width,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    dpr,
  } = options

  const parts = []

  if (format) parts.push(`f_${format}`)
  if (quality) parts.push(`q_${quality}`)
  if (width && width > 0) parts.push(`w_${Math.round(width)}`)
  if (crop && width) parts.push(`c_${crop}`)
  if (dpr && dpr > 1) parts.push(`dpr_${dpr}`)

  if (parts.length === 0) return url

  const transformation = parts.join(',')

  // Check if URL already has transformation segment directly after /image/upload/
  const uploadMarker = '/image/upload/'
  const uploadIndex = url.indexOf(uploadMarker)
  if (uploadIndex === -1) return url

  const prefix = url.slice(0, uploadIndex + uploadMarker.length)
  const remainder = url.slice(uploadIndex + uploadMarker.length)

  // Avoid duplicate injection if already optimized with f_auto/q_auto
  if (remainder.startsWith('f_auto') || remainder.startsWith('q_auto')) {
    return url
  }

  return `${prefix}${transformation}/${remainder}`
}
