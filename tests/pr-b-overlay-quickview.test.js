import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('PR-B: color-scheme and scrollbar polish in src/index.css', () => {
  const cssPath = path.resolve('src/index.css')
  assert.ok(fs.existsSync(cssPath), 'src/index.css must exist')
  const css = fs.readFileSync(cssPath, 'utf8')

  // 1. color-scheme dark in [data-theme='dark']
  assert.match(
    css,
    /\[data-theme=['"]dark['"]\]\s*\{[^}]*color-scheme:\s*dark;/,
    '[data-theme="dark"] must declare color-scheme: dark;'
  )

  // 2. color-scheme light in :root
  assert.match(
    css,
    /:root\s*\{[^}]*color-scheme:\s*light;/,
    ':root must declare color-scheme: light;'
  )

  // 3. Thin scrollbar for modal/sheet
  assert.match(
    css,
    /\.sheet\s*\{[^}]*scrollbar-width:\s*thin;/,
    '.sheet must declare scrollbar-width: thin;'
  )
  assert.match(
    css,
    /\.sheet::-webkit-scrollbar/,
    '.sheet must have webkit scrollbar styling;'
  )
})

test('PR-B: TikTokPlayer facade has exactly ONE label layer', () => {
  const playerPath = path.resolve('src/components/client/TikTokPlayer.jsx')
  assert.ok(fs.existsSync(playerPath), 'TikTokPlayer.jsx must exist')
  const code = fs.readFileSync(playerPath, 'utf8')

  // Verify bare MediaPlaceholder variant is used when coverImage is absent
  assert.match(
    code,
    /<MediaPlaceholder[\s\S]*?bare/,
    'TikTokPlayer must pass bare prop to MediaPlaceholder to avoid overprinted chip/title/label'
  )

  // Verify single play affordance
  const playBtnMatches = code.match(/className="tiktok-play-btn"/g) || []
  assert.equal(playBtnMatches.length, 1, 'Facade must have exactly one play affordance')

  // Verify single title
  const titleMatches = code.match(/className="tiktok-facade-title"/g) || []
  assert.equal(titleMatches.length, 1, 'Facade must have exactly one title')

  // Verify single hint/label
  const labelMatches = code.match(/className="tiktok-facade-label"/g) || []
  assert.equal(labelMatches.length, 1, 'Facade must have exactly one tap-to-play/view-photos hint')

  // Verify disclosure is NOT inside the facade container
  const facadeContainer = code.substring(
    code.indexOf('className="tiktok-facade-container"'),
    code.indexOf('</button>') + 25
  )
  assert.ok(
    !facadeContainer.includes('tiktok-disclosure'),
    'tiktok-disclosure must NOT be inside the rounded facade container'
  )
})

test('PR-B: Video footer row renders disclosure and deduplicated watch link outside rounded frame', () => {
  const quickViewPath = path.resolve('src/components/client/ProductQuickView.jsx')
  assert.ok(fs.existsSync(quickViewPath), 'ProductQuickView.jsx must exist')
  const code = fs.readFileSync(quickViewPath, 'utf8')

  // Check quick-view-video-footer has disclosure and watch link
  const footerStart = code.indexOf('className="quick-view-video-footer"')
  assert.ok(footerStart !== -1, 'quick-view-video-footer must exist')
  const footerChunk = code.substring(footerStart, footerStart + 600)

  assert.ok(
    footerChunk.includes('className="tiktok-disclosure"'),
    'quick-view-video-footer must include tiktok-disclosure outside carousel frame'
  )
  assert.ok(
    footerChunk.includes('className="tiktok-watch-link"'),
    'quick-view-video-footer must include tiktok-watch-link outside carousel frame'
  )

  // Verify TikTokPlayer does not have duplicate watch link in error state
  const playerPath = path.resolve('src/components/client/TikTokPlayer.jsx')
  const playerCode = fs.readFileSync(playerPath, 'utf8')
  assert.ok(
    !playerCode.includes('className="tiktok-btn-watch"'),
    'TikTokPlayer must not duplicate the watch link in its error panel'
  )
})

