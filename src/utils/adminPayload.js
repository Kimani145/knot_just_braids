/**
 * src/utils/adminPayload.js
 * Pure, diff-based Firestore update payload builder for catalog items.
 *
 * Rules:
 * - Returns ONLY changed fields.
 * - NEVER contains undefined.
 * - NEVER overwrites media with '' unless the admin actually removed media.
 * - NEVER invents 'Updated style/product'.
 * - If description is emptied for a published/publishing item, blocks with an inline error.
 *   (Drafts may have empty descriptions).
 * - If no fields changed, returns hasChanges: false and empty payload.
 * - Videos use the same diff rule: only included if changed.
 */

import { sanitizeVideos } from './tiktok.js'

/**
 * Builds a strict diff payload for inventory updates.
 *
 * @param {object} editForm - Current form values
 * @param {object} original - Original item values
 * @returns {{ hasChanges: boolean, payload: Record<string, any>, error: string|null }}
 */
export function buildInventoryPayload(editForm = {}, original = {}) {
  const payload = {}
  const type = editForm.type || original.type || 'salon'
  const isPublishing = editForm.status === 'published'

  // Description validation:
  const newDesc = typeof editForm.desc === 'string' ? editForm.desc.trim() : ''
  const origDesc = typeof (original.desc ?? original.description) === 'string'
    ? (original.desc ?? original.description).trim()
    : ''

  if (isPublishing && !newDesc) {
    return {
      hasChanges: false,
      payload: {},
      error: 'Description is required when publishing.',
    }
  }

  if (newDesc !== origDesc) {
    payload.description = newDesc
  }

  // Status
  const newStatus = editForm.status === 'draft' ? 'draft' : 'published'
  const origStatus = original.status === 'draft' ? 'draft' : 'published'
  if (newStatus !== origStatus) {
    payload.status = newStatus
  }

  // Internal Note
  const newInternalNote = typeof editForm.internalNote === 'string' ? editForm.internalNote.trim() : ''
  const origInternalNote = typeof original.internalNote === 'string' ? original.internalNote.trim() : ''
  if (newInternalNote !== origInternalNote) {
    payload.internalNote = newInternalNote
  }

  // Pricing Type
  const newPricingType = editForm.pricingType === 'range' ? 'range' : 'fixed'
  const origPricingType = original.pricingType === 'range' ? 'range' : 'fixed'
  if (newPricingType !== origPricingType) {
    payload.pricingType = newPricingType
  }

  // Price
  const rawPrice = editForm.price
  const newPrice = typeof rawPrice === 'number'
    ? rawPrice
    : parseFloat(String(rawPrice || '').replace(/[^0-9.]/g, ''))
  const origPrice = Number(original.price) || 0

  if (!isNaN(newPrice) && newPrice !== origPrice) {
    payload.price = newPrice
  }

  // PriceMax (for range)
  if (newPricingType === 'range') {
    const rawPriceMax = editForm.priceMax
    const newPriceMax = typeof rawPriceMax === 'number'
      ? rawPriceMax
      : parseFloat(String(rawPriceMax || '').replace(/[^0-9.]/g, ''))
    const origPriceMax = Number(original.priceMax) || 0

    if (!isNaN(newPriceMax) && newPriceMax !== origPriceMax) {
      payload.priceMax = newPriceMax
    }
  } else if (origPricingType === 'range' && newPricingType === 'fixed') {
    // If switched from range to fixed, explicitly clear priceMax with null
    payload.priceMax = null
  }

  // Variant
  const newVariant = typeof editForm.variant === 'string' ? editForm.variant.trim() : ''
  const origVariant = typeof original.variant === 'string' ? original.variant.trim() : ''
  if (newVariant !== origVariant) {
    payload.variant = newVariant
  }

  // Type-specific fields
  if (type === 'salon') {
    const newDuration = typeof editForm.duration === 'string' ? editForm.duration.trim() : ''
    const origDuration = typeof original.duration === 'string' ? original.duration.trim() : ''
    if (newDuration !== origDuration) {
      payload.duration = newDuration || '—'
    }

    // Media (assetUrl)
    // Only update if editForm.image was touched
    const origAssetUrl = original.assetUrl || ''
    const newAssetUrl = editForm.image?.assetUrl || ''
    const imageExplicitlyRemoved = editForm.image === null && Boolean(origAssetUrl)

    if (newAssetUrl && newAssetUrl !== origAssetUrl) {
      payload.assetUrl = newAssetUrl
    } else if (imageExplicitlyRemoved) {
      payload.assetUrl = ''
    }
  } else {
    // Beads
    const rawStock = editForm.stock
    const newStock = typeof rawStock === 'number'
      ? rawStock
      : parseInt(String(rawStock ?? '').trim(), 10)
    const origStock = Number(original.stock) || 0
    if (!isNaN(newStock) && newStock !== origStock) {
      payload.stock = Math.max(0, newStock)
    }

    // Media (images & assetUrl)
    const newImages = Array.isArray(editForm.images)
      ? editForm.images
          .map((img) => img?.assetUrl || img?.previewUrl || (typeof img === 'string' ? img : ''))
          .filter(Boolean)
      : []
    const origImages = Array.isArray(original.images)
      ? original.images.filter(Boolean)
      : (original.assetUrl ? [original.assetUrl] : [])

    const imagesChanged = JSON.stringify(newImages) !== JSON.stringify(origImages)
    if (imagesChanged) {
      payload.images = newImages
      payload.assetUrl = newImages[0] || ''
    }
  }

  // Videos diff rule
  const currentVideos = sanitizeVideos(editForm.videos)
  const origVideos = sanitizeVideos(original.videos)
  if (JSON.stringify(currentVideos) !== JSON.stringify(origVideos)) {
    payload.videos = currentVideos
  }

  // Ensure no undefined values anywhere
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  }

  const hasChanges = Object.keys(payload).length > 0

  return {
    hasChanges,
    payload,
    error: null,
  }
}
