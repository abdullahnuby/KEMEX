// اختبارات قاعدة البيانات: تشغّل migrations على PGlite وتبني Fixtures صغيرة مؤقتة داخل الاختبار فقط.
// بيانات Production لا تعتمد على seed files. بدون أي اتصال خارجي.
//   npm run test:db
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase')
const db = new PGlite()
const U = { A:'00000000-0000-0000-0000-00000000000a', M:'00000000-0000-0000-0000-00000000000b', F:'00000000-0000-0000-0000-00000000000c',
            P:'00000000-0000-0000-0000-00000000000d', E:'00000000-0000-0000-0000-00000000000e', T:'00000000-0000-0000-0000-00000000000f',
            C:'00000000-0000-0000-0000-000000000010' }
const ROLE = { A:'admin', M:'mgmt', F:'fleet', P:'pm', E:'eng', T:'maint', C:'acct' }

async function as(k) {
  await db.exec('reset role')
  await db.exec(`select set_config('request.jwt.claim.sub','${k ? U[k] : ''}',false)`)
  if (k) await db.exec('set role authenticated')
}
const rows = async (sql) => (await db.query(sql)).rows
async function attempt(sql) { try { return { ok: true, rows: (await db.query(sql)).rows } } catch (e) { return { ok: false, err: String(e.message) } } }
const setStatus = (id, st) => `update tfms_module_records set payload = jsonb_set(payload,'{status}','"${st}"') where record_id='${id}'`

before(async () => {
  // مكافئ مبسّط لـ Supabase Auth: schema auth + جدول users + auth.uid() من JWT claim
  await db.exec(`
    create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
  const files = fs.readdirSync(path.join(root, 'migrations')).filter(f => f.endsWith('.sql')).sort()
  for (const f of files) await db.exec(fs.readFileSync(path.join(root, 'migrations', f), 'utf8'))
  for (const [k, id] of Object.entries(U)) await db.exec(`insert into auth.users(id,email) values('${id}','${k.toLowerCase()}@x.com')`)
  await db.exec(`
    insert into projects(id,code,name) values('P0','PRJ-TEST','مشروع اختبار');
    insert into assets(id,code,name,category,asset_type) values('A0','AST-TEST','أصل اختبار','مركبات','شاحنة');
    insert into operations(id,asset_id,project_id,operation_date,status) values('OP-SEED','A0','P0',current_date,'مقدمة');
    -- Canonical application storage for the operations module is tfms_module_records.
    -- Keep the legacy operations fixture above only for the explicit legacy-table smoke check.
    insert into tfms_module_records(module_name,record_id,payload) values('operations','OP-SEED-CANON','{"asset":"A0","status":"مقدمة"}');
    insert into tfms_module_records(module_name,record_id,payload) values('oilChanges','OC-SEED','{"asset":"A0"}');
  `)
  for (const [k, id] of Object.entries(U)) await db.exec(`update profiles set role='${ROLE[k]}' where id='${id}'`)
})

test('قاعدة Production تبدأ بدون بيانات تشغيلية خارج Fixtures الاختبار', async () => {
  await as(null)
  const c = Object.fromEntries((await rows(`select 'assets' t,count(*)::int n from assets union all select 'projects',count(*)::int from projects union all select 'operations',count(*)::int from operations`)).map(r => [r.t, r.n]))
  const canonicalOperations = (await rows(`select count(*)::int n from tfms_module_records where module_name='operations'`))[0].n
  assert.deepEqual(c, { assets: 1, projects: 1, operations: 1 })
  assert.equal(canonicalOperations, 1)
})

test('mgmt: قراءة كل شيء وكتابة لا شيء', async () => {
  await as('M')
  assert.ok((await rows(`select count(*)::int n from tfms_module_records where module_name='operations'`))[0].n > 0)
  assert.equal((await attempt(`insert into projects(id,code,name) values('PX','PRJ-X','x')`)).ok, false)
  const upd = await attempt(`update work_orders set status='مكتمل' returning id`)
  assert.ok(!upd.ok || upd.rows.length === 0, 'mgmt لا يعدّل أوامر العمل')
  assert.equal((await attempt(`insert into contracts(id,number,lessor) values('CX','LR-X','x')`)).ok, false)
})

test('eng: لا يعدّل الأصول ولا يفتح أوامر عمل', async () => {
  await as('E')
  await attempt(`update assets set meter=1`)
  assert.equal((await rows(`select count(*)::int n from assets where meter=1`))[0].n, 0)
  assert.equal((await attempt(`insert into work_orders(id,asset_id,work_type,description,opened) values('WOX',(select id from assets limit 1),'x','x',now())`)).ok, false)
})

test('دورة الاعتماد: eng لا يعتمد ولا ينشئ سجلًا معتمدًا؛ pm يعتمد؛ السجل يُكتب من القاعدة', async () => {
  await as('E')
  let r = await attempt(`insert into tfms_module_records(module_name,record_id,payload) values('operations','OPX','{"status":"معتمد"}')`)
  assert.equal(r.ok, false); assert.match(r.err, /الحالة الابتدائية/)
  assert.equal((await attempt(`insert into tfms_module_records(module_name,record_id,payload) values('operations','OP-NEW','{"status":"مقدمة"}')`)).ok, true)
  r = await attempt(setStatus('OP-NEW', 'معتمد')); assert.equal(r.ok, false); assert.match(r.err, /غير مسموح/)
  assert.equal((await attempt(`insert into approval_events(id,module_name,record_id,to_status,acted_by) values('X','operations','OP-NEW','معتمد','${U.E}')`)).ok, false)
  await as('P')
  assert.equal((await attempt(setStatus('OP-NEW', 'معتمد'))).ok, true)
  await as(null)
  const ev = await rows(`select to_status, acted_by from approval_events where record_id='OP-NEW' order by acted_at`)
  assert.equal(ev.length, 2); assert.equal(ev[1].to_status, 'معتمد'); assert.equal(ev[1].acted_by, U.P)
  assert.ok((await rows(`select 1 from audit_log where reference='OP-NEW' and source='db'`)).length >= 2)
})

test('طلبات المعدات: eng يقدّم، pm يعتمد، fleet وحده يخصّص', async () => {
  await as('E')
  await db.exec(`insert into tfms_module_records(module_name,record_id,payload) values('requests','RQ-W','{"status":"مسودة"}')`)
  assert.equal((await attempt(setStatus('RQ-W', 'بانتظار اعتماد مدير المشروع'))).ok, true)
  assert.equal((await attempt(setStatus('RQ-W', 'معتمد من مدير المشروع'))).ok, false)
  await as('P')
  assert.equal((await attempt(setStatus('RQ-W', 'معتمد من مدير المشروع'))).ok, true)
  assert.equal((await attempt(setStatus('RQ-W', 'قيد التنفيذ'))).ok, false)
  await as('F')
  assert.equal((await attempt(setStatus('RQ-W', 'قيد التنفيذ'))).ok, true)
})

test('ترقيم المستندات من الخادم بلا تعارض، والـ upsert يحافظ على الرقم', async () => {
  await as('E')
  const max = (await rows(`select coalesce(max(regexp_replace(payload->>'number','\\D','','g')::bigint),0) m from tfms_module_records where module_name='requests'`))[0].m
  const a = await attempt(`insert into tfms_module_records(module_name,record_id,payload) values('requests','RQ-N1','{"status":"مسودة","number":"REQ-501"}') returning payload->>'number' n`)
  const b = await attempt(`insert into tfms_module_records(module_name,record_id,payload) values('requests','RQ-N2','{"status":"مسودة","number":"REQ-501"}') returning payload->>'number' n`)
  assert.equal(Number(String(a.rows[0].n).replace(/\D/g, '')), Number(max) + 1)
  assert.equal(Number(String(b.rows[0].n).replace(/\D/g, '')), Number(max) + 2)
  const u = await attempt(`insert into tfms_module_records(module_name,record_id,payload) values('requests','RQ-N1','{"status":"مسودة","number":"REQ-999","notes":"edited"}')
     on conflict (module_name,record_id) do update set payload=excluded.payload returning payload->>'number' n, payload->>'notes' t`)
  assert.equal(u.rows[0].n, a.rows[0].n); assert.equal(u.rows[0].t, 'edited')
})

test('الأدوار المالية: acct يقرأ التشغيل والتكاليف ولا يكتب الوقود؛ fleet يكتب الوقود', async () => {
  await as('C')
  assert.ok((await rows(`select count(*)::int n from tfms_module_records where module_name='operations'`))[0].n > 0)
  assert.equal((await rows(`select count(*)::int n from tfms_module_records where module_name='requests'`))[0].n, 0)
  assert.equal((await attempt(`insert into fuel_operations(id,operation_type,operation_date) values('FX','صرف',now())`)).ok, false)
  await as('F')
  assert.equal((await attempt(`insert into fuel_operations(id,operation_type,operation_date) values('FX','صرف',now())`)).ok, true)
})

test('oilChanges / tireOps قابلة للكتابة من الصيانة وللقراءة من المحاسب', async () => {
  await as('T')
  assert.equal((await attempt(`insert into tfms_module_records(module_name,record_id,payload) values('oilChanges','OC-T','{"asset":"A1"}')`)).ok, true)
  await as('C')
  assert.ok((await rows(`select count(*)::int n from tfms_module_records where module_name='oilChanges'`))[0].n >= 1)
})

test('audit_log للإضافة من الخادم فقط ولا يُعدَّل ولا يُحذف حتى من الأدمن', async () => {
  await as('C')
  assert.equal((await attempt(`insert into audit_log(id,action,user_id) values('AUDX','forged','${U.C}')`)).ok, false)
  await as('A')
  await attempt(`update audit_log set details='x'`); await attempt(`delete from audit_log`)
  assert.equal((await rows(`select count(*)::int n from audit_log where details='x'`))[0].n, 0)
  assert.ok((await rows(`select count(*)::int n from audit_log`))[0].n > 0)
})

test('profiles: الأدمن يغيّر دور غيره فقط، وآخر أدمن محمي', async () => {
  await as('A')
  assert.equal((await attempt(`update profiles set role='fleet' where id='${U.E}' returning 1`)).ok, true)
  assert.equal((await attempt(`update profiles set email='hack@x.com' where id='${U.E}'`)).ok, false)
  assert.equal((await attempt(`update profiles set role='eng' where id='${U.A}'`)).ok, false)
  await as('E'); await attempt(`update profiles set role='admin' where id='${U.E}'`)
  assert.notEqual((await rows(`select role from profiles where id='${U.E}'`))[0].role, 'admin')
  await as(null)
  const r = await attempt(`update profiles set active=false where id='${U.A}'`)
  assert.equal(r.ok, false); assert.match(r.err, /آخر مدير/)
})

test('migration 008 قابلة لإعادة التشغيل (idempotent)', async () => {
  await as(null)
  await db.exec(fs.readFileSync(path.join(root, 'migrations/008_security_and_integrity.sql'), 'utf8'))
})
