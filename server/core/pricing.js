/**
 * server/core/pricing.js
 * Authoritative server-side pricing and calculation logic.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

import { ValidationError } from './errors.js'

/**
 * Validate and calculate pricing for a single line item against authoritative catalog product data.
 * @param {object} catalogProduct - product document from database
 * @param {number} requestedQuantity - quantity requested by client
 */
export function calculateLineItemPricing(catalogProduct, requestedQuantity) {
  if (!catalogProduct || typeof catalogProduct !== 'object') {
    throw new ValidationError('Catalog product record is invalid or missing')
  }

  const name = catalogProduct.name || 'Custom Bead Item'
  const pricingType = catalogProduct.pricingType || 'fixed'

  if (pricingType === 'range') {
    throw new ValidationError(
      `"${name}" has variable/range pricing and cannot be purchased directly via standard checkout. Please contact us to inquire.`,
      { productId: catalogProduct.id }
    )
  }

  const rawPrice = catalogProduct.price
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice)

  if (isNaN(price) || price < 0) {
    throw new ValidationError(`Price for "${name}" is not configured correctly in the catalog`, {
      productId: catalogProduct.id,
    })
  }

  const quantity = Math.max(1, Math.floor(requestedQuantity))
  const lineTotal = Math.round(price * quantity * 100) / 100

  return {
    id: catalogProduct.id,
    name,
    variant: catalogProduct.variant || null,
    price,
    quantity,
    lineTotal,
  }
}

/**
 * Re-price a list of requested line items against authoritative catalog items.
 * @param {Map<string, object>|Record<string, object>} catalogMap - Map or object keyed by product ID
 * @param {Array<{id: string, quantity: number}>} requestedLineItems
 * @returns {{ lineItems: Array<object>, total: number, itemsSummary: string }}
 */
export function calculateOrderPricing(catalogMap, requestedLineItems) {
  const getProduct = (id) =>
    catalogMap instanceof Map ? catalogMap.get(id) : catalogMap[id]

  const calculatedItems = []
  let total = 0

  for (const requested of requestedLineItems) {
    const product = getProduct(requested.id)
    if (!product) {
      throw new ValidationError(`Product with ID "${requested.id}" does not exist in catalog`, {
        productId: requested.id,
      })
    }

    const calculated = calculateLineItemPricing(product, requested.quantity)
    calculatedItems.push(calculated)
    total += calculated.lineTotal
  }

  total = Math.round(total * 100) / 100

  if (total <= 0) {
    throw new ValidationError('Order total must be greater than zero')
  }
  if (total > 1000000) {
    throw new ValidationError('Order total exceeds maximum allowable limit of 1,000,000 KES')
  }

  // Format concise string summary for notifications/admin lists: "Bead Bracelet (x2), Waist Bead (x1)"
  const itemsSummary = calculatedItems
    .map((item) => {
      const variantStr = item.variant ? ` [${item.variant}]` : ''
      return `${item.name}${variantStr} (x${item.quantity})`
    })
    .join(', ')

  return {
    lineItems: calculatedItems,
    total,
    itemsSummary,
  }
}
