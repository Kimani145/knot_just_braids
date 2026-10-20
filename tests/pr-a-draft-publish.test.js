import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { isPubliclyVisible, fetchFullCatalog } from '../server/core/catalog.js'
import { mapSalonStyle, mapBeadProduct } from '../src/utils/mappers.js'
import { validateCatalogItem } from '../src/utils/catalogValidation.js'
import { lintCatalog } from '../src/utils/catalogLint.js'
import { processCheckout } from '../server/core/checkout.js'
import { processBooking } from '../server/core/booking.js'
import { check_stock, start_order, getWhatsAppCatalogContext } from '../server/core/whatsapp.js'
import { InMemoryStore } from '../server/core/store.js'
import { NotFoundError, ValidationError } from '../server/core/errors.js'

describe('PR-A: Shared Visibility Predicate (isPubliclyVisible)', () => {
  it('rejects null, undefined, or non-object inputs', () => {
    assert.equal(isPubliclyVisible(null), false)
    assert.equal(isPubliclyVisible(undefined), false)
    assert.equal(isPubliclyVisible('item'), false)
    assert.equal(isPubliclyVisible(123), false)
  })

  it('rejects items with status === "draft"', () => {
    assert.equal(isPubliclyVisible({ id: '1', name: 'Item', status: 'draft' }), false)
  })

  it('rejects items with unexpected or non-published status', () => {
    assert.equal(isPubliclyVisible({ id: '1', name: 'Item', status: 'archived' }), false)
    assert.equal(isPubliclyVisible({ id: '1', name: 'Item', status: 123 }), false)
  })

  it('accepts items with status === "published"', () => {
    assert.equal(isPubliclyVisible({ id: '1', name: 'Item', status: 'published' }), true)
  })

  it('preserves legacy docs: absent, undefined, or empty status defaults to published', () => {
    assert.equal(isPubliclyVisible({ id: 'legacy-1', name: 'Legacy Braids' }), true)
    assert.equal(isPubliclyVisible({ id: 'legacy-2', name: 'Legacy Beads', status: undefined }), true)
    assert.equal(isPubliclyVisible({ id: 'legacy-3', name: 'Legacy Locs', status: null }), true)
    assert.equal(isPubliclyVisible({ id: 'legacy-4', name: 'Legacy Style', status: '' }), true)
  })
})

describe('PR-A: Storefront Mappers', () => {
  it('maps legacy salon style to published status with empty internalNote', () => {
    const doc = {
      id: 'legacy-style',
      data: () => ({
        name: 'Loose Braids',
        price: 2500,
        description: 'Classic loose braids',
      }),
    }
    const mapped = mapSalonStyle(doc)
    assert.equal(mapped.status, 'published')
    assert.equal(mapped.internalNote, '')
  })

  it('maps draft salon style preserving draft status and internalNote', () => {
    const doc = {
      id: 'draft-style',
      data: () => ({
        name: 'Invincible Locs N-R',
        price: 1500,
        status: 'draft',
        internalNote: 'Needs consultation on length',
      }),
    }
    const mapped = mapSalonStyle(doc)
    assert.equal(mapped.status, 'draft')
    assert.equal(mapped.internalNote, 'Needs consultation on length')
  })

  it('maps legacy bead product to published status with empty internalNote', () => {
    const doc = {
      id: 'legacy-bead',
      data: () => ({
        name: 'Waist Beads',
        price: 150,
        stock: 10,
      }),
    }
    const mapped = mapBeadProduct(doc)
    assert.equal(mapped.status, 'published')
    assert.equal(mapped.internalNote, '')
  })

  it('maps draft bead product preserving draft status and internalNote', () => {
    const doc = {
      id: 'draft-bead',
      data: () => ({
        name: 'Experimental Charm',
        price: 50,
        status: 'draft',
        internalNote: 'Waiting for shipment verification',
      }),
    }
    const mapped = mapBeadProduct(doc)
    assert.equal(mapped.status, 'draft')
    assert.equal(mapped.internalNote, 'Waiting for shipment verification')
  })
})

describe('PR-A: Publish-Time vs Draft Validation', () => {
  it('draft validation requires only a name', () => {
    const result = validateCatalogItem({ name: 'Draft Concept' }, { isPublishing: false })
    assert.equal(result.isValid, true)
    assert.deepEqual(result.errors, {})
  })

  it('draft validation rejects when name is missing', () => {
    const result = validateCatalogItem({ name: '   ' }, { isPublishing: false })
    assert.equal(result.isValid, false)
    assert.match(result.errors.name, /name is required/)
  })

  it('publishing validation enforces name, description, and price', () => {
    const emptyForm = validateCatalogItem({}, { isPublishing: true })
    assert.equal(emptyForm.isValid, false)
    assert.ok(emptyForm.errors.name)
    assert.ok(emptyForm.errors.desc)
    assert.ok(emptyForm.errors.price)

    const validForm = validateCatalogItem(
      {
        name: 'Boho Knotless',
        desc: 'Beautiful human hair curl finish',
        price: '3500',
      },
      { isPublishing: true }
    )
    assert.equal(validForm.isValid, true)
    assert.deepEqual(validForm.errors, {})
  })

  it('publishing validation enforces range bounds and integer stock for beads', () => {
    const invalidRange = validateCatalogItem(
      {
        name: 'Custom Beads',
        desc: 'Hand-painted',
        pricingType: 'range',
        price: 300,
        priceMax: 200,
        stock: 5,
      },
      { type: 'beads', isPublishing: true }
    )
    assert.equal(invalidRange.isValid, false)
    assert.match(invalidRange.errors.priceMax, /cannot be less than minimum price/)

    const invalidStock = validateCatalogItem(
      {
        name: 'Custom Beads',
        desc: 'Hand-painted',
        price: 300,
        stock: -1,
      },
      { type: 'beads', isPublishing: true }
    )
    assert.equal(invalidStock.isValid, false)
    assert.match(invalidStock.errors.stock, /integer of 0 or greater/)
  })
})

describe('PR-A: Catalog Linting - Placeholder Content Rule', () => {
  const target8SalonStyles = [
    { id: '1', name: 'Invincible Locs N-R', description: 'Needs review: ... Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '2', name: 'Spring Twists N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '3', name: 'Ponytail N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '4', name: 'Sisterlocs N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '5', name: 'Distressed Locs N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '6', name: 'Braided Style N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '7', name: 'Natural Hairstyle N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
    { id: '8', name: 'Afro Wig N-R', description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.' },
  ]

  it('flags all 8 live placeholder styles from the target set', () => {
    const warnings = lintCatalog(target8SalonStyles, 'salon')
    const placeholderWarnings = warnings.filter((w) => w.type === 'placeholder-content')
    assert.equal(placeholderWarnings.length, 8)
    for (const w of placeholderWarnings) {
      assert.match(w.message, /contains placeholder text/)
    }
  })

  it('does NOT flag legitimate styles without placeholder keywords', () => {
    const cleanStyles = [
      { id: 'c1', name: 'Loose Braids', description: 'Handcrafted loose braids with customizable bead accents.' },
      { id: 'c2', name: 'Hair Charms', description: 'Metallic and crystal charms for styling braids.' },
    ]
    const warnings = lintCatalog(cleanStyles, 'salon')
    const placeholderWarnings = warnings.filter((w) => w.type === 'placeholder-content')
    assert.equal(placeholderWarnings.length, 0)
  })
})

describe('PR-A: Server-Side Enforcement (Refusal of Drafts)', () => {
  it('fetchFullCatalog excludes draft items from catalog query', async () => {
    const store = new InMemoryStore({
      salonStyles: [
        { id: 's1', name: 'Published Style', status: 'published' },
        { id: 's2', name: 'Draft Style', status: 'draft' },
        { id: 's3', name: 'Legacy Style' }, // status absent -> published
      ],
      beadProducts: [
        { id: 'b1', name: 'Published Beads', status: 'published' },
        { id: 'b2', name: 'Draft Beads', status: 'draft' },
      ],
    })

    const catalog = await fetchFullCatalog(store)
    assert.equal(catalog.salonStyles.length, 2)
    assert.equal(catalog.salonStyles.some((s) => s.id === 's2'), false)
    assert.equal(catalog.beadProducts.length, 1)
    assert.equal(catalog.beadProducts[0].id, 'b1')
  })

  it('processCheckout refuses draft items and throws NotFoundError even with forged id', async () => {
    const store = new InMemoryStore({
      beadProducts: [
        { id: 'b_live', name: 'Live Beads', price: 500, stock: 10, status: 'published' },
        { id: 'b_draft', name: 'Draft Beads', price: 500, stock: 10, status: 'draft' },
      ],
    })

    // Attempting to checkout the draft item
    await assert.rejects(
      () =>
        processCheckout(store, {
          clientName: 'Jane Mwangi',
          clientPhone: '+254711000000',
          address: 'Nairobi',
          lineItems: [{ id: 'b_draft', quantity: 1 }],
          agreedToPolicy: true,
        }),
      NotFoundError
    )

    // Attempting to checkout live item succeeds
    const checkoutResult = await processCheckout(store, {
      clientName: 'Jane Mwangi',
      clientPhone: '+254711000000',
      address: 'Nairobi',
      lineItems: [{ id: 'b_live', quantity: 1 }],
      agreedToPolicy: true,
    })
    assert.equal(checkoutResult.ok, true)
  })

  it('processBooking refuses draft salon styles and throws ValidationError even with forged id/name', async () => {
    const store = new InMemoryStore({
      salonStyles: [
        { id: 's_draft', name: 'Invincible Locs N-R', status: 'draft' },
        { id: 's_live', name: 'Loose Braids', status: 'published' },
      ],
    })

    // Attempting to book the draft style
    await assert.rejects(
      () =>
        processBooking(store, {
          clientName: 'Wanjiku Test',
          clientPhone: '+254700000000',
          style: 'Invincible Locs N-R',
          styleId: 's_draft',
          date: '2028-11-01',
          time: '10:00 AM',
          agreedToPolicy: true,
        }),
      ValidationError
    )

    // Attempting to book published style succeeds
    const bookingResult = await processBooking(store, {
      clientName: 'Wanjiku Test',
      clientPhone: '+254700000000',
      style: 'Loose Braids',
      styleId: 's_live',
      date: '2028-11-01',
      time: '10:00 AM',
      agreedToPolicy: true,
    })
    assert.equal(bookingResult.ok, true)
  })

  it('WhatsApp check_stock and start_order refuse drafts', async () => {
    const store = new InMemoryStore({
      beadProducts: [
        { id: 'b_draft', name: 'Draft Beads', price: 100, stock: 10, status: 'draft' },
        { id: 'b_live', name: 'Live Beads', price: 100, stock: 10, status: 'published' },
      ],
    })

    // check_stock on draft returns found: false
    const draftStock = await check_stock(store, 'b_draft')
    assert.equal(draftStock.found, false)
    assert.equal(draftStock.inStock, false)

    // check_stock on live item returns found: true
    const liveStock = await check_stock(store, 'b_live')
    assert.equal(liveStock.found, true)
    assert.equal(liveStock.inStock, true)

    // start_order on draft returns error
    const draftOrder = await start_order(store, 'b_draft', 1)
    assert.equal(draftOrder.ok, false)

    // start_order on live item succeeds
    const liveOrder = await start_order(store, 'b_live', 1)
    assert.equal(liveOrder.ok, true)
    assert.equal(liveOrder.product.id, 'b_live')

    // getWhatsAppCatalogContext excludes drafts
    const context = await getWhatsAppCatalogContext(store)
    assert.equal(context.beadProducts.length, 1)
    assert.equal(context.beadProducts[0].id, 'b_live')
  })
})
