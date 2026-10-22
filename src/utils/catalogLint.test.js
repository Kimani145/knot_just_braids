import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  lintCatalog,
  lintAllCatalogs,
  normalizeCatalogName,
  checkPlaceholderContent,
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

  it('detects placeholder content matching configurable patterns', () => {
    assert.equal(checkPlaceholderContent('Needs review: confirm details'), 'Needs review')
    assert.equal(checkPlaceholderContent('Placeholder price KSh 1,500'), 'Placeholder')
    assert.equal(checkPlaceholderContent('Owner to confirm style details'), 'Owner to confirm')
    assert.equal(checkPlaceholderContent('Price is TBC'), 'TBC')
    assert.equal(checkPlaceholderContent('Invincible Locs N-R'), 'N-R')
    assert.equal(checkPlaceholderContent('Loose Braids'), null)

    const items = [
      {
        id: 's1',
        name: 'Invincible Locs N-R',
        description: 'Needs review: Placeholder price KSh 1,500; owner to confirm style details.',
        assetUrl: 'https://img/1.jpg',
        price: 1500,
      },
      {
        id: 's2',
        name: 'Loose Braids',
        description: 'Handcrafted loose braids with custom beads.',
        assetUrl: 'https://img/2.jpg',
        price: 2500,
      },
      {
        id: 's3',
        name: 'Braided Style',
        description: 'Style details are TBC.',
        assetUrl: 'https://img/3.jpg',
        price: 1500,
      },
    ]

    const warnings = lintCatalog(items, 'salon')
    const placeholders = warnings.filter((w) => w.type === 'placeholder-content')
    assert.equal(placeholders.length, 2)
    assert.equal(placeholders[0].itemId, 's1')
    assert.equal(placeholders[1].itemId, 's3')
    assert.match(placeholders[0].message, /placeholder text/)
  })

  it('detects photo-post-without-images for published items lacking photos', () => {
    const items = [
      {
        id: 's1',
        name: 'Sisterlocs N-R',
        status: 'published',
        assetUrl: '',
        images: [],
        videos: [{ provider: 'tiktok', id: '7615692003048721671', kind: 'photo' }],
      },
      {
        id: 's2',
        name: 'Loose Braids',
        status: 'published',
        assetUrl: '',
        images: [],
        videos: [{ provider: 'tiktok', id: '7581592400238300428', kind: 'video' }],
      },
      {
        id: 's3',
        name: 'Beaded Style',
        status: 'published',
        assetUrl: 'https://img/3.jpg',
        images: ['https://img/3.jpg'],
        videos: [{ provider: 'tiktok', id: '7615692003048721671', kind: 'photo' }],
      },
    ]

    const warnings = lintCatalog(items, 'salon')
    const photoWarnings = warnings.filter((w) => w.type === 'photo-post-without-images')
    assert.equal(photoWarnings.length, 1)
    assert.equal(photoWarnings[0].itemId, 's1')
    assert.match(photoWarnings[0].message, /only has TikTok photo posts and has no uploaded photos/)
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
