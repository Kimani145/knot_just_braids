import formatCurrency from './formatCurrency.js'

/**
 * Default configurable pattern list for detecting placeholder / review content.
 */
export const DEFAULT_PLACEHOLDER_PATTERNS = [
  /needs review/i,
  /placeholder/i,
  /owner to confirm/i,
  /\bTBC\b/i,
  /\bN-R\b/i,
]

/**
 * Checks if a string contains any configured placeholder patterns.
 *
 * @param {string} text
 * @param {RegExp[]} [patterns=DEFAULT_PLACEHOLDER_PATTERNS]
 * @returns {string|null} The matched substring or null
 */
export function checkPlaceholderContent(text, patterns = DEFAULT_PLACEHOLDER_PATTERNS) {
  if (typeof text !== 'string' || !text.trim()) return null
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return null
}

/**
 * Normalizes an item or variant name for comparison.
 * Trims whitespace, lowercases, and collapses internal spaces.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeCatalogName(text) {
  if (typeof text !== 'string') return ''
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Lints a single collection of catalog items (e.g. salon styles or bead products).
 *
 * Checks:
 * 1. duplicate-name: Items that share the same normalized name AND variant (or both lack variant).
 * 2. shared-name-different-price: Items sharing normalized name but with differing prices and lacking variant.
 * 3. trivial-spread: Range items where priceMax - price <= 5.
 * 4. missing-cover: Items without a cover image (neither assetUrl nor images[0]).
 * 5. placeholder-content: Items with names or descriptions matching placeholder patterns.
 *
 * @param {Array<Object>} items
 * @param {'salon'|'beads'} [catalogType='beads']
 * @param {object} [options={}]
 * @param {RegExp[]} [options.placeholderPatterns=DEFAULT_PLACEHOLDER_PATTERNS]
 * @returns {Array<{ id: string, type: string, itemId: string, itemName: string, catalogType: string, message: string, severity: 'warning', status?: string, description?: string, matchedPattern?: string }>}
 */
export function lintCatalog(items = [], catalogType = 'beads', options = {}) {
  if (!Array.isArray(items)) return []

  const patterns = options.placeholderPatterns || DEFAULT_PLACEHOLDER_PATTERNS
  const warnings = []
  const catalogLabel = catalogType === 'salon' ? 'hair style' : 'bead product'
  const seenPairs = new Set()

  for (let i = 0; i < items.length; i++) {
    const itemA = items[i]
    if (!itemA) continue

    const nameA = typeof itemA.name === 'string' ? itemA.name.trim() : ''
    const normNameA = normalizeCatalogName(nameA)
    const variantA = typeof itemA.variant === 'string' ? itemA.variant.trim() : ''
    const normVariantA = normalizeCatalogName(variantA)
    const priceA = Number(itemA.price) || 0

    // Check individual item: 5. placeholder-content
    const descA =
      typeof itemA.description === 'string'
        ? itemA.description
        : typeof itemA.desc === 'string'
          ? itemA.desc
          : ''
    const placeholderMatch =
      checkPlaceholderContent(nameA, patterns) ||
      checkPlaceholderContent(descA, patterns)

    if (placeholderMatch) {
      warnings.push({
        id: `placeholder-content-${itemA.id || i}`,
        type: 'placeholder-content',
        itemId: itemA.id || String(i),
        itemName: nameA || 'Untitled item',
        catalogType,
        status: itemA.status || 'published',
        description: descA,
        matchedPattern: placeholderMatch,
        message: `"${nameA || 'Untitled item'}" contains placeholder text ("${placeholderMatch}"). Unpublish or move notes internally.`,
        severity: 'warning',
      })
    }

    // Check individual item: 3. trivial-spread (for range pricing)
    if (itemA.pricingType === 'range') {
      const priceMaxA = Number(itemA.priceMax) || 0
      if (priceMaxA > 0 && priceMaxA >= priceA && (priceMaxA - priceA) <= 5) {
        warnings.push({
          id: `trivial-spread-${itemA.id || i}`,
          type: 'trivial-spread',
          itemId: itemA.id || String(i),
          itemName: nameA || 'Untitled item',
          catalogType,
          message: `"${nameA || 'Untitled item'}" has a trivial price range spread (${formatCurrency(priceA)} – ${formatCurrency(priceMaxA)}). Consider using a fixed price instead.`,
          severity: 'warning',
        })
      }
    }

    // Check individual item: 4. missing-cover
    const hasImage = Boolean(
      itemA.assetUrl ||
      (Array.isArray(itemA.images) && itemA.images.length > 0 && itemA.images.some(Boolean))
    )
    if (!hasImage) {
      warnings.push({
        id: `missing-cover-${itemA.id || i}`,
        type: 'missing-cover',
        itemId: itemA.id || String(i),
        itemName: nameA || 'Untitled item',
        catalogType,
        message: `"${nameA || 'Untitled item'}" has no cover image. Add a photo to improve customer engagement.`,
        severity: 'warning',
      })
    }

    // Check individual item: 6. photo-post-without-images
    const isPublished = (itemA.status || 'published') === 'published'
    const videosA = Array.isArray(itemA.videos) ? itemA.videos : []
    const hasOnlyPhotoPosts =
      videosA.length > 0 &&
      videosA.every((v) => v?.kind === 'photo')

    if (isPublished && !hasImage && hasOnlyPhotoPosts) {
      warnings.push({
        id: `photo-post-without-images-${itemA.id || i}`,
        type: 'photo-post-without-images',
        itemId: itemA.id || String(i),
        itemName: nameA || 'Untitled item',
        catalogType,
        status: 'published',
        message: `"${nameA || 'Untitled item'}" only has TikTok photo posts and has no uploaded photos. Upload photos so customers can swipe through them.`,
        severity: 'warning',
      })
    }

    // Compare with subsequent items
    for (let j = i + 1; j < items.length; j++) {
      const itemB = items[j]
      if (!itemB) continue

      const nameB = typeof itemB.name === 'string' ? itemB.name.trim() : ''
      const normNameB = normalizeCatalogName(nameB)
      const variantB = typeof itemB.variant === 'string' ? itemB.variant.trim() : ''
      const normVariantB = normalizeCatalogName(variantB)
      const priceB = Number(itemB.price) || 0

      if (normNameA && normNameA === normNameB) {
        const pairKey = [itemA.id || i, itemB.id || j].sort().join(':')
        if (seenPairs.has(pairKey)) continue
        seenPairs.add(pairKey)

        // Rule 1: Duplicate name and variant
        if (normVariantA === normVariantB) {
          const variantSuffix = variantA ? ` (${variantA})` : ''
          warnings.push({
            id: `duplicate-name-${pairKey}`,
            type: 'duplicate-name',
            itemId: itemA.id || String(i),
            itemName: nameA,
            catalogType,
            message: `Duplicate ${catalogLabel} found: multiple items named "${nameA}"${variantSuffix}.`,
            severity: 'warning',
          })
        }
        // Rule 2: Shared name with different price without variant
        else if (priceA !== priceB && (!variantA || !variantB)) {
          warnings.push({
            id: `shared-name-diff-price-${pairKey}`,
            type: 'shared-name-different-price',
            itemId: itemA.id || String(i),
            itemName: nameA,
            catalogType,
            message: `Items named "${nameA}" have different prices (${formatCurrency(priceA)} vs ${formatCurrency(priceB)}) but lack distinguishing variants.`,
            severity: 'warning',
          })
        }
      }
    }
  }

  return warnings
}

/**
 * Lints both salon styles and bead products catalogs.
 *
 * @param {Array<Object>} salonStyles
 * @param {Array<Object>} beadProducts
 * @param {object} [options={}]
 * @returns {Array<Object>}
 */
export function lintAllCatalogs(salonStyles = [], beadProducts = [], options = {}) {
  return [
    ...lintCatalog(salonStyles, 'salon', options),
    ...lintCatalog(beadProducts, 'beads', options),
  ]
}
