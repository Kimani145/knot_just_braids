/**
 * server/core/checkout.js
 * Authoritative checkout transaction processor.
 * Validates cart, verifies stock, re-prices line items against catalog,
 * atomically decrements stock, and creates pending order document.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

import { validateOrderPayload } from './validators.js'
import { calculateOrderPricing } from './pricing.js'
import { InsufficientStockError, NotFoundError } from './errors.js'
import { logger } from './log.js'

/**
 * Process a customer checkout request.
 * @param {import('./store.js').Store} store
 * @param {object} rawPayload
 * @returns {Promise<{ ok: boolean, orderId: string, order: object }>}
 */
export async function processCheckout(store, rawPayload) {
  // 1. Strict payload validation
  const validated = validateOrderPayload(rawPayload)

  // 2. Execute transaction to ensure atomic stock decrement and order creation
  const result = await store.runTransaction(async (txStore) => {
    const itemIds = validated.lineItems.map((item) => item.id)
    const catalogProducts = await txStore.getProducts(itemIds)

    const catalogMap = new Map()
    for (const p of catalogProducts) {
      catalogMap.set(p.id, p)
    }

    // Verify all requested products exist and have sufficient stock
    for (const item of validated.lineItems) {
      const product = catalogMap.get(item.id)
      if (!product) {
        throw new NotFoundError(`Product "${item.id}" was not found in catalog`)
      }

      const currentStock = typeof product.stock === 'number' ? product.stock : parseInt(product.stock, 10)
      const stock = isNaN(currentStock) ? 0 : currentStock

      if (stock < item.quantity) {
        throw new InsufficientStockError(product.name || item.id, stock, item.quantity)
      }
    }

    // Calculate authoritative line items, total, and item summary
    const pricing = calculateOrderPricing(catalogMap, validated.lineItems)

    // Atomically decrement stock
    for (const item of validated.lineItems) {
      const product = catalogMap.get(item.id)
      const currentStock = typeof product.stock === 'number' ? product.stock : parseInt(product.stock, 10)
      const updatedStock = currentStock - item.quantity
      await txStore.updateProductStock(item.id, updatedStock)
    }

    // Build order document strictly matching Firestore rules specification
    const orderDoc = {
      clientName: validated.clientName,
      ...(validated.clientEmail ? { clientEmail: validated.clientEmail } : {}),
      ...(validated.clientPhone ? { clientPhone: validated.clientPhone } : {}),
      address: validated.address,
      items: pricing.itemsSummary,
      lineItems: pricing.lineItems,
      total: pricing.total,
      status: 'pending',
      agreedToPolicy: true,
      createdAt: txStore.now(),
    }

    const createdOrder = await txStore.createOrder(orderDoc)

    logger.info('Order processed successfully via server core', {
      orderId: createdOrder.id,
      total: pricing.total,
      itemCount: pricing.lineItems.length,
      clientName: validated.clientName,
      clientEmail: validated.clientEmail,
    })

    return {
      ok: true,
      orderId: createdOrder.id,
      order: createdOrder,
    }
  })

  return result
}
