import formatCurrency from './formatCurrency.js'

/**
 * Normalizes user price inputs in admin forms.
 * Strips non-numeric characters and formats display string.
 *
 * @param {string|number} value
 * @returns {{ raw: number|'', display: string }}
 */
export function normalizePriceInput(value) {
  if (value === null || value === undefined || value === '') {
    return { raw: '', display: '' }
  }

  if (typeof value === 'number' && value < 0) {
    return { raw: '', display: '' }
  }

  const str = String(value).trim()
  if (str.startsWith('-')) {
    return { raw: '', display: '' }
  }

  const normalized = str.replace(/[^0-9.]/g, '')
  if (!normalized) {
    return { raw: '', display: '' }
  }

  const parsed = Number.parseFloat(normalized)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return { raw: '', display: '' }
  }

  return { raw: parsed, display: formatCurrency(parsed) }
}

/**
 * Formats a price or price range with an accessible en-dash.
 *
 * @param {number|string} minPrice
 * @param {number|string|null} maxPrice
 * @param {'fixed'|'range'} pricingType
 * @returns {string}
 */
export function formatPriceRange(minPrice, maxPrice, pricingType = 'fixed') {
  const min = Math.max(0, Number(minPrice) || 0)

  if (pricingType !== 'range' || maxPrice === null || maxPrice === undefined) {
    return formatCurrency(min)
  }

  const max = Math.max(0, Number(maxPrice) || 0)
  if (max <= min) {
    return formatCurrency(min)
  }

  return `${formatCurrency(min)} – ${formatCurrency(max)}`
}
