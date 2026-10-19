import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePriceInput, formatPriceRange } from './pricingUtils.js'

test('normalizePriceInput strips non-numeric characters and formats display', () => {
  assert.deepEqual(normalizePriceInput('Ksh 1500'), { raw: 1500, display: 'Kshs 1,500' })
  assert.deepEqual(normalizePriceInput('450.50'), { raw: 450.5, display: 'Kshs 450.5' })
  assert.deepEqual(normalizePriceInput(''), { raw: '', display: '' })
  assert.deepEqual(normalizePriceInput(null), { raw: '', display: '' })
  assert.deepEqual(normalizePriceInput('abc'), { raw: '', display: '' })
  assert.deepEqual(normalizePriceInput(-50), { raw: '', display: '' })
})

test('formatPriceRange formats fixed and range prices properly with en-dash', () => {
  assert.equal(formatPriceRange(500, null, 'fixed'), 'Kshs 500')
  assert.equal(formatPriceRange(500, 1000, 'range'), 'Kshs 500 – Kshs 1,000')
  // When min equals max or max <= min, collapses to single price
  assert.equal(formatPriceRange(500, 500, 'range'), 'Kshs 500')
  assert.equal(formatPriceRange(500, 400, 'range'), 'Kshs 500')
})
