import formatCurrency from './formatCurrency.js'

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
 *
 * @param {Array<Object>} items
 * @param {'salon'|'beads'} catalogType
 * @returns {Array<{ id: string, type: string, itemId: string, itemName: string, catalogType: string, message: string, severity: 'warning' }>}
 */
export function lintCatalog(items = [], catalogType = 'beads') {
  if (!Array.isArray(items)) return []

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
      (Array.isArray(itemA.images) && itemA.images.length > 0 && itemA.images[0])
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
 * @returns {Array<Object>}
 */
export function lintAllCatalogs(salonStyles = [], beadProducts = []) {
  return [
    ...lintCatalog(salonStyles, 'salon'),
    ...lintCatalog(beadProducts, 'beads'),
  ]
}
