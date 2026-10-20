import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Snapchat contact channel is completely removed from storefront and footer', () => {
  const footerPath = path.resolve('src/components/layout/Footer.jsx')
  const clientViewPath = path.resolve('src/components/client/ClientView.jsx')
  const cssPath = path.resolve('src/index.css')
  const svgPath = path.resolve('public/snapchat-svgrepo-com.svg')

  const footerCode = fs.readFileSync(footerPath, 'utf8')
  const clientViewCode = fs.readFileSync(clientViewPath, 'utf8')
  const cssCode = fs.readFileSync(cssPath, 'utf8')

  assert.ok(!footerCode.toLowerCase().includes('snapchat'), 'Footer must not contain any Snapchat references')
  assert.ok(!clientViewCode.toLowerCase().includes('snapchat'), 'ClientView must not contain any Snapchat references')
  assert.ok(!cssCode.includes('.s-snap'), 'CSS must not define .s-snap class')
  assert.ok(!fs.existsSync(svgPath), 'public/snapchat-svgrepo-com.svg must not exist')
})
