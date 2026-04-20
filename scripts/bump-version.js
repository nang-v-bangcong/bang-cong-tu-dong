#!/usr/bin/env node
/**
 * Bump version across 3 sync files: version.ts, wails.json, versioninfo.json.
 * Usage: node scripts/bump-version.js [--patch|--minor|--major]
 */
const fs = require('fs')
const path = require('path')

function bump(current, type) {
  const parts = current.split('.').map(Number)
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) {
    throw new Error(`invalid semver: ${current}`)
  }
  const [maj, min, pat] = parts
  if (type === 'major') return `${maj + 1}.0.0`
  if (type === 'minor') return `${maj}.${min + 1}.0`
  if (type === 'patch') return `${maj}.${min}.${pat + 1}`
  throw new Error(`unknown bump type: ${type}`)
}

function main() {
  const argRaw = process.argv[2]
  const type = argRaw ? argRaw.replace(/^--/, '') : 'patch'

  const root = path.resolve(__dirname, '..')
  const versionFile = path.join(root, 'frontend', 'src', 'constants', 'version.ts')
  const wailsFile = path.join(root, 'wails.json')
  const viFile = path.join(root, 'versioninfo.json')

  // 1. version.ts
  const versionSrc = fs.readFileSync(versionFile, 'utf8')
  const match = versionSrc.match(/CURRENT_VERSION\s*=\s*['"]([\d.]+)['"]/)
  if (!match) {
    console.error('ERROR: CURRENT_VERSION const not found in version.ts')
    process.exit(1)
  }
  const current = match[1]
  const next = bump(current, type)

  const newVersionSrc = versionSrc.replace(
    match[0],
    match[0].replace(current, next)
  )
  fs.writeFileSync(versionFile, newVersionSrc)

  // 2. wails.json
  const wails = JSON.parse(fs.readFileSync(wailsFile, 'utf8'))
  wails.info.productVersion = next
  fs.writeFileSync(wailsFile, JSON.stringify(wails, null, 2) + '\n')

  // 3. versioninfo.json
  const vi = JSON.parse(fs.readFileSync(viFile, 'utf8'))
  const [maj, min, pat] = next.split('.').map(Number)
  const fv = { Major: maj, Minor: min, Patch: pat, Build: 0 }
  vi.FixedFileInfo.FileVersion = fv
  vi.FixedFileInfo.ProductVersion = { ...fv }
  const dotted = `${maj}.${min}.${pat}.0`
  if (vi.StringFileInfo) {
    vi.StringFileInfo.FileVersion = dotted
    vi.StringFileInfo.ProductVersion = dotted
  }
  fs.writeFileSync(viFile, JSON.stringify(vi, null, 2) + '\n')

  console.log(`v${current} -> v${next} (3 files updated)`)
}

try {
  main()
} catch (err) {
  console.error('ERROR:', err.message)
  process.exit(1)
}
