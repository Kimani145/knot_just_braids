import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { formatDuration } from '../src/utils/duration.js'

test('PR-E: formatDuration pure logic handles numbers, ranges, and empty values', () => {
  // Bare numbers
  assert.equal(formatDuration('4'), '4 hrs')
  assert.equal(formatDuration(4), '4 hrs')
  assert.equal(formatDuration('1'), '1 hr')
  assert.equal(formatDuration(1), '1 hr')
  assert.equal(formatDuration('2.5'), '2.5 hrs')

  // Ranges with units (normalize hyphens to en-dashes)
  assert.equal(formatDuration('5-7 hrs'), '5–7 hrs')
  assert.equal(formatDuration('5–7 hrs'), '5–7 hrs')
  assert.equal(formatDuration('2-3 hours'), '2–3 hours')

  // Numeric ranges without units
  assert.equal(formatDuration('3-4'), '3–4 hrs')
  assert.equal(formatDuration('5–7'), '5–7 hrs')

  // Other units preserved
  assert.equal(formatDuration('30 mins'), '30 mins')

  // Dashes, empty strings, null, undefined -> empty string
  assert.equal(formatDuration('—'), '')
  assert.equal(formatDuration('-'), '')
  assert.equal(formatDuration('--'), '')
  assert.equal(formatDuration(''), '')
  assert.equal(formatDuration('   '), '')
  assert.equal(formatDuration(null), '')
  assert.equal(formatDuration(undefined), '')
})

test('PR-E: Feed switch buttons have accessible names and aria-pressed attributes', () => {
  const togglePath = path.resolve('src/components/layout/FeedToggle.jsx')
  assert.ok(fs.existsSync(togglePath), 'FeedToggle.jsx must exist')

  const code = fs.readFileSync(togglePath, 'utf8')

  // role="group" and aria-label on wrapper
  assert.match(
    code,
    /role="group"\s+aria-label="Catalog feed switch"/,
    'FeedToggle container must have role="group" and descriptive label'
  )

  // aria-pressed and aria-label on salon button
  assert.match(
    code,
    /aria-pressed=\{activeFeed === 'salon'\}/,
    'Salon toggle button must declare aria-pressed state'
  )
  assert.match(
    code,
    /aria-label=\{BRAND\.salonName\s*\|\|\s*'Salon Styles'\}/,
    'Salon toggle button must have accessible name'
  )

  // aria-pressed and aria-label on beads button
  assert.match(
    code,
    /aria-pressed=\{activeFeed === 'beads'\}/,
    'Beads toggle button must declare aria-pressed state'
  )
  assert.match(
    code,
    /aria-label=\{BRAND\.beadName\s*\|\|\s*'Bead Products'\}/,
    'Beads toggle button must have accessible name'
  )
})

test('PR-E: Navigation cart button has descriptive accessible name with item count', () => {
  const navPath = path.resolve('src/components/layout/Navigation.jsx')
  assert.ok(fs.existsSync(navPath), 'Navigation.jsx must exist')

  const code = fs.readFileSync(navPath, 'utf8')

  // Check aria-label with Cart, N items
  assert.match(
    code,
    /const cartLabel = `Cart, \$\{count\} \$\{count === 1 \? 'item' : 'items'\}`/,
    'Navigation must calculate descriptive cart aria-label with count'
  )
  assert.match(
    code,
    /aria-label=\{cartLabel\}/,
    'Cart button must use dynamic cartLabel'
  )
})

test('PR-E: QuickView modal implements focus trap, opener restoration, inert, and Escape', () => {
  const qvPath = path.resolve('src/components/client/ProductQuickView.jsx')
  assert.ok(fs.existsSync(qvPath), 'ProductQuickView.jsx must exist')

  const code = fs.readFileSync(qvPath, 'utf8')

  // Focus restoration to opener
  assert.ok(
    code.includes('openerRef.current = document.activeElement'),
    'QuickView must capture opener element when opened'
  )
  assert.ok(
    code.includes('openerRef.current?.focus?.()'),
    'QuickView must restore focus to opener when closed'
  )

  // Focus trap
  assert.ok(
    code.includes('handleTabKey') && code.includes('querySelectorAll'),
    'QuickView must contain keyboard focus trap handler'
  )

  // inert on background root
  assert.ok(
    code.includes('root.inert = true'),
    'QuickView must set inert on root container to prevent background interaction'
  )

  // Escape key handler
  assert.match(
    code,
    /event\.key === 'Escape'/,
    'QuickView must close on Escape key'
  )

  // Format duration in quickview content
  assert.ok(
    code.includes('formatDuration(item.duration)'),
    'QuickView must format service duration safely'
  )
})

test('PR-E: Color tokens guarantee WCAG AA contrast (>= 4.5:1)', () => {
  const cssPath = path.resolve('src/index.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  // Ensure salon and bead accents maintain strong contrast against light surface
  assert.match(
    css,
    /--salon-accent:\s*#2e5a2c;/,
    'Salon accent must be deep green #2e5a2c (contrast > 7:1 against light surface)'
  )
  assert.match(
    css,
    /--bead-accent:\s*#3d602f;/,
    'Bead accent must be strengthened green #3d602f (contrast > 6:1 against light surface)'
  )
})
