import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  scrubPiiText,
  scrubPiiData,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
  initSentry,
} from './sentry.js'

describe('Observability & Privacy - Sentry PII Scrubber', () => {
  it('scrubs customer email addresses from text', () => {
    const raw = 'Error processing booking for customer mary.wanjiku@example.com in store'
    const scrubbed = scrubPiiText(raw)
    assert.equal(scrubbed, 'Error processing booking for customer [REDACTED_EMAIL] in store')
  })

  it('scrubs Kenyan phone numbers (+254 and 07/01) from text', () => {
    const raw1 = 'Payment failed for +254712345678 on checkout'
    const raw2 = 'Notification failed for 0722000111 or 0110123456'
    assert.equal(scrubPiiText(raw1), 'Payment failed for [REDACTED_PHONE] on checkout')
    assert.equal(scrubPiiText(raw2), 'Notification failed for [REDACTED_PHONE] or [REDACTED_PHONE]')
  })

  it('scrubs sensitive customer fields in nested objects', () => {
    const payload = {
      orderId: 'ord_123',
      clientName: 'Faith Muthoni',
      clientEmail: 'faith@example.com',
      clientPhone: '+254711223344',
      address: 'Apartment 4B, Roysambu',
      referencePhotoUrls: ['https://res.cloudinary.com/knotjust/image/upload/v1/ref.jpg'],
      nested: {
        customerEmail: 'secret@domain.com',
        cartValue: 4500,
      },
    }

    const scrubbed = scrubPiiData(payload)
    assert.equal(scrubbed.orderId, 'ord_123')
    assert.equal(scrubbed.clientName, '[REDACTED]')
    assert.equal(scrubbed.clientEmail, '[REDACTED]')
    assert.equal(scrubbed.clientPhone, '[REDACTED]')
    assert.equal(scrubbed.address, '[REDACTED]')
    assert.equal(scrubbed.referencePhotoUrls, '[REDACTED]')
    assert.equal(scrubbed.nested.customerEmail, '[REDACTED]')
    assert.equal(scrubbed.nested.cartValue, 4500)
  })

  it('sanitizes breadcrumbs and strips URL query parameters', () => {
    const breadcrumb = {
      category: 'navigation',
      message: 'Navigated to checkout with phone 0722123456',
      data: {
        to: '/checkout?name=Amina&phone=0722123456',
        clientPhone: '0722123456',
      },
    }

    const sanitized = sanitizeSentryBreadcrumb(breadcrumb)
    assert.equal(sanitized.message, 'Navigated to checkout with phone [REDACTED_PHONE]')
    assert.equal(sanitized.data.to, '/checkout')
    assert.equal(sanitized.data.clientPhone, '[REDACTED]')
  })

  it('sanitizes full Sentry event payload and strips user PII and request headers', () => {
    const event = {
      message: 'Failed checkout for customer wanjiku@test.co.ke',
      exception: {
        values: [
          {
            value: 'Error at booking step for 0799887766',
          },
        ],
      },
      user: {
        id: 'anon_user_99',
        email: 'customer@example.com',
        ip_address: '197.237.100.1',
        name: 'Wanjiku',
      },
      request: {
        url: 'https://knotjust.co.ke/checkout',
        headers: { Cookie: 'auth=secret', Authorization: 'Bearer tok123' },
        cookies: { session: 'xyz' },
        query_string: 'clientEmail=test@test.com',
        data: {
          clientName: 'Jane Doe',
          amount: 1500,
        },
      },
    }

    const sanitized = sanitizeSentryEvent(event)
    assert.equal(sanitized.message, 'Failed checkout for customer [REDACTED_EMAIL]')
    assert.equal(sanitized.exception.values[0].value, 'Error at booking step for [REDACTED_PHONE]')
    assert.equal(sanitized.user.id, 'anon_user_99')
    assert.equal(sanitized.user.email, undefined)
    assert.equal(sanitized.user.ip_address, undefined)
    assert.equal(sanitized.user.name, undefined)
    assert.equal(sanitized.request.headers, undefined)
    assert.equal(sanitized.request.cookies, undefined)
    assert.equal(sanitized.request.query_string, '[REDACTED]')
    assert.equal(sanitized.request.data.clientName, '[REDACTED]')
    assert.equal(sanitized.request.data.amount, 1500)
  })

  it('returns false when initializing without a DSN or in non-browser env', () => {
    const result = initSentry()
    assert.equal(result, false)
  })
})
