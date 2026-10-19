/**
 * src/utils/imageCompressor.js
 * Client-side image downscaling and compression using HTML5 Canvas.
 * Significantly saves upload bandwidth on Kenyan mobile networks (360px / 3G / 4G).
 */

/**
 * Calculate target dimensions maintaining aspect ratio.
 */
export function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight }
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  }
}

/**
 * Downscale and compress an image File/Blob on the client before network transmission.
 *
 * @param {File|Blob} file
 * @param {object} [options]
 * @param {number} [options.maxWidth=1280]
 * @param {number} [options.maxHeight=1280]
 * @param {number} [options.quality=0.82]
 * @param {string} [options.outputType='image/webp']
 * @returns {Promise<File|Blob>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.82,
    outputType = 'image/webp',
  } = options

  // Guard for non-browser or unsupported environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file
  }

  if (!file || !(file instanceof Blob) || !file.type.startsWith('image/')) {
    return file
  }

  // Skip SVG or animated GIFs which shouldn't be flattened to canvas
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  try {
    const objectUrl = URL.createObjectURL(file)

    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = (err) => reject(err)
      image.src = objectUrl
    })

    const { width, height } = calculateAspectRatioFit(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxWidth,
      maxHeight
    )

    // If image is already smaller than bounds and format is WebP, skip processing
    if (
      (img.naturalWidth || img.width) <= width &&
      (img.naturalHeight || img.height) <= height &&
      file.type === outputType
    ) {
      URL.revokeObjectURL(objectUrl)
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(objectUrl)
      return file
    }

    // High quality bicubic downscaling
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)

    URL.revokeObjectURL(objectUrl)

    const blob = await new Promise((resolve) => {
      canvas.toBlob(
        (result) => {
          if (!result && outputType === 'image/webp') {
            // WebP not supported on older browsers, fallback to JPEG
            canvas.toBlob(resolve, 'image/jpeg', quality)
          } else {
            resolve(result)
          }
        },
        outputType,
        quality
      )
    })

    if (!blob) return file

    // Never return a compressed file if it ended up larger than the original
    if (blob.size >= file.size) {
      return file
    }

    const newFileName = file.name
      ? file.name.replace(/\.[^/.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg')
      : 'upload.webp'

    return new File([blob], newFileName, {
      type: blob.type,
      lastModified: Date.now(),
    })
  } catch (err) {
    console.warn('[imageCompressor] Client downscaling failed; uploading original:', err)
    return file
  }
}
