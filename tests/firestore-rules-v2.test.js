import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Structural verification of firestore.rules.v2 (WS5d Lockdown)
 * Asserts that all client write bypasses are completely eliminated.
 */

test('firestore.rules.v2 exists and enforces complete lockdown for API cutover', () => {
  const rulesPath = path.resolve('firestore.rules.v2')
  assert.ok(fs.existsSync(rulesPath), 'firestore.rules.v2 must exist')

  const content = fs.readFileSync(rulesPath, 'utf8')

  // Version 2 rule check
  assert.ok(content.includes("rules_version = '2';"), 'Must declare rules_version = 2')

  // RBAC checks
  assert.ok(content.includes('function isAdmin()'), 'Must contain isAdmin() helper')
  assert.ok(content.includes('PASTE_ADMIN_UID_HERE'), 'Must contain placeholder for admin UID')

  // Stock decrement carve-out must be completely removed
  assert.ok(!content.includes('function isStockDecrement'), 'isStockDecrement() helper function must NOT exist in v2 rules')

  // Collection rules
  assert.ok(content.includes('match /salon_styles/{id}'), 'Must define rules for salon_styles')
  assert.ok(content.includes('match /bead_products/{id}'), 'Must define rules for bead_products')
  assert.ok(content.includes('match /bookings/{id}'), 'Must define rules for bookings')
  assert.ok(content.includes('match /orders/{id}'), 'Must define rules for orders')
  assert.ok(content.includes('match /assets_metadata/{id}'), 'Must define rules for assets_metadata')

  // Public order and booking creation must NOT exist in v2 rules
  assert.ok(!content.includes('validOrder'), 'validOrder browser creation helper must NOT exist in v2')
  assert.ok(!content.includes('validBooking'), 'validBooking browser creation helper must NOT exist in v2')

  // Catch-all deny
  assert.ok(content.includes('match /{document=**}'), 'Must include catch-all rule')
  assert.ok(content.includes('allow read, write: if false;'), 'Catch-all rule must deny read and write')
})
