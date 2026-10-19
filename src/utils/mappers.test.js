import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDisplayName,
  mapSalonStyle,
  mapBeadProduct,
  mapBooking,
  mapOrder,
} from './mappers.js'

test('getDisplayName extracts explicit name or combines first/last name', () => {
  assert.equal(getDisplayName({ name: 'Jane Doe' }), 'Jane Doe')
  assert.equal(getDisplayName({ firstName: 'Jane', lastName: 'Doe' }), 'Jane Doe')
  assert.equal(getDisplayName({ firstName: 'Jane' }), 'Jane')
  assert.equal(getDisplayName({}), '')
})

test('mapSalonStyle maps salon document data safely with defaults', () => {
  const doc = {
    id: 'salon-1',
    data: () => ({
      name: 'Knotless Braids',
      price: '2500',
      duration: '3 hrs',
      videos: [{ provider: 'tiktok', id: '123456789012', handle: 'braider' }],
    }),
  }

  const mapped = mapSalonStyle(doc, 0)
  assert.equal(mapped.id, 'salon-1')
  assert.equal(mapped.name, 'Knotless Braids')
  assert.equal(mapped.price, 2500)
  assert.equal(mapped.pricingType, 'fixed')
  assert.equal(mapped.duration, '3 hrs')
  assert.equal(mapped.videos.length, 1)
})

test('mapBeadProduct maps bead product with range pricing and stock parsing', () => {
  const doc = {
    id: 'bead-1',
    data: () => ({
      name: 'Clay Beads',
      pricingType: 'range',
      price: '150',
      priceMax: '300',
      stock: '15',
      images: ['https://example.com/beads.jpg'],
    }),
  }

  const mapped = mapBeadProduct(doc, 1)
  assert.equal(mapped.id, 'bead-1')
  assert.equal(mapped.name, 'Clay Beads')
  assert.equal(mapped.price, 150)
  assert.equal(mapped.priceMax, 300)
  assert.equal(mapped.pricingType, 'range')
  assert.equal(mapped.stock, 15)
  assert.equal(mapped.assetUrl, 'https://example.com/beads.jpg')
})

test('mapBooking and mapOrder format customer fields and line summaries', () => {
  const bookingDoc = {
    id: 'bk-1',
    data: () => ({
      clientName: 'Alice',
      style: 'Box Braids',
      date: '2026-10-25',
      status: 'pending',
    }),
  }
  const mappedBooking = mapBooking(bookingDoc)
  assert.equal(mappedBooking.clientName, 'Alice')
  assert.equal(mappedBooking.style, 'Box Braids')

  const orderDoc = {
    id: 'ord-1',
    data: () => ({
      clientName: 'Bob',
      lineItems: [
        { name: 'Red Beads', qty: 2 },
        { name: 'Blue Beads', qty: 1 },
      ],
      total: 500,
    }),
  }
  const mappedOrder = mapOrder(orderDoc)
  assert.equal(mappedOrder.clientName, 'Bob')
  assert.equal(mappedOrder.items, 'Red Beads x2, Blue Beads x1')
  assert.equal(mappedOrder.total, 500)
})
