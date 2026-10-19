import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Verification of QuickView media display rules.
 * Ensures images in the pop up view are displayed in their original aspect ratio
 * (object-fit: contain) without zooming, truncation, or hover scale distortion.
 */

test('QuickView image display rules enforce object-fit: contain and untruncated rendering', () => {
  const cssPath = path.resolve('src/index.css')
  assert.ok(fs.existsSync(cssPath), 'src/index.css must exist')

  const css = fs.readFileSync(cssPath, 'utf8')

  // Verify .quick-view-slide img / .quick-view-image has object-fit: contain
  assert.match(
    css,
    /\.quick-view-slide\s+img[\s\S]*?object-fit:\s*contain/,
    '.quick-view-slide img must use object-fit: contain to prevent zooming in and truncation'
  )

  // Verify .quick-view-carousel.carousel-image-mode provides responsive clamp height
  assert.match(
    css,
    /\.quick-view-carousel\.carousel-image-mode\s*\{[^}]*height:\s*clamp\(/,
    'carousel-image-mode must use responsive clamp height for optimal photo viewing'
  )

  // Verify .tiktok-facade-image has object-fit: contain
  assert.match(
    css,
    /\.tiktok-facade-image\s*\{[^}]*object-fit:\s*contain/,
    '.tiktok-facade-image must use object-fit: contain for video cover images'
  )

  // Verify tiktok-facade hover does not zoom/scale the image
  const facadeHoverMatch = css.match(/\.tiktok-facade:hover\s+\.tiktok-facade-image[\s\S]*?\}/)
  if (facadeHoverMatch) {
    assert.ok(
      !facadeHoverMatch[0].includes('transform: scale'),
      'tiktok-facade hover must not scale/zoom the image'
    )
  }
})

test('ProductQuickView assigns quick-view-image class to slide images', () => {
  const componentPath = path.resolve('src/components/client/ProductQuickView.jsx')
  assert.ok(fs.existsSync(componentPath), 'ProductQuickView.jsx must exist')

  const code = fs.readFileSync(componentPath, 'utf8')
  assert.ok(
    code.includes('className="quick-view-image"'),
    'ProductQuickView image must have className="quick-view-image"'
  )
})
