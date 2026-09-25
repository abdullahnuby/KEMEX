import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../../', import.meta.url)
const picker = fs.readFileSync(new URL('src/components/LocationMapPicker.tsx', root), 'utf8')
const trips = fs.readFileSync(new URL('src/pages/TripsPage.tsx', root), 'utf8')
const driver = fs.readFileSync(new URL('src/pages/driver/DriverPortal.tsx', root), 'utf8')

test('trip creation uses an interactive map for pickup and delivery coordinates', () => {
  assert.match(trips, /LocationMapPicker/)
  assert.match(trips, /mapTarget/)
  assert.match(trips, /delivery/)
  assert.match(picker, /openstreetmap\.org/)
  assert.match(picker, /nominatim\.openstreetmap\.org/)
  assert.match(picker, /draggable: true/)
  assert.match(picker, /createPortal\(modal, document\.body\)/)
  assert.match(picker, /location-map-picker-backdrop/)
})

test('driver gets a navigation action from stored trip coordinates', () => {
  assert.match(driver, /google\.com\/maps\/dir/)
  assert.match(driver, /التوجه إلى الموقع/)
  assert.match(driver, /pickup_latitude/)
  assert.match(driver, /delivery_latitude/)
})


test('mobile map picker is above the trip form and constrained to the viewport', () => {
  const css = fs.readFileSync(new URL('src/styles/compact-final.css', root), 'utf8')
  assert.match(css, /\.location-map-picker-backdrop\s*\{[\s\S]*z-index:\s*10000/)
  assert.match(css, /\.location-map-picker-card\s*\{[\s\S]*height:\s*min\(94dvh/)
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.location-map-picker-card\s*\{[\s\S]*height:\s*100dvh/)
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.dashboard-page \.ui-page-title\s*\{[\s\S]*font-size:\s*1\.35rem/)
})
