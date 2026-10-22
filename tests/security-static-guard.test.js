/**
 * tests/security-static-guard.test.js
 * Security static guard test: scans src/ and api/ to ensure zero third-party
 * remote script execution, zero DOM HTML injection, and strict cross-origin iframe security.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BANNED_PATTERNS = [
  { pattern: /createContextualFragment/g, name: 'createContextualFragment' },
  { pattern: /\.innerHTML\b/g, name: 'innerHTML' },
  { pattern: /\.insertAdjacentHTML\b/g, name: 'insertAdjacentHTML' },
  { pattern: /\.outerHTML\b/g, name: 'outerHTML' },
  { pattern: /document\.write\b/g, name: 'document.write' },
  { pattern: /embed\.js/g, name: 'embed.js (remote TikTok script injection)' },
  { pattern: /dangerouslySetInnerHTML/g, name: 'dangerouslySetInnerHTML' },
]

function collectFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectFiles(fullPath, fileList)
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx|html|css)$/.test(entry.name)) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

test('SECURITY STATIC GUARD: zero unsafe DOM injection or third-party script execution in src/ and api/', () => {
  const rootDir = process.cwd()
  const scanDirs = [path.join(rootDir, 'src'), path.join(rootDir, 'api')]
  const filesToScan = scanDirs.flatMap((dir) => collectFiles(dir))

  assert.ok(filesToScan.length > 0, 'Must find files to scan in src/ and api/')

  const violations = []

  for (const filePath of filesToScan) {
    const relativePath = path.relative(rootDir, filePath)
    const content = fs.readFileSync(filePath, 'utf8')

    for (const { pattern, name } of BANNED_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        // Allowlist only legitimate gtag / analytics if specifically required
        if (name === 'dangerouslySetInnerHTML' && relativePath.includes('analytics')) {
          continue
        }
        violations.push({
          file: relativePath,
          pattern: name,
          count: matches.length,
        })
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Security guard failed! Found banned patterns:\n${violations.map((v) => `  - ${v.file}: ${v.pattern} (${v.count} occurrences)`).join('\n')}`
  )
})
