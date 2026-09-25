import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase',
)

const db = new PGlite()

const U = {
  F: '00000000-0000-0000-0000-0000000000f1',
  C: '00000000-0000-0000-0000-0000000000c1',
}

async function as(k) {
  await db.exec('reset role')
  await db.exec(`
    select set_config(
      'request.jwt.claim.sub',
      '${k ? U[k] : ''}',
      false
    )
  `)
  if (k) await db.exec('set role authenticated')
}

async function attempt(sql) {
  try {
    return {
      ok: true,
      rows: (await db.query(sql)).rows,
    }
  } catch (error) {
    return {
      ok: false,
      rows: [],
      error: String(error.message),
    }
  }
}

before(async () => {
  await db.exec(`
    create role authenticated;
    create role anon;
    create schema auth;

    create table auth.users(
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb default '{}'::jsonb
    );

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(
        current_setting('request.jwt.claim.sub', true),
        ''
      )::uuid
    $$;

    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `)

  const files = fs
    .readdirSync(path.join(root, 'migrations'))
    .filter(file => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    await db.exec(
      fs.readFileSync(
        path.join(root, 'migrations', file),
        'utf8',
      ),
    )
  }

  await db.exec(`
    insert into auth.users(id,email)
    values
      ('${U.F}','F@x.com'),
      ('${U.C}','C@x.com');

    update profiles
    set role='fleet'
    where id='${U.F}';

    update profiles
    set role='acct'
    where id='${U.C}';

    insert into assets(
      id,
      code,
      name,
      category,
      asset_type
    )
    values(
      'GPS-A',
      'GPS-1',
      'GPS Truck 1',
      'مركبات',
      'شاحنة'
    );
  `)
})

test('GPS monitor roles can read telemetry but cannot forge positions', async () => {
  await as('F')

  const insertDenied = await attempt(`
    insert into vehicle_gps_positions(
      asset_id,
      latitude,
      longitude,
      recorded_at
    )
    values(
      'GPS-A',
      30,
      31,
      now()
    )
  `)

  assert.equal(insertDenied.ok, false)
})

test('fleet can register a device while accounting cannot', async () => {
  await as('F')

  const created = await db.query(`
    insert into vehicle_gps_devices(
      asset_id,
      provider,
      external_device_id
    )
    values(
      'GPS-A',
      'generic',
      'IMEI-TEST-1'
    )
    returning id
  `)

  assert.equal(created.rows.length, 1)

  await as('C')

  const denied = await attempt(`
    insert into vehicle_gps_devices(
      asset_id,
      provider,
      external_device_id
    )
    values(
      'GPS-A',
      'generic',
      'IMEI-TEST-2'
    )
  `)

  assert.equal(denied.ok, false)
})

test('latest position view exposes one latest row per asset to operations', async () => {
  await as('')

  await db.exec(`
    insert into vehicle_gps_positions(
      asset_id,
      latitude,
      longitude,
      recorded_at
    )
    values(
      'GPS-A',
      30.000000,
      31.000000,
      now() - interval '5 minutes'
    ),
    (
      'GPS-A',
      30.001000,
      31.001000,
      now()
    );
  `)

  await as('F')

  const result = await db.query(`
    select
      asset_id,
      latitude,
      longitude
    from vehicle_latest_gps_positions
    where asset_id='GPS-A'
  `)

  assert.equal(result.rows.length, 1)
  assert.equal(Number(result.rows[0].latitude), 30.001)
  assert.equal(Number(result.rows[0].longitude), 31.001)
})
