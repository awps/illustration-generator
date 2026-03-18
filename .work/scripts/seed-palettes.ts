/**
 * Seed palettes from palettes.json into D1 via wrangler d1 execute.
 *
 * Usage:
 *   npx tsx .work/scripts/seed-palettes.ts          # local
 *   npx tsx .work/scripts/seed-palettes.ts --remote  # production
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const remote = process.argv.includes('--remote')
const flag = remote ? '--remote' : '--local --persist-to ../../.local-data'

const palettesPath = join(__dirname, '../../apps/api/src/palettes.json')
const data = JSON.parse(readFileSync(palettesPath, 'utf-8'))
const palettes = data.palletes as Record<string, {
  colors: string[]
  totalColors: number
  predominantColor: string
  style: string
  topic: string
}>

const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const entries = Object.entries(palettes).slice(0, limit)
console.log(`Seeding ${entries.length} palettes (${remote ? 'remote' : 'local'})...`)

// Build SQL in batches of 50 to avoid command-line length limits
const BATCH_SIZE = 50
let inserted = 0

for (let i = 0; i < entries.length; i += BATCH_SIZE) {
  const batch = entries.slice(i, i + BATCH_SIZE)
  const values = batch.map(([id, p]) => {
    const colors = JSON.stringify(p.colors).replace(/'/g, "''")
    const predominantColor = p.predominantColor.replace(/'/g, "''")
    const style = p.style.replace(/'/g, "''")
    const topic = p.topic.replace(/'/g, "''")
    return `('${id}', '${colors}', ${p.totalColors}, '${predominantColor}', '${style}', '${topic}')`
  }).join(',\n')

  const sql = `INSERT OR IGNORE INTO palettes (id, colors, total_colors, predominant_color, style, topic) VALUES\n${values};`

  const tmpFile = join(__dirname, `_seed_batch_${i}.sql`)
  writeFileSync(tmpFile, sql)

  try {
    execSync(
      `npx wrangler d1 execute illustragen-platform ${flag} --file="${tmpFile}"`,
      { cwd: join(__dirname, '../../apps/api'), stdio: 'pipe' }
    )
    inserted += batch.length
    process.stdout.write(`\r  ${inserted}/${entries.length}`)
  } catch (err: any) {
    console.error(`\nBatch ${i} failed:`, err.stderr?.toString() || err.message)
  }

  // Clean up temp file
  try { execSync(`rm "${tmpFile}"`) } catch {}
}

console.log(`\nDone. Inserted ${inserted} palettes.`)