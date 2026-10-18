/**
 * server/adapters/firestoreStore.js
 * Concrete Store implementation backed by Cloud Firestore via Firebase Admin SDK.
 */

import admin from 'firebase-admin'
import { Store } from '../core/store.js'
import { NotFoundError } from '../core/errors.js'
import { logger } from '../core/log.js'

let initializedApp = null

/**
 * Initialize or retrieve the Firebase Admin app instance.
 */
export function getFirebaseAdminApp() {
  if (initializedApp) return initializedApp
  if (admin.apps.length > 0) {
    initializedApp = admin.apps[0]
    return initializedApp
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID

  let credential = null

  if (rawKey) {
    try {
      let parsed
      if (rawKey.trim().startsWith('{')) {
        parsed = JSON.parse(rawKey)
      } else {
        const decoded = Buffer.from(rawKey, 'base64').toString('utf8')
        parsed = JSON.parse(decoded)
      }
      credential = admin.credential.cert(parsed)
    } catch (err) {
      logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY', err)
    }
  }

  if (!credential) {
    // Fall back to application default credentials or project ID
    credential = admin.credential.applicationDefault()
  }

  initializedApp = admin.initializeApp({
    credential,
    ...(projectId ? { projectId } : {}),
  })

  return initializedApp
}

/**
 * Get Firestore database instance.
 */
export function getFirestoreDb() {
  const app = getFirebaseAdminApp()
  return admin.firestore(app)
}

/**
 * Firestore-backed Store implementation of Store interface.
 */
export class FirestoreStore extends Store {
  constructor(db = null) {
    super()
    this._db = db
  }

  get db() {
    if (!this._db) {
      this._db = getFirestoreDb()
    }
    return this._db
  }

  now() {
    return admin.firestore.FieldValue.serverTimestamp()
  }

  async getProduct(id, tx = null) {
    const docRef = this.db.collection('bead_products').doc(id)
    const snapshot = tx ? await tx.get(docRef) : await docRef.get()
    if (!snapshot.exists) return null
    return { id: snapshot.id, ...snapshot.data() }
  }

  async getProducts(ids, tx = null) {
    if (!ids || ids.length === 0) return []
    const results = []
    for (const id of ids) {
      const p = await this.getProduct(id, tx)
      if (p) results.push(p)
    }
    return results
  }

  async updateProductStock(id, newStock, tx = null) {
    const docRef = this.db.collection('bead_products').doc(id)
    if (tx) {
      tx.update(docRef, { stock: newStock })
    } else {
      await docRef.update({ stock: newStock })
    }
    return { id, stock: newStock }
  }

  async createOrder(orderData, tx = null) {
    const colRef = this.db.collection('orders')
    const docRef = colRef.doc()
    const payload = {
      ...orderData,
      createdAt: orderData.createdAt || this.now(),
    }

    if (tx) {
      tx.set(docRef, payload)
    } else {
      await docRef.set(payload)
    }

    return { id: docRef.id, ...payload }
  }

  async createBooking(bookingData, tx = null) {
    const colRef = this.db.collection('bookings')
    const docRef = colRef.doc()
    const payload = {
      ...bookingData,
      createdAt: bookingData.createdAt || this.now(),
    }

    if (tx) {
      tx.set(docRef, payload)
    } else {
      await docRef.set(payload)
    }

    return { id: docRef.id, ...payload }
  }

  async getSalonStyle(id) {
    const docRef = this.db.collection('salon_styles').doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) throw new NotFoundError(`Salon style "${id}" not found`)
    return { id: snapshot.id, ...snapshot.data() }
  }

  async listSalonStyles() {
    const snapshot = await this.db.collection('salon_styles').get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  async listBeadProducts() {
    const snapshot = await this.db.collection('bead_products').get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  async runTransaction(callback) {
    return await this.db.runTransaction(async (firestoreTx) => {
      // Create a transaction-scoped store wrapper
      const txStore = {
        getProduct: (id) => this.getProduct(id, firestoreTx),
        getProducts: (ids) => this.getProducts(ids, firestoreTx),
        updateProductStock: (id, stock) => this.updateProductStock(id, stock, firestoreTx),
        createOrder: (orderData) => this.createOrder(orderData, firestoreTx),
        createBooking: (bookingData) => this.createBooking(bookingData, firestoreTx),
        now: () => this.now(),
      }
      return await callback(txStore)
    })
  }
}

let sharedFirestoreStore = null

export function getStore() {
  if (process.env.USE_IN_MEMORY_STORE === 'true') {
    const { InMemoryStore } = require('../core/store.js')
    return new InMemoryStore()
  }
  if (!sharedFirestoreStore) {
    sharedFirestoreStore = new FirestoreStore()
  }
  return sharedFirestoreStore
}
