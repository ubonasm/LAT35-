// Copies the kuromoji browser bundle and IPADIC dictionary from node_modules into
// public/ so the browser can fetch them. They are generated (not committed) to keep
// the project archive small; runs on install, dev, and build.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))

let pkgDir
try {
  pkgDir = dirname(require.resolve('kuromoji/package.json'))
} catch {
  console.warn('[copy-kuromoji] kuromoji is not installed yet; skipping.')
  process.exit(0)
}

const outDir = join(root, 'public', 'kuromoji')
const outDict = join(outDir, 'dict')

if (existsSync(join(outDict, 'base.dat.gz')) && existsSync(join(outDir, 'kuromoji.js'))) {
  process.exit(0)
}

mkdirSync(outDict, { recursive: true })
cpSync(join(pkgDir, 'build', 'kuromoji.js'), join(outDir, 'kuromoji.js'))
cpSync(join(pkgDir, 'dict'), outDict, { recursive: true })
console.log('[copy-kuromoji] Dictionary copied to public/kuromoji/')
