import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase'
)

const db = new PGlite()

const U = {
  A: '00000000-0000-0000-0000-0000000000a1',
  F: '00000000-0000-0000-0000-0000000000f1',
  P: '00000000-0000-0000-0000-0000000000b1',
  D1: '00000000-0000-0000-0000-0000000000d1',
  D2: '00000000-0000-0000-0000-0000000000d2',
}

const as = async (k) => {
  await db.exec('reset role')

  await db.exec(
    `select set_config(
      'request.jwt.claim.sub',
      '${k ? U[k] : ''}',
      false
    )`
  )

  if (k) {
    await db.exec('set role authenticated')
  }
}

const rows = async (sql) => (
  await db.query(sql)
).rows

const attempt = async (sql) => {
  try {
    return {
      ok: true,
      rows: (
        await db.query(sql)
      ).rows,
    }
  } catch (e) {
    return {
      ok: false,
      err: String(e.message),
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
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const f of files) {
    await db.exec(
      fs.readFileSync(
        path.join(root, 'migrations', f),
        'utf8'
      )
    )
  }

  for (const id of Object.values(U)) {
    await db.exec(`
      insert into auth.users(id, email)
      values(
        '${id}',
        '${id}@x.com'
      )
    `)
  }

  await db.exec(`
    insert into drivers(
      id,
      code,
      name,
      phone
    )
    values
      (
        'D1',
        'DRV-1',
        'Driver One',
        '01000000001'
      ),
      (
        'D2',
        'DRV-2',
        'Driver Two',
        '01000000002'
      );

    update profiles
    set role='admin'
    where id='${U.A}';

    update profiles
    set role='fleet'
    where id='${U.F}';

    update profiles
    set role='pm'
    where id='${U.P}';

    update profiles
    set
      role='driver',
      driver_id='D1'
    where id='${U.D1}';

    update profiles
    set
      role='driver',
      driver_id='D2'
    where id='${U.D2}';

    insert into assets(
      id,
      code,
      name,
      category,
      asset_type,
      plate_number
    )
    values
      (
        'TRK1',
        'TRK-1',
        'Truck 1',
        'مركبات',
        'شاحنة',
        'ABC-123'
      ),
      (
        'TRL1',
        'TRL-1',
        'Trailer 1',
        'مركبات',
        'مقطورة',
        'TRL-123'
      );

    insert into organization_settings(
      id,
      trip_geofence_radius_m
    )
    values(
      true,
      100
    )
    on conflict (id)
    do update
    set trip_geofence_radius_m =
      excluded.trip_geofence_radius_m;

    insert into trips(
      id,
      trip_number,
      trip_type,
      status,
      driver_id,
      truck_asset_id,
      trailer_asset_id,
      scheduled_start,
      scheduled_end,
      from_location,
      to_location,
      cargo_description,
      cargo_quantity,
      cargo_unit,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude
    )
    values
      (
        '10000000-0000-0000-0000-000000000001',
        'TR-D1',
        'cargo',
        'assigned',
        'D1',
        'TRK1',
        'TRL1',
        now(),
        now() + interval '2 hours',
        'Pickup 1 - Address 1',
        'Delivery 1 - Address 2',
        'Test cargo',
        10,
        'طن',
        30.0000,
        31.0000,
        30.0010,
        31.0010
      ),
      (
        '10000000-0000-0000-0000-000000000002',
        'TR-D2',
        'cargo',
        'assigned',
        'D2',
        'TRK1',
        'TRL1',
        now(),
        now() + interval '2 hours',
        'Pickup 2 - Address 1',
        'Delivery 2 - Address 2',
        'Test cargo 2',
        20,
        'طن',
        30.0000,
        31.0000,
        30.0010,
        31.0010
      );
  `)
})

test(
  'driver isolation and no reject/direct completion',
  async () => {
    await as('D1')

    assert.equal(
      (
        await rows(`
          select count(*)::int n
          from trips
        `)
      )[0].n,
      1
    )

    assert.equal(
      (
        await rows(`
          select count(*)::int n
          from trips
          where id='10000000-0000-0000-0000-000000000002'
        `)
      )[0].n,
      0
    )

    const direct = await attempt(`
      update trips
      set execution_status='completed'
      where id='10000000-0000-0000-0000-000000000001'
      returning id
    `)

    assert.ok(
      !direct.ok ||
      direct.rows.length === 0
    )

    const rejected = await attempt(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'cancelled'
      )
    `)

    assert.equal(
      rejected.ok,
      false
    )

    const jump = await attempt(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'completed'
      )
    `)

    assert.equal(
      jump.ok,
      false
    )
  }
)

test(
  'normal pickup progression enforces geofence and receipt',
  async () => {
    await as('D1')

    await db.exec(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'to_pickup'
      )
    `)

    const outside = await attempt(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'arrived_pickup',
        30.01,
        31.01
      )
    `)

    assert.equal(
      outside.ok,
      false
    )

    await db.exec(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'arrived_pickup',
        30.000001,
        31.000001
      )
    `)

    const noReceipt = await attempt(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'pickup_confirmed',
        30.000001,
        31.000001
      )
    `)

    assert.equal(
      noReceipt.ok,
      false
    )

    await db.exec(`
      insert into attachment_metadata(
        id,
        entity_type,
        entity_id,
        file_name,
        storage_path,
        content_type,
        byte_size,
        uploaded_by
      )
      values(
        '20000000-0000-0000-0000-000000000001',
        'trip_receipt',
        '10000000-0000-0000-0000-000000000001',
        'pickup.jpg',
        'trip_receipt/10000000-0000-0000-0000-000000000001/pickup.jpg',
        'image/jpeg',
        10,
        '${U.D1}'
      );

      insert into trip_receipts(
        id,
        trip_id,
        receipt_type,
        attachment_id,
        uploaded_by,
        latitude,
        longitude
      )
      values(
        '30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'PICKUP_RECEIPT',
        '20000000-0000-0000-0000-000000000001',
        '${U.D1}',
        30.000001,
        31.000001
      );

      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'pickup_confirmed',
        30.000001,
        31.000001,
        '30000000-0000-0000-0000-000000000001'
      );
    `)

    const t = (
      await rows(`
        select
          status,
          execution_status
        from trips
        where id='10000000-0000-0000-0000-000000000001'
      `)
    )[0]

    assert.equal(
      t.status,
      'in_transit'
    )

    assert.equal(
      t.execution_status,
      'pickup_confirmed'
    )

    const receipt = (
      await rows(`
        select distance_meters
        from trip_receipts
        where id='30000000-0000-0000-0000-000000000001'
      `)
    )[0]

    assert.ok(
      Number(receipt.distance_meters) <= 1
    )
  }
)

test(
  'exceptions do not reset trip and are preserved in timeline',
  async () => {
    await as('D1')

    const ex = await db.query(`
      select *
      from public.driver_report_trip_exception(
        '10000000-0000-0000-0000-000000000001',
        'BREAKDOWN',
        'engine',
        null,
        'Engine warning'
      )
    `)

    assert.equal(
      ex.rows[0].priority,
      'high'
    )

    assert.equal(
      (
        await rows(`
          select
            execution_status,
            exception_status
          from trips
          where id='10000000-0000-0000-0000-000000000001'
        `)
      )[0].execution_status,
      'pickup_confirmed'
    )

    assert.equal(
      (
        await rows(`
          select count(*)::int n
          from trip_execution_events
          where trip_id='10000000-0000-0000-0000-000000000001'
            and event_type='BREAKDOWN'
        `)
      )[0].n,
      1
    )

    await db.exec(`
      select *
      from public.driver_clear_exception(
        '10000000-0000-0000-0000-000000000001',
        'تمت المعالجة'
      )
    `)

    assert.equal(
      (
        await rows(`
          select exception_status
          from trips
          where id='10000000-0000-0000-0000-000000000001'
        `)
      )[0].exception_status,
      null
    )

    assert.equal(
      (
        await rows(`
          select count(*)::int n
          from trip_execution_events
          where trip_id='10000000-0000-0000-0000-000000000001'
            and event_type='PROBLEM_RESOLVED'
        `)
      )[0].n,
      1
    )
  }
)

test(
  'event stream is immutable to driver and own history remains isolated',
  async () => {
    await as('D1')

    const ev = (
      await rows(`
        select count(*)::int n
        from trip_execution_events
      `)
    )[0].n

    const upd = await attempt(`
      update trip_execution_events
      set notes='tampered'
      where trip_id='10000000-0000-0000-0000-000000000001'
    `)

    assert.equal(
      upd.ok,
      false
    )

    const other = await rows(`
      select count(*)::int n
      from trip_execution_events
      where trip_id='10000000-0000-0000-0000-000000000002'
    `)

    assert.equal(
      other[0].n,
      0
    )

    assert.ok(
      ev > 0
    )
  }
)

test(
  'operations can see driver events and driver cannot override geofence',
  async () => {
    await as('D1')

    const override = await attempt(`
      select *
      from public.override_trip_geofence(
        '10000000-0000-0000-0000-000000000001',
        'arrived_pickup',
        'no'
      )
    `)

    assert.equal(
      override.ok,
      false
    )

    await db.exec(`
      select *
      from public.driver_trip_transition(
        '10000000-0000-0000-0000-000000000001',
        'in_transit'
      )
    `)

    await as('F')

    const e = (
      await db.query(`
        select *
        from public.override_trip_geofence(
          '10000000-0000-0000-0000-000000000001',
          'arrived_delivery',
          'approved manual review',
          30.01,
          31.01
        )
      `)
    ).rows[0]

    assert.equal(
      e.event_type,
      'MANUAL_GEOFENCE_OVERRIDE'
    )

    assert.equal(
      (
        await rows(`
          select count(*)::int n
          from trip_execution_events
          where event_type='MANUAL_GEOFENCE_OVERRIDE'
        `)
      )[0].n >= 1,
      true
    )
  }
)
