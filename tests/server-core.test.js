/**
 * tests/server-core.test.js
 * Comprehensive unit tests for Knot Just host-agnostic server core.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ValidationError,
  NotFoundError,
  InsufficientStockError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  formatErrorResponse,
  InMemoryRateLimiter,
  redactPII,
  maskEmail,
  maskPhone,
  sanitizeCustomerName,
  validateOrderPayload,
  validateBookingPayload,
  calculateLineItemPricing,
  calculateOrderPricing,
  InMemoryStore,
  processCheckout,
  processBooking,
  extractBearerToken,
  assertAdmin,
} from '../server/core/index.js'

describe('Server Core - Error Handling & Formatting', () => {
  it('formats AppError with correct status code and body', () => {
    const err = new ValidationError('Invalid name', { field: 'clientName' })
    const res = formatErrorResponse(err)
    assert.equal(res.status, 400)
    assert.equal(res.body.ok, false)
    assert.equal(res.body.error.code, 'VALIDATION_ERROR')
    assert.equal(res.body.error.message, 'Invalid name')
    assert.deepEqual(res.body.error.details, { field: 'clientName' })
  })

  it('masks unknown internal errors as 500 without leaking stack traces', () => {
    const err = new Error('Database password failed at line 42')
    const res = formatErrorResponse(err)
    assert.equal(res.status, 500)
    assert.equal(res.body.ok, false)
    assert.equal(res.body.error.code, 'INTERNAL_ERROR')
    assert.equal(res.body.error.message, 'An unexpected server error occurred.')
    assert.equal(res.body.error.stack, undefined)
  })
})

describe('Server Core - PII Masking & Logging (Kenya DPA 2019)', () => {
  it('masks email addresses accurately', () => {
    assert.equal(maskEmail('jane@example.com'), 'j***e@example.com')
    assert.equal(maskEmail('ab@test.co.ke'), 'a***@test.co.ke')
  })

  it('masks Kenyan phone numbers', () => {
    assert.equal(maskPhone('+254712345678'), '+254****5678')
    assert.equal(maskPhone('0712345678'), '0712****5678')
  })

  it('redacts sensitive keys and patterns in nested objects', () => {
    const payload = {
      clientName: 'Jane Mwangi',
      email: 'jane.mwangi@example.com',
      phone: '+254712345678',
      address: 'Apartment 4B, Kilimani, Nairobi',
      authSecret: 'super-secret-token',
      items: [
        { name: 'Bead Anklet', note: 'Call +254700000000 on delivery' },
      ],
    }

    const sanitized = redactPII(payload)
    assert.equal(sanitized.email, 'j***i@example.com')
    assert.equal(sanitized.phone, '+254****5678')
    assert.equal(sanitized.address, '[REDACTED_ADDRESS]')
    assert.equal(sanitized.authSecret, '[REDACTED_SECRET]')
    assert.equal(sanitized.items[0].note, 'Call +254****0000 on delivery')
  })
})

describe('Server Core - Rate Limiter', () => {
  it('allows requests within window and limits requests exceeding quota', () => {
    const limiter = new InMemoryRateLimiter({ defaultLimit: 3, defaultWindowMs: 1000 })
    const now = 1000000

    assert.equal(limiter.check('ip-1', { now }).allowed, true)
    assert.equal(limiter.check('ip-1', { now: now + 100 }).allowed, true)
    assert.equal(limiter.check('ip-1', { now: now + 200 }).allowed, true)

    // 4th request exceeds limit
    const fourth = limiter.check('ip-1', { now: now + 300 })
    assert.equal(fourth.allowed, false)
    assert.equal(fourth.remaining, 0)
    assert.ok(fourth.resetSeconds > 0)

    // Request from different IP is unaffected
    assert.equal(limiter.check('ip-2', { now: now + 300 }).allowed, true)

    // Request after window expires is allowed again
    assert.equal(limiter.check('ip-1', { now: now + 1500 }).allowed, true)
  })

  it('throws RateLimitError on assertAllowed when exceeded', () => {
    const limiter = new InMemoryRateLimiter({ defaultLimit: 1, defaultWindowMs: 1000 })
    limiter.assertAllowed('client-a')
    assert.throws(
      () => limiter.assertAllowed('client-a'),
      (err) => err instanceof RateLimitError && err.statusCode === 429
    )
  })
})

describe('Server Core - Payload Validators', () => {
  it('sanitizes customer name from clientName, name, or firstName/lastName', () => {
    assert.equal(sanitizeCustomerName({ clientName: '  Alice Smith  ' }), 'Alice Smith')
    assert.equal(sanitizeCustomerName({ name: 'Bob' }), 'Bob')
    assert.equal(sanitizeCustomerName({ firstName: 'Carol', lastName: 'Danvers' }), 'Carol Danvers')
    assert.throws(() => sanitizeCustomerName({}), ValidationError)
  })

  it('validates order payload and enforces mandatory policy agreement', () => {
    assert.throws(
      () =>
        validateOrderPayload({
          clientName: 'Alice',
          address: 'Nairobi',
          lineItems: [{ id: 'item-1', quantity: 1 }],
          agreedToPolicy: false,
        }),
      (err) => err instanceof ValidationError && err.message.includes('agree')
    )

    const valid = validateOrderPayload({
      clientName: 'Alice',
      address: 'Nairobi',
      clientEmail: 'alice@example.com',
      clientPhone: '+254711223344',
      lineItems: [{ id: 'b1', quantity: 2 }],
      agreedToPolicy: true,
    })

    assert.equal(valid.clientName, 'Alice')
    assert.equal(valid.lineItems[0].quantity, 2)
  })

  it('validates booking payload and rejects past dates', () => {
    assert.throws(
      () =>
        validateBookingPayload({
          clientName: 'Alice',
          style: 'Knotless Braids',
          date: '2020-01-01',
          time: '10:00 AM',
          agreedToPolicy: true,
        }),
      (err) => err instanceof ValidationError && err.message.includes('past')
    )

    const valid = validateBookingPayload({
      firstName: 'Alice',
      lastName: 'Wambui',
      style: 'Goddess Braids',
      date: '2028-12-15',
      time: '11:00 AM',
      agreedToPolicy: true,
    })

    assert.equal(valid.clientName, 'Alice Wambui')
    assert.equal(valid.style, 'Goddess Braids')
  })
})

describe('Server Core - Authoritative Pricing', () => {
  it('correctly calculates line items and order totals', () => {
    const catalog = new Map([
      ['b1', { id: 'b1', name: 'Bead Bracelet', price: 450, stock: 10, variant: 'Blue' }],
      ['b2', { id: 'b2', name: 'Waist Bead', price: 1200, stock: 5 }],
    ])

    const pricing = calculateOrderPricing(catalog, [
      { id: 'b1', quantity: 2 },
      { id: 'b2', quantity: 1 },
    ])

    assert.equal(pricing.total, 2100)
    assert.equal(pricing.lineItems.length, 2)
    assert.equal(pricing.lineItems[0].lineTotal, 900)
    assert.equal(pricing.lineItems[1].lineTotal, 1200)
    assert.equal(pricing.itemsSummary, 'Bead Bracelet [Blue] (x2), Waist Bead (x1)')
  })

  it('rejects range pricing products in cart checkout', () => {
    const catalogProduct = { id: 'r1', name: 'Custom Waist Bead', pricingType: 'range', price: 500, priceMax: 1500 }
    assert.throws(
      () => calculateLineItemPricing(catalogProduct, 1),
      (err) => err instanceof ValidationError && err.message.includes('variable/range pricing')
    )
  })
})

describe('Server Core - Checkout & Booking Execution', () => {
  it('executes atomic checkout, decrements stock, and creates order', async () => {
    const store = new InMemoryStore({
      beadProducts: [
        { id: 'prod_1', name: 'Glass Bead Anklet', price: 600, stock: 5 },
        { id: 'prod_2', name: 'Wooden Bead Choker', price: 800, stock: 2 },
      ],
    })

    const result = await processCheckout(store, {
      clientName: 'Wanjiku Mwangi',
      clientEmail: 'wanjiku@example.com',
      address: 'Ngong Road, Nairobi',
      lineItems: [
        { id: 'prod_1', quantity: 2 },
        { id: 'prod_2', quantity: 1 },
      ],
      agreedToPolicy: true,
    })

    assert.equal(result.ok, true)
    assert.ok(result.orderId)
    assert.equal(result.order.total, 2000)
    assert.equal(result.order.status, 'pending')

    // Verify stock was decremented in the store
    const p1 = await store.getProduct('prod_1')
    const p2 = await store.getProduct('prod_2')
    assert.equal(p1.stock, 3)
    assert.equal(p2.stock, 1)
  })

  it('rejects checkout and rolls back when stock is insufficient', async () => {
    const store = new InMemoryStore({
      beadProducts: [
        { id: 'prod_1', name: 'Glass Bead Anklet', price: 600, stock: 1 },
      ],
    })

    await assert.rejects(
      () =>
        processCheckout(store, {
          clientName: 'Faith Njeri',
          address: 'Westlands, Nairobi',
          lineItems: [{ id: 'prod_1', quantity: 5 }],
          agreedToPolicy: true,
        }),
      InsufficientStockError
    )

    // Stock must remain unchanged
    const p1 = await store.getProduct('prod_1')
    assert.equal(p1.stock, 1)
  })

  it('creates booking successfully with valid payload', async () => {
    const store = new InMemoryStore()
    const result = await processBooking(store, {
      clientName: 'Mercy Achieng',
      clientPhone: '+254722000000',
      style: 'Cornrows with Beads',
      date: '2028-10-20',
      time: '02:00 PM',
      notes: 'Medium size please',
      agreedToPolicy: true,
    })

    assert.equal(result.ok, true)
    assert.ok(result.bookingId)
    assert.equal(result.booking.style, 'Cornrows with Beads')
    assert.equal(result.booking.status, 'pending')
  })
})

describe('Server Core - Authentication & Authorization', () => {
  it('extracts Bearer token from authorization header', () => {
    assert.equal(extractBearerToken('Bearer abc.def.123'), 'abc.def.123')
    assert.throws(() => extractBearerToken(''), UnauthorizedError)
    assert.throws(() => extractBearerToken('Basic xyz'), UnauthorizedError)
  })

  it('verifies admin token and checks allowlist', async () => {
    const mockVerifier = async (token) => {
      if (token === 'valid_admin') return { uid: 'admin_uid_1' }
      if (token === 'regular_user') return { uid: 'user_uid_2' }
      throw new Error('Expired token')
    }

    // Success for allowed admin
    const res = await assertAdmin('Bearer valid_admin', mockVerifier, ['admin_uid_1'])
    assert.equal(res.uid, 'admin_uid_1')
    assert.equal(res.isAdmin, true)

    // Forbidden for non-admin
    await assert.rejects(
      () => assertAdmin('Bearer regular_user', mockVerifier, ['admin_uid_1']),
      ForbiddenError
    )

    // Unauthorized for invalid token
    await assert.rejects(
      () => assertAdmin('Bearer bad_token', mockVerifier, ['admin_uid_1']),
      UnauthorizedError
    )
  })
})
