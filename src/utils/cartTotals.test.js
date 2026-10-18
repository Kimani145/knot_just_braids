import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCartTotals } from './cartTotals.js'

test('calculateCartTotals handles empty or invalid cart inputs', () => {
  assert.deepEqual(calculateCartTotals([]), { total: 0, count: 0 })
  assert.deepEqual(calculateCartTotals(null), { total: 0, count: 0 })
  assert.deepEqual(calculateCartTotals(undefined), { total: 0, count: 0 })
  assert.deepEqual(calculateCartTotals('not-an-array'), { total: 0, count: 0 })
})

test('calculateCartTotals calculates standard items correctly', () => {
  const cart = [
    { id: '1', name: 'Bead Necklace', price: 150, qty: 2 },
    { id: '2', name: 'Waist Beads', price: 300, qty: 1 },
  ]
  assert.deepEqual(calculateCartTotals(cart), { total: 600, count: 2 })
})

test('calculateCartTotals clamps negative or invalid prices and quantities', () => {
  const cart = [
    { id: '1', price: -50, qty: 2 }, // negative price clamped to 0
    { id: '2', price: 100, qty: -3 }, // negative qty clamped to 0
    { id: '3', price: 'abc', qty: 2 }, // invalid price -> 0
    { id: '4', price: 200, qty: 'invalid' }, // invalid qty -> 0
    { id: '5', price: 250, qty: 1.8 }, // float qty floored to 1
  ]
  assert.deepEqual(calculateCartTotals(cart), { total: 250, count: 1 })
})
