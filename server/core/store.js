/**
 * server/core/store.js
 * Abstract repository interface and in-memory test store.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

import { NotFoundError } from './errors.js'

/**
 * Base Store class (interface definition)
 */
export class Store {
  async getProduct(_id, _tx = null) {
    throw new Error('Not implemented: getProduct')
  }

  async getProducts(_ids, _tx = null) {
    throw new Error('Not implemented: getProducts')
  }

  async updateProductStock(_id, _newStock, _tx = null) {
    throw new Error('Not implemented: updateProductStock')
  }

  async createOrder(_orderData, _tx = null) {
    throw new Error('Not implemented: createOrder')
  }

  async createBooking(_bookingData, _tx = null) {
    throw new Error('Not implemented: createBooking')
  }

  async getSalonStyle(_id) {
    throw new Error('Not implemented: getSalonStyle')
  }

  async listSalonStyles() {
    throw new Error('Not implemented: listSalonStyles')
  }

  async listBeadProducts() {
    throw new Error('Not implemented: listBeadProducts')
  }

  now() {
    return new Date().toISOString()
  }

  async runTransaction(_callback) {
    throw new Error('Not implemented: runTransaction')
  }
}

/**
 * InMemoryStore for zero-dependency testing, simulations, and validation.
 */
export class InMemoryStore extends Store {
  constructor(seedData = {}) {
    super()
    this.beadProducts = new Map() // id -> product
    this.salonStyles = new Map() // id -> style
    this.orders = new Map() // id -> order
    this.bookings = new Map() // id -> booking
    this._idCounter = 1

    if (seedData.beadProducts) {
      for (const p of seedData.beadProducts) {
        this.beadProducts.set(p.id, { ...p })
      }
    }
    if (seedData.salonStyles) {
      for (const s of seedData.salonStyles) {
        this.salonStyles.set(s.id, { ...s })
      }
    }
  }

  _generateId(prefix = 'doc') {
    return `${prefix}_${Date.now()}_${this._idCounter++}`
  }

  now() {
    return new Date().toISOString()
  }

  async getProduct(id) {
    const product = this.beadProducts.get(id)
    if (!product) return null
    return { ...product }
  }

  async getProducts(ids) {
    const results = []
    for (const id of ids) {
      const p = this.beadProducts.get(id)
      if (p) results.push({ ...p })
    }
    return results
  }

  async updateProductStock(id, newStock) {
    const product = this.beadProducts.get(id)
    if (!product) throw new NotFoundError(`Product "${id}" not found`)
    product.stock = newStock
    this.beadProducts.set(id, product)
    return { ...product }
  }

  async createOrder(orderData) {
    const id = this._generateId('order')
    const saved = { id, ...orderData }
    this.orders.set(id, saved)
    return saved
  }

  async createBooking(bookingData) {
    const id = this._generateId('booking')
    const saved = { id, ...bookingData }
    this.bookings.set(id, saved)
    return saved
  }

  async getSalonStyle(id) {
    const style = this.salonStyles.get(id)
    if (!style) return null
    return { ...style }
  }

  async listSalonStyles() {
    return Array.from(this.salonStyles.values()).map((s) => ({ ...s }))
  }

  async listBeadProducts() {
    return Array.from(this.beadProducts.values()).map((p) => ({ ...p }))
  }

  async runTransaction(callback) {
    // Clone current state for rollback capability
    const beadSnapshot = new Map()
    for (const [k, v] of this.beadProducts.entries()) {
      beadSnapshot.set(k, { ...v })
    }
    const orderSnapshot = new Map()
    for (const [k, v] of this.orders.entries()) {
      orderSnapshot.set(k, { ...v })
    }

    try {
      // Execute within this context
      return await callback(this)
    } catch (err) {
      // Rollback on failure
      this.beadProducts = beadSnapshot
      this.orders = orderSnapshot
      throw err
    }
  }
}
