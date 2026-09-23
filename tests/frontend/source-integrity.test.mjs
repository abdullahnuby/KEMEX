import test from 'node:test'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')

test('KEMEX source integrity gate', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-source.mjs'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`)
  }
})
