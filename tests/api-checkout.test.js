/**
 * tests/api-checkout.test.js
 * Unit tests for client API checkout and booking services.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isApiCheckoutEnabled,
  submitApiCheckout,
  submitApiBooking,
} from '../src/services/api.js'

describe('Client Services - API Checkout & Booking', () => {
  it('isApiCheckoutEnabled returns boolean based on environment flag', () => {
    const defaultEnabled = isApiCheckoutEnabled()
    assert.equal(typeof defaultEnabled, 'boolean')
  })

  it('submitApiCheckout throws error with status and code on failure', async () => {
    // Intercept fetch with mock failing endpoint
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for Glass Bead Anklet',
        },
      }),
    })

    try {
      await assert.rejects(
        () =>
          submitApiCheckout({
            clientName: 'Wanjiku',
            address: 'Nairobi',
            lineItems: [{ id: 'b1', quantity: 10 }],
            agreedToPolicy: true,
          }),
        (err) => {
          assert.equal(err.status, 409)
          assert.equal(err.code, 'INSUFFICIENT_STOCK')
          assert.ok(err.message.includes('Insufficient stock'))
          return true
        }
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('submitApiCheckout succeeds and returns order data on success', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        orderId: 'order_test_123',
        order: { id: 'order_test_123', total: 1500, status: 'pending' },
      }),
    })

    try {
      const res = await submitApiCheckout({
        clientName: 'Wanjiku',
        address: 'Nairobi',
        lineItems: [{ id: 'b1', quantity: 2 }],
        agreedToPolicy: true,
      })

      assert.equal(res.ok, true)
      assert.equal(res.orderId, 'order_test_123')
      assert.equal(res.order.total, 1500)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('submitApiBooking succeeds and returns booking ID', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        bookingId: 'booking_test_456',
        booking: { id: 'booking_test_456', style: 'Goddess Braids' },
      }),
    })

    try {
      const res = await submitApiBooking({
        clientName: 'Jane',
        style: 'Goddess Braids',
        date: '2028-11-01',
        time: '10:00 AM',
        agreedToPolicy: true,
      })

      assert.equal(res.ok, true)
      assert.equal(res.bookingId, 'booking_test_456')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
