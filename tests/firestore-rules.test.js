import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Structural verification of firestore.rules
 * Asserts that all security predicates specified in Appendix A are syntactically present and enforced.
 */

test('firestore.rules exists and matches Appendix A specification', () => {
  const rulesPath = path.resolve('firestore.rules')
  assert.ok(fs.existsSync(rulesPath), 'firestore.rules must exist')

  const content = fs.readFileSync(rulesPath, 'utf8')

  // Version 2 rule check
  assert.ok(content.includes("rules_version = '2';"), 'Must declare rules_version = 2')

  // RBAC checks
  assert.ok(content.includes('function isAdmin()'), 'Must contain isAdmin() helper')
  assert.ok(content.includes('PASTE_ADMIN_UID_HERE'), 'Must contain placeholder for admin UID')

  // Stock decrement carve-out
  assert.ok(content.includes('function isStockDecrement()'), 'Must define isStockDecrement() helper')
  assert.ok(content.includes("affectedKeys().hasOnly(['stock'])"), 'Must restrict stock decrement to stock field only')
  assert.ok(content.includes('after.stock >= 0'), 'Stock decrement must never go negative')
  assert.ok(content.includes('before.stock - after.stock <= 50'), 'Stock decrement must be capped at 50 units per update')

  // Booking validation
  assert.ok(content.includes('function validBooking()'), 'Must define validBooking() helper')
  assert.ok(content.includes("d.status == 'pending'"), 'Bookings must be created with status pending')
  assert.ok(content.includes('d.agreedToPolicy == true'), 'Bookings must enforce agreedToPolicy == true')
  assert.ok(content.includes('d.createdAt == request.time'), 'Bookings must bind createdAt to request.time')
  assert.ok(content.includes('referencePhotoUrls.size() <= 10'), 'Reference photos must be capped at 10 items')

  // Order validation
  assert.ok(content.includes('function validOrder()'), 'Must define validOrder() helper')
  assert.ok(content.includes("d.status == 'pending'"), 'Orders must be created with status pending')
  assert.ok(content.includes('d.agreedToPolicy == true'), 'Orders must enforce agreedToPolicy == true')
  assert.ok(content.includes('d.createdAt == request.time'), 'Orders must bind createdAt to request.time')
  assert.ok(content.includes('d.total > 0 && d.total <= 1000000'), 'Order total must be bounded between 1 and 1,000,000')
  assert.ok(content.includes('d.lineItems.size() >= 1 && d.lineItems.size() <= 30'), 'Order lineItems size must be 1..30')

  // Collection rules
  assert.ok(content.includes('match /salon_styles/{id}'), 'Must define rules for salon_styles')
  assert.ok(content.includes('match /bead_products/{id}'), 'Must define rules for bead_products')
  assert.ok(content.includes('match /bookings/{id}'), 'Must define rules for bookings')
  assert.ok(content.includes('match /orders/{id}'), 'Must define rules for orders')
  assert.ok(content.includes('match /assets_metadata/{id}'), 'Must define rules for assets_metadata')
})
