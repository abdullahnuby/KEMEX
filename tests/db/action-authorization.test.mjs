import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase')
const db = new PGlite()
const U = { A:'00000000-0000-0000-0000-00000000000a', F:'00000000-0000-0000-0000-00000000000c', P:'00000000-0000-0000-0000-00000000000d', T:'00000000-0000-0000-0000-00000000000f', C:'00000000-0000-0000-0000-000000000010' }
const ROLE = { A:'admin', F:'fleet', P:'pm', T:'maint', C:'acct' }
async function as(k){ await db.exec('reset role'); await db.exec(`select set_config('request.jwt.claim.sub','${k ? U[k] : ''}',false)`); if(k) await db.exec('set role authenticated') }
async function attempt(sql){try{return {ok:true,rows:(await db.query(sql)).rows}}catch(e){return {ok:false,err:String(e.message)}}}

before(async()=>{
  await db.exec(`create role authenticated; create role anon; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
  for(const f of fs.readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(root,'migrations',f),'utf8'))
  for(const [k,id] of Object.entries(U)) await db.exec(`insert into auth.users(id,email) values('${id}','${k}@x.com')`)
  for(const [k,id] of Object.entries(U)) await db.exec(`update profiles set role='${ROLE[k]}' where id='${id}'`)
  await db.exec(`insert into projects(id,code,name) values('P-A','PA','P'); insert into assets(id,code,name,category,asset_type) values('A-A','AA','A','مركبات','شاحنة'); insert into drivers(id,code,name) values('D-A','DA','D'); insert into work_orders(id,asset_id,work_type,description,opened,status) values('WO-A','A-A','تصحيحية','x',current_date,'مفتوح'); insert into trips(id,trip_type,truck_asset_id,driver_id,cargo_description,status) values('00000000-0000-0000-0000-000000000001','cargo','A-A','D-A','x','received');`)
})

test('maintenance transition: maint/fleet allowed; acct denied', async()=>{
 await as('C'); assert.equal((await attempt(`update work_orders set status='مكتمل' where id='WO-A'`)).ok,false)
 await as('T'); assert.equal((await attempt(`update work_orders set status='مكتمل' where id='WO-A'`)).ok,true)
})

test('trip invoicing/payment actions are role-bound', async()=>{
 await as('F'); assert.equal((await attempt(`update trips set status='invoiced',invoice_id='INV-1' where id='00000000-0000-0000-0000-000000000001'`)).ok,true)
 await as('F'); assert.equal((await attempt(`update trips set status='paid' where id='00000000-0000-0000-0000-000000000001'`)).ok,false)
 await as('C'); assert.equal((await attempt(`update trips set status='paid' where id='00000000-0000-0000-0000-000000000001'`)).ok,true)
})
