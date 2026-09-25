#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const WORK_ROOT = path.join(ROOT, '.kemex-backup')
const RUN_ID = randomUUID()
const CREATED_AT = new Date()
const CREATED_AT_ISO = CREATED_AT.toISOString()
const VERSION = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8')).version
const GIT_SHA = process.env.GITHUB_SHA || 'local'
const KIND = process.env.KEMEX_BACKUP_KIND || 'scheduled'
const LOCK_DAYS = Number(process.env.KEMEX_B2_OBJECT_LOCK_DAYS || '30')
const STORAGE_BUCKET = process.env.KEMEX_STORAGE_BUCKET || 'kemex-attachments'

const required = [
  'KEMEX_SUPABASE_DB_URL',
  'KEMEX_STORAGE_S3_ENDPOINT',
  'KEMEX_STORAGE_S3_REGION',
  'KEMEX_STORAGE_S3_ACCESS_KEY_ID',
  'KEMEX_STORAGE_S3_SECRET_ACCESS_KEY',
  'KEMEX_B2_ENDPOINT',
  'KEMEX_B2_REGION',
  'KEMEX_B2_BUCKET',
  'KEMEX_B2_KEY_ID',
  'KEMEX_B2_APPLICATION_KEY',
  'KEMEX_BACKUP_AGE_RECIPIENT',
]

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required backup secret: ${name}`)
}

if (!['scheduled', 'pre_release', 'manual'].includes(KIND)) {
  throw new Error(`Unsupported KEMEX_BACKUP_KIND: ${KIND}`)
}

if (!Number.isInteger(LOCK_DAYS) || LOCK_DAYS < 1 || LOCK_DAYS > 3000) {
  throw new Error('KEMEX_B2_OBJECT_LOCK_DAYS must be an integer between 1 and 3000.')
}

const safe = value => value.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
const timestamp = CREATED_AT_ISO.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const commit = safe(GIT_SHA.slice(0, 12))
const release = safe(`v${VERSION}`)
const suffix = `${release}-${commit}-${timestamp}-${RUN_ID}`
const root = path.join(WORK_ROOT, RUN_ID)
const payload = path.join(root, 'payload')
const databaseDir = path.join(payload, 'database')
const authDir = path.join(payload, 'auth')
const storageDir = path.join(payload, 'storage', 'files')
const infrastructureDir = path.join(payload, 'infrastructure')

const encrypted = path.join(WORK_ROOT, `kemex-${suffix}.tar.gz.age`)
const archive = path.join(WORK_ROOT, `kemex-${suffix}.tar.gz`)
const manifest = path.join(WORK_ROOT, `kemex-${suffix}.manifest.json`)
const checksums = path.join(WORK_ROOT, `kemex-${suffix}.checksums.sha256`)

await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(databaseDir, { recursive: true })
await fs.mkdir(authDir, { recursive: true })
await fs.mkdir(storageDir, { recursive: true })
await fs.mkdir(infrastructureDir, { recursive: true })
await fs.mkdir(path.dirname(encrypted), { recursive: true })

function run(command, args, env = process.env) {
  const safeArgs = args.map(arg => {
    const dbUrl = env.KEMEX_SUPABASE_DB_URL || process.env.KEMEX_SUPABASE_DB_URL
    return dbUrl && arg.includes(dbUrl) ? '<redacted-db-url>' : arg
  })
  console.log(`$ ${command} ${safeArgs.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: false,
  })
  if (result.status !== 0) throw new Error(`Command failed (${result.status}): ${command}`)
}

function capture(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: false,
  })
  if (result.status !== 0) throw new Error(`Command failed: ${command} ${result.stderr}`)
  return result.stdout.trim()
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function listFiles(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const output = []
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) output.push(...await listFiles(absolute, base))
    else output.push(path.relative(base, absolute).replaceAll('\\', '/'))
  }
  return output.sort()
}

async function lockObject(key) {
  const retainUntil = new Date(Date.now() + LOCK_DAYS * 86400000).toISOString()
  run('aws', [
    's3api', 'put-object-retention',
    '--bucket', process.env.KEMEX_B2_BUCKET,
    '--key', key,
    '--endpoint-url', process.env.KEMEX_B2_ENDPOINT,
    '--region', process.env.KEMEX_B2_REGION,
    '--retention', `Mode=GOVERNANCE,RetainUntilDate=${retainUntil}`,
  ], {
    ...process.env,
    AWS_ACCESS_KEY_ID: process.env.KEMEX_B2_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.KEMEX_B2_APPLICATION_KEY,
  })
}

try {
  console.log(`KEMEX Data Protection backup started: ${KIND}`)

  const db = process.env.KEMEX_SUPABASE_DB_URL
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(databaseDir, 'roles.sql'), '--role-only'])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(databaseDir, 'schema.sql')])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(databaseDir, 'data.sql'), '--data-only', '--use-copy'])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(databaseDir, 'migration-history-schema.sql'), '--schema', 'supabase_migrations'])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(databaseDir, 'migration-history-data.sql'), '--schema', 'supabase_migrations', '--data-only', '--use-copy'])

  // Managed schemas are explicitly captured because the default Supabase dump excludes them.
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(authDir, 'schema.sql'), '--schema', 'auth'])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(authDir, 'data.sql'), '--schema', 'auth', '--data-only', '--use-copy'])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(payload, 'storage', 'schema.sql'), '--schema', 'storage'])
  run('supabase', ['db', 'dump', '--db-url', db, '-f', path.join(payload, 'storage', 'data.sql'), '--schema', 'storage', '--data-only', '--use-copy', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes'])

  // Binary files are independent of PostgreSQL and require Supabase S3 credentials.
  run('aws', [
    's3', 'sync',
    `s3://${STORAGE_BUCKET}`,
    storageDir,
    '--endpoint-url', process.env.KEMEX_STORAGE_S3_ENDPOINT,
    '--region', process.env.KEMEX_STORAGE_S3_REGION,
    '--only-show-errors',
  ], {
    ...process.env,
    AWS_ACCESS_KEY_ID: process.env.KEMEX_STORAGE_S3_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.KEMEX_STORAGE_S3_SECRET_ACCESS_KEY,
  })

  await fs.cp(path.join(ROOT, 'supabase', 'migrations'), path.join(infrastructureDir, 'migrations'), { recursive: true })
  await fs.cp(path.join(ROOT, 'supabase', 'functions'), path.join(infrastructureDir, 'functions'), { recursive: true })
  await fs.copyFile(path.join(ROOT, 'scripts', 'verify-migrations.mjs'), path.join(infrastructureDir, 'verify-migrations.mjs'))

  const files = await listFiles(payload)
  const entries = []
  for (const relative of files) {
    const absolute = path.join(payload, relative)
    const stat = await fs.stat(absolute)
    entries.push({ path: relative, bytes: stat.size, sha256: await sha256(absolute) })
  }

  const manifestObject = {
    backup_id: RUN_ID,
    system: 'KEMEX',
    environment: 'production',
    backup_kind: KIND,
    captured_at: CREATED_AT_ISO,
    application_version: VERSION,
    git_sha: GIT_SHA,
    storage_bucket: STORAGE_BUCKET,
    object_lock_days: LOCK_DAYS,
    database: {
      roles: true,
      public_schema: true,
      public_data: true,
      auth_schema: true,
      auth_data: true,
      storage_metadata_schema: true,
      storage_metadata_data: true,
      migration_history_schema: true,
      migration_history_data: true,
    },
    storage_files: true,
    infrastructure: { migrations: true, edge_functions: true },
    files: entries,
  }

  await fs.writeFile(path.join(payload, 'manifest.json'), JSON.stringify(manifestObject, null, 2) + '\n', 'utf8')
  const payloadChecksums = entries.map(entry => `${entry.sha256}  ${entry.path}`).join('\n') + '\n'
  await fs.writeFile(path.join(payload, 'checksums.sha256'), payloadChecksums, 'utf8')
  await fs.writeFile(manifest, JSON.stringify(manifestObject, null, 2) + '\n', 'utf8')
  await fs.writeFile(checksums, payloadChecksums, 'utf8')

  run('tar', ['-C', root, '-czf', archive, 'payload'])

  const recipients = process.env.KEMEX_BACKUP_AGE_RECIPIENT.split(/[\s,]+/).filter(Boolean)
  const ageArgs = []
  for (const recipient of recipients) ageArgs.push('-r', recipient)
  ageArgs.push('-o', encrypted, archive)
  run('age', ageArgs)

  const encryptedHash = await sha256(encrypted)
  const encryptedStat = await fs.stat(encrypted)
  const datePath = CREATED_AT_ISO.slice(0, 10)
  const encryptedName = path.basename(encrypted)
  const pathsToUpload = KIND === 'scheduled'
    ? [
        `daily/${datePath}/${encryptedName}`,
        ...(CREATED_AT.getUTCDay() === 0 ? [`weekly/${datePath}/${encryptedName}`] : []),
        ...(CREATED_AT.getUTCDate() === 1 ? [`monthly/${datePath}/${encryptedName}`] : []),
      ]
    : [`${KIND}/${datePath}/${encryptedName}`]

  const b2Env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: process.env.KEMEX_B2_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.KEMEX_B2_APPLICATION_KEY,
  }

  for (const key of pathsToUpload) {
    run('aws', ['s3', 'cp', encrypted, `s3://${process.env.KEMEX_B2_BUCKET}/${key}`, '--endpoint-url', process.env.KEMEX_B2_ENDPOINT, '--region', process.env.KEMEX_B2_REGION, '--only-show-errors'], b2Env)
    await lockObject(key)
    const head = JSON.parse(capture('aws', ['s3api', 'head-object', '--bucket', process.env.KEMEX_B2_BUCKET, '--key', key, '--endpoint-url', process.env.KEMEX_B2_ENDPOINT, '--region', process.env.KEMEX_B2_REGION], b2Env))
    if (Number(head.ContentLength) !== encryptedStat.size) throw new Error(`B2 verification failed for ${key}: size mismatch`)
  }

  const primaryKey = pathsToUpload[0]
  const companionKeys = [
    [manifest, primaryKey.replace(/\.tar\.gz\.age$/, '.manifest.json')],
    [checksums, primaryKey.replace(/\.tar\.gz\.age$/, '.checksums.sha256')],
  ]

  for (const [local, key] of companionKeys) {
    run('aws', ['s3', 'cp', local, `s3://${process.env.KEMEX_B2_BUCKET}/${key}`, '--endpoint-url', process.env.KEMEX_B2_ENDPOINT, '--region', process.env.KEMEX_B2_REGION, '--only-show-errors'], b2Env)
    await lockObject(key)
  }

  try {
    const providerReference = pathsToUpload.join(',')
    const notes = `Automated off-site backup; object locked for ${LOCK_DAYS} days; sha256=${encryptedHash}`
    run('psql', [
      process.env.KEMEX_SUPABASE_DB_URL,
      '-v', 'ON_ERROR_STOP=1',
      '-v', `backup_kind=${KIND}`,
      '-v', `provider_ref=${providerReference}`,
      '-v', `notes=${notes}`,
      '-c',
      "INSERT INTO public.backup_registry(environment, backup_kind, provider_reference, captured_at, verified_at, status, notes) VALUES ('production', :'backup_kind', :'provider_ref', now(), now(), 'verified', :'notes');",
    ])
  } catch (error) {
    console.warn(`Warning: backup registry update skipped: ${error instanceof Error ? error.message : String(error)}`)
  }

  console.log(JSON.stringify({
    status: 'verified',
    backup_id: RUN_ID,
    backup_kind: KIND,
    application_version: VERSION,
    git_sha: GIT_SHA,
    encrypted_sha256: encryptedHash,
    uploaded_objects: pathsToUpload,
  }, null, 2))
} finally {
  await fs.rm(root, { recursive: true, force: true })
  await Promise.all([archive, encrypted, manifest, checksums].map(file => fs.rm(file, { force: true }).catch(() => {})))
}
