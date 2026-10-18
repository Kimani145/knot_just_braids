import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  lintCatalog,
  lintAllCatalogs,
  normalizeCatalogName,
} from './catalogLint.js'

describe('catalogLint utility', () => {
  it('normalizes catalog names properly', () => {
    assert.equal(normalizeCatalogName('  Knotless   Braids '), 'knotless braids')
    assert.equal(normalizeCatalogName(''), '')
    assert.equal(normalizeCatalogName(null), '')
  })

  it('detects duplicate items with identical names and variants', () => {
    const items = [
      { id: '1', name: 'Knotless Braids', variant: '', assetUrl: 'https://img/1.jpg', price: 100 },
      { id: '2', name: 'knotless braids', variant: '', assetUrl: 'https://img/2.jpg', price: 100 },
    ]
    const warnings = lintCatalog(items, 'salon')
    const dups = warnings.filter((w) => w.type === 'duplicate-name')
    assert.equal(dups.length, 1)
    assert.match(dups[0].message, /Duplicate hair style found/)
  })

  it('detects shared names with differing prices when lacking variant', () => {
    const items = [
      { id: '1', name: 'Waist Beads', variant: '', assetUrl: 'https://img/1.jpg', price: 50 },
      { id: '2', name: 'Waist Beads', variant: 'Hand-painted', assetUrl: 'https://img/2.jpg', price: 80 },
    ]
    const warnings = lintCatalog(items, 'beads')
    const diff = warnings.filter((w) => w.type === 'shared-name-different-price')
    assert.equal(diff.length, 1)
    assert.match(diff[0].message, /lack distinguishing variants/)
  })

  it('does NOT warn when items with shared name both have distinct variants', () => {
    const items = [
      { id: '1', name: 'Waist Beads', variant: 'Original finish', assetUrl: 'https://img/1.jpg', price: 50 },
      { id: '2', name: 'Waist Beads', variant: 'Hand-painted', assetUrl: 'https://img/2.jpg', price: 80 },
    ]
    const warnings = lintCatalog(items, 'beads')
    const diff = warnings.filter((w) => w.type === 'shared-name-different-price' || w.type === 'duplicate-name')
    assert.equal(diff.length, 0)
  })

  it('detects trivial range spread (diff <= 5)', () => {
    const items = [
      {
        id: '1',
        name: 'Twists',
        pricingType: 'range',
        price: 500,
        priceMax: 505,
        assetUrl: 'https://img/1.jpg',
      },
      {
        id: '2',
        name: 'Braids',
        pricingType: 'range',
        price: 500,
        priceMax: 800,
        assetUrl: 'https://img/2.jpg',
      },
    ]
    const warnings = lintCatalog(items, 'salon')
    const trivial = warnings.filter((w) => w.type === 'trivial-spread')
    assert.equal(trivial.length, 1)
    assert.equal(trivial[0].itemId, '1')
    assert.match(trivial[0].message, /trivial price range spread/)
  })

  it('detects missing cover image', () => {
    const items = [
      { id: '1', name: 'Twists', assetUrl: '', images: [], price: 500 },
      { id: '2', name: 'Braids', assetUrl: 'https://img/2.jpg', price: 600 },
    ]
    const warnings = lintCatalog(items, 'salon')
    const missing = warnings.filter((w) => w.type === 'missing-cover')
    assert.equal(missing.length, 1)
    assert.equal(missing[0].itemId, '1')
    assert.match(missing[0].message, /no cover image/)
  })

  it('lintAllCatalogs aggregates warnings from both catalogs', () => {
    const salon = [
      { id: 's1', name: 'Style 1', assetUrl: '' },
    ]
    const beads = [
      { id: 'b1', name: 'Bead 1', assetUrl: '' },
    ]
    const warnings = lintAllCatalogs(salon, beads)
    assert.equal(warnings.length, 2)
  })
})
