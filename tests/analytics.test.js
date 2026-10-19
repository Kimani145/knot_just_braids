import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeAnalyticsParams,
  getConsentStatus,
  setConsentStatus,
  getAnalyticsProvider,
  trackPageView,
  trackEvent,
  CONSENT_STORAGE_KEY,
} from '../src/services/analytics.js'

describe('Observability & Privacy - Analytics Provider Interface', () => {
  let mockStorage = {}

  beforeEach(() => {
    mockStorage = {}
    globalThis.window = {
      localStorage: {
        getItem: (key) => mockStorage[key] || null,
        setItem: (key, val) => {
          mockStorage[key] = String(val)
        },
      },
      dispatchEvent: () => {},
    }
  })

  it('sanitizes parameters and strips sensitive customer PII', () => {
    const raw = {
      itemId: 'prod_123',
      category: 'beads',
      clientName: 'Amina Kimani',
      clientEmail: 'amina@test.com',
      clientPhone: '+254712345678',
      address: 'Westlands, Nairobi',
      total: 2500,
      isCustom: true,
      notes: 'Please hurry',
    }

    const sanitized = sanitizeAnalyticsParams(raw)
    assert.equal(sanitized.itemId, 'prod_123')
    assert.equal(sanitized.category, 'beads')
    assert.equal(sanitized.total, 2500)
    assert.equal(sanitized.isCustom, true)
    assert.equal(sanitized.clientName, undefined)
    assert.equal(sanitized.clientEmail, undefined)
    assert.equal(sanitized.clientPhone, undefined)
    assert.equal(sanitized.address, undefined)
    assert.equal(sanitized.notes, undefined)
  })

  it('manages consent state in storage and defaults to pending', () => {
    assert.equal(getConsentStatus(), 'pending')

    setConsentStatus('granted')
    assert.equal(mockStorage[CONSENT_STORAGE_KEY], 'granted')
    assert.equal(getConsentStatus(), 'granted')

    setConsentStatus('denied')
    assert.equal(mockStorage[CONSENT_STORAGE_KEY], 'denied')
    assert.equal(getConsentStatus(), 'denied')
  })

  it('defaults provider to none when environment variable is unset', () => {
    delete process.env.VITE_ANALYTICS_PROVIDER
    assert.equal(getAnalyticsProvider(), 'none')
  })

  it('drops tracking calls when consent is not granted', () => {
    setConsentStatus('denied')
    process.env.VITE_ANALYTICS_PROVIDER = 'ga4'

    const pageTracked = trackPageView('/catalog?email=test@test.com')
    assert.equal(pageTracked, false)

    const eventTracked = trackEvent('purchase', { total: 1000 })
    assert.equal(eventTracked, false)
  })

  it('drops tracking calls when provider is none even if consent is granted', () => {
    setConsentStatus('granted')
    process.env.VITE_ANALYTICS_PROVIDER = 'none'

    const pageTracked = trackPageView('/catalog')
    assert.equal(pageTracked, false)

    const eventTracked = trackEvent('purchase', { total: 1000 })
    assert.equal(eventTracked, false)
  })

  it('dispatches sanitized gtag events when consent is granted and provider is ga4', () => {
    setConsentStatus('granted')
    process.env.VITE_ANALYTICS_PROVIDER = 'ga4'

    const gtagCalls = []
    globalThis.window.gtag = (...args) => {
      gtagCalls.push(args)
    }

    const pageTracked = trackPageView('/styles?ref=123', 'Styles Page')
    assert.equal(pageTracked, true)
    assert.equal(gtagCalls.length, 1)
    assert.equal(gtagCalls[0][0], 'event')
    assert.equal(gtagCalls[0][1], 'page_view')
    assert.equal(gtagCalls[0][2].page_path, '/styles')

    const eventTracked = trackEvent('order_placed', {
      total: 3500,
      clientName: 'Jane Mwangi',
      clientPhone: '0711223344',
      itemCount: 3,
    })
    assert.equal(eventTracked, true)
    assert.equal(gtagCalls.length, 2)
    assert.equal(gtagCalls[1][0], 'event')
    assert.equal(gtagCalls[1][1], 'order_placed')
    assert.deepEqual(gtagCalls[1][2], {
      total: 3500,
      itemCount: 3,
    })
  })
})
