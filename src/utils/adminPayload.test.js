import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildInventoryPayload } from './adminPayload.js'
import { mapSalonStyle, mapBeadProduct } from './mappers.js'
import { formatPriceRange } from './pricingUtils.js'
import { formatFirestoreError } from './firestoreErrors.js'

describe('Admin Reliability - buildInventoryPayload', () => {
  it('returns hasChanges: false and empty payload for no-op edits', () => {
    const original = {
      id: 'salon-1',
      type: 'salon',
      name: 'Knotless Braids',
      pricingType: 'fixed',
      price: 2500,
      priceMax: null,
      desc: 'Clean protective style',
      variant: 'Mid-back',
      duration: '3 hrs',
      status: 'published',
      internalNote: 'Uses 3 packs',
      assetUrl: 'https://img.com/1.jpg',
      videos: [{ provider: 'tiktok', id: '1234567890', handle: 'knotjust', kind: 'video' }],
    }

    const editForm = {
      ...original,
      image: { assetUrl: 'https://img.com/1.jpg' },
      images: [],
    }

    const result = buildInventoryPayload(editForm, original)
    assert.equal(result.hasChanges, false)
    assert.deepEqual(result.payload, {})
    assert.equal(result.error, null)
  })

  it('guarantees undefined-free output across all partial updates', () => {
    const original = {
      id: 'salon-1',
      type: 'salon',
      name: 'Knotless Braids',
      pricingType: 'fixed',
      price: 2500,
      desc: 'Initial description',
      status: 'published',
      duration: '3 hrs',
    }

    const editForm = {
      ...original,
      duration: '4 hrs',
      variant: undefined,
      internalNote: undefined,
    }

    const result = buildInventoryPayload(editForm, original)
    assert.equal(result.hasChanges, true)
    assert.deepEqual(result.payload, { duration: '4 hrs' })
    for (const key of Object.keys(result.payload)) {
      assert.notEqual(result.payload[key], undefined)
    }
  })

  it('preserves untouched media and only updates when explicitly modified', () => {
    const original = {
      id: 'bead-1',
      type: 'beads',
      name: 'Waist Beads',
      desc: 'Handcrafted',
      price: 150,
      stock: 10,
      status: 'published',
      assetUrl: 'https://img.com/cover.jpg',
      images: ['https://img.com/cover.jpg', 'https://img.com/extra.jpg'],
      videos: [],
    }

    // Edit only stock, untouched images
    const editForm = {
      ...original,
      stock: 15,
      images: [
        { assetUrl: 'https://img.com/cover.jpg' },
        { assetUrl: 'https://img.com/extra.jpg' },
      ],
    }

    const result = buildInventoryPayload(editForm, original)
    assert.equal(result.hasChanges, true)
    // images and assetUrl must NOT be included in payload since URLs are unchanged
    assert.deepEqual(result.payload, { stock: 15 })
  })

  it('videos follow strict diff rule and are only included when changed', () => {
    const original = {
      id: 'salon-1',
      type: 'salon',
      name: 'Cornrows',
      desc: 'Classic style',
      status: 'published',
      videos: [{ provider: 'tiktok', id: '1111111111', handle: 'knotjust', kind: 'video' }],
    }

    // Videos unchanged
    const editSameVideos = {
      ...original,
      desc: 'Updated description',
      videos: [{ provider: 'tiktok', id: '1111111111', handle: 'knotjust', kind: 'video' }],
    }
    const resSame = buildInventoryPayload(editSameVideos, original)
    assert.equal('videos' in resSame.payload, false)

    // Videos changed
    const editNewVideos = {
      ...original,
      videos: [
        { provider: 'tiktok', id: '1111111111', handle: 'knotjust', kind: 'video' },
        { provider: 'tiktok', id: '2222222222', handle: 'knotjust', kind: 'photo' },
      ],
    }
    const resNew = buildInventoryPayload(editNewVideos, original)
    assert.equal('videos' in resNew.payload, true)
    assert.equal(resNew.payload.videos.length, 2)
  })

  it('never invents "Updated style/product" fallback text', () => {
    const original = {
      id: 'salon-1',
      type: 'salon',
      name: 'Cornrows',
      desc: 'Original description',
      status: 'published',
    }

    const editForm = {
      ...original,
      duration: '2 hrs',
    }

    const result = buildInventoryPayload(editForm, original)
    assert.equal('description' in result.payload, false)
  })

  it('blocks empty description when publishing, but allows empty description for drafts', () => {
    const original = {
      id: 'salon-1',
      type: 'salon',
      name: 'Cornrows',
      desc: 'Original description',
      status: 'published',
    }

    // Empty description for published item -> blocked with error
    const editEmptyPublished = {
      ...original,
      desc: '',
      status: 'published',
    }
    const resPublished = buildInventoryPayload(editEmptyPublished, original)
    assert.equal(resPublished.hasChanges, false)
    assert.match(resPublished.error, /Description is required when publishing/)

    // Empty description for draft item -> allowed
    const editEmptyDraft = {
      ...original,
      desc: '',
      status: 'draft',
      internalNote: 'Move customer text to internal note',
    }
    const resDraft = buildInventoryPayload(editEmptyDraft, original)
    assert.equal(resDraft.hasChanges, true)
    assert.equal(resDraft.error, null)
    assert.equal(resDraft.payload.description, '')
    assert.equal(resDraft.payload.status, 'draft')
  })
})

describe('Admin Reliability - Salon Range Pricing Persistence', () => {
  it('correctly hydrates from a salon doc with pricingType: "range" and round-trips through payload and mapper', () => {
    // 1. Initial Firestore salon document
    const firestoreDoc = {
      id: 'salon-range-1',
      data: () => ({
        name: 'Goddess Locs',
        pricingType: 'range',
        price: 1500,
        priceMax: 2500,
        duration: '4–6 hrs',
        description: 'Bohemian goddess locs with wavy ends',
        variant: 'Waist length',
        status: 'published',
        assetUrl: 'https://img.com/goddess.jpg',
      }),
    }

    // 2. Map through mapper
    const mappedOriginal = mapSalonStyle(firestoreDoc)
    assert.equal(mappedOriginal.pricingType, 'range')
    assert.equal(mappedOriginal.price, 1500)
    assert.equal(mappedOriginal.priceMax, 2500)

    // Formatted display in StyleCard / QuickView
    const initialDisplay = formatPriceRange(
      mappedOriginal.price,
      mappedOriginal.priceMax,
      mappedOriginal.pricingType
    )
    assert.equal(initialDisplay, 'Kshs 1,500 – Kshs 2,500')

    // 3. Admin modifies max price in edit form
    const editForm = {
      ...mappedOriginal,
      priceMax: 2800,
    }

    const payloadResult = buildInventoryPayload(editForm, mappedOriginal)
    assert.equal(payloadResult.hasChanges, true)
    assert.deepEqual(payloadResult.payload, { priceMax: 2800 })

    // 4. Update simulated document with payload
    const updatedDoc = {
      id: 'salon-range-1',
      data: () => ({
        ...firestoreDoc.data(),
        ...payloadResult.payload,
      }),
    }

    // 5. Verify round-trip back to mapped item and display
    const remapped = mapSalonStyle(updatedDoc)
    assert.equal(remapped.pricingType, 'range')
    assert.equal(remapped.price, 1500)
    assert.equal(remapped.priceMax, 2800)

    const updatedDisplay = formatPriceRange(
      remapped.price,
      remapped.priceMax,
      remapped.pricingType
    )
    assert.equal(updatedDisplay, 'Kshs 1,500 – Kshs 2,800')
  })

  it('correctly handles beads range pricing persistence', () => {
    const firestoreDoc = {
      id: 'bead-range-1',
      data: () => ({
        name: 'Waist Beads Custom',
        pricingType: 'range',
        price: 50,
        priceMax: 120,
        stock: 25,
        status: 'published',
      }),
    }

    const mapped = mapBeadProduct(firestoreDoc)
    assert.equal(mapped.pricingType, 'range')
    assert.equal(mapped.price, 50)
    assert.equal(mapped.priceMax, 120)

    // Edit price to 60
    const editForm = { ...mapped, price: 60 }
    const result = buildInventoryPayload(editForm, mapped)
    assert.equal(result.hasChanges, true)
    assert.deepEqual(result.payload, { price: 60 })
  })
})

describe('Admin Reliability - Firestore Error Mapping', () => {
  it('maps permission-denied to actionable authorization instructions', () => {
    const err = { code: 'permission-denied' }
    const msg = formatFirestoreError(err)
    assert.match(msg, /Signed in but not authorized; check the admin UID in the live rules/)
  })

  it('maps unauthenticated to session expiration instructions', () => {
    const err = { code: 'unauthenticated' }
    const msg = formatFirestoreError(err)
    assert.match(msg, /Session expired or not signed in/)
  })

  it('maps unavailable to service availability instructions', () => {
    const err = { code: 'unavailable' }
    const msg = formatFirestoreError(err)
    assert.match(msg, /temporarily unavailable/)
  })

  it('maps unknown error codes safely without leaking internal details', () => {
    const err = { code: 'unknown_code', message: 'Internal socket closed' }
    const msg = formatFirestoreError(err)
    assert.match(msg, /unknown_code/)
  })
})
