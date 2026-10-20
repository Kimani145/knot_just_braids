/**
 * src/utils/catalogValidation.js
 * Pure validation logic for catalog creation and editing.
 * Required fields (price, description, stock) are enforced at PUBLISH time.
 * Drafts require only a name and may have an empty description.
 */

/**
 * Validates a catalog item payload.
 *
 * @param {object} form - Form data to validate
 * @param {object} options
 * @param {'salon'|'beads'} [options.type='salon']
 * @param {boolean} [options.isPublishing=true]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateCatalogItem(form = {}, { type = 'salon', isPublishing = true } = {}) {
  const errors = {}

  // Name is always mandatory
  const name = typeof form.name === 'string' ? form.name.trim() : ''
  if (!name) {
    errors.name = `${type === 'salon' ? 'Style' : 'Product'} name is required`
  }

  // Drafts need only a valid name; price, description, and stock may be omitted/empty
  if (!isPublishing) {
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }

  // Description is required when publishing
  const desc =
    typeof form.desc === 'string'
      ? form.desc.trim()
      : typeof form.description === 'string'
        ? form.description.trim()
        : ''
  if (!desc) {
    errors.desc = 'Description is required when publishing'
  }

  // Price validation
  const pricingType = form.pricingType === 'range' ? 'range' : 'fixed'
  const rawPrice = form.price
  const price =
    typeof rawPrice === 'number'
      ? rawPrice
      : parseFloat(String(rawPrice || '').replace(/[^0-9.]/g, ''))

  if (isNaN(price) || price <= 0) {
    errors.price = 'Please enter a valid price greater than zero'
  }

  if (pricingType === 'range') {
    const rawPriceMax = form.priceMax
    const priceMax =
      typeof rawPriceMax === 'number'
        ? rawPriceMax
        : parseFloat(String(rawPriceMax || '').replace(/[^0-9.]/g, ''))

    if (isNaN(priceMax) || priceMax <= 0) {
      errors.priceMax = 'Please enter a valid maximum price'
    } else if (!isNaN(price) && priceMax < price) {
      errors.priceMax = 'Maximum price cannot be less than minimum price'
    }
  }

  // Bead specific: integer stock >= 0
  if (type === 'beads') {
    const rawStock = form.stock
    const stock =
      typeof rawStock === 'number'
        ? rawStock
        : parseInt(String(rawStock ?? '').trim(), 10)

    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      errors.stock = 'Stock must be an integer of 0 or greater'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
