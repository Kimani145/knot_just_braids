/**
 * Pure cart calculation utilities for Knot Just storefront
 */

/**
 * Calculates authoritative client totals from cart items.
 * Clamps quantity to positive integers and ignores NaN/negative prices.
 *
 * @param {Array<{ price?: number|string, qty?: number|string }>} cart
 * @returns {{ total: number, count: number }}
 */
export function calculateCartTotals(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { total: 0, count: 0 }
  }

  return cart.reduce(
    (acc, item) => {
      if (!item || typeof item !== 'object') {
        return acc
      }

      const unitPrice = Math.max(0, Number(item.price) || 0)
      const quantity = Math.max(0, Math.floor(Number(item.qty) || 0))

      return {
        total: acc.total + unitPrice * quantity,
        count: acc.count + (unitPrice > 0 && quantity > 0 ? 1 : 0),
      }
    },
    { total: 0, count: 0 },
  )
}

export default calculateCartTotals
