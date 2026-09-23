import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const app=fs.readFileSync(path.join(root,'src/config/app.ts'),'utf8')

test('central capability matrix covers every supported role',()=>{
 for(const role of ['admin','mgmt','fleet','pm','eng','maint','acct']) assert.match(app,new RegExp(`\\b${role}\\b`))
 assert.match(app,/canViewModule/); assert.match(app,/canWriteModule/); assert.match(app,/canDeleteModule/); assert.match(app,/canApproveModule/); assert.match(app,/canExportModule/)
})

test('sensitive page checks do not bypass central capability helpers',()=>{
 const users=fs.readFileSync(path.join(root,'src/pages/UsersPage.tsx'),'utf8')
 const settings=fs.readFileSync(path.join(root,'src/pages/SettingsPage.tsx'),'utf8')
 assert.doesNotMatch(users,/user\.role===['"]admin['"]\s*\|\|\s*user\.role===['"]mgmt['"]/) 
 assert.doesNotMatch(settings,/user\.role===['"]admin['"]/) 
})
