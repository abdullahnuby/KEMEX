import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Crosshair, LoaderCircle, MapPin, Search, X } from 'lucide-react'

type LatLng = { latitude: number; longitude: number }

type Props = {
  title: string
  value: LatLng | null
  locationText?: string
  onChange: (value: LatLng) => void
  onLocationLabelChange?: (label: string) => void
  onClose: () => void
}

type LeafletLatLng = { lat: number; lng: number }
type LeafletMarker = { setLatLng: (value: LeafletLatLng) => void; bindPopup: (html: string) => LeafletMarker; on: (event: string, handler: (event: { latlng: LeafletLatLng }) => void) => LeafletMarker; addTo: (map: LeafletMap) => LeafletMarker }
type LeafletMap = { setView: (value: [number, number], zoom: number) => LeafletMap; on: (event: string, handler: (event: { latlng: LeafletLatLng }) => void) => LeafletMap; invalidateSize: () => void; remove: () => void }
type LeafletInstance = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  marker: (value: [number, number], options?: Record<string, unknown>) => LeafletMarker
}

type LeafletWindow = Window & { L?: LeafletInstance }

type SearchResult = { display_name: string; lat: string; lon: string }

const DEFAULT_CENTER: [number, number] = [30.0444, 31.2357]
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

let leafletPromise: Promise<LeafletInstance> | null = null

function loadLeaflet() {
  if ((window as LeafletWindow).L) return Promise.resolve((window as LeafletWindow).L as LeafletInstance)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise<LeafletInstance>((resolve, reject) => {
    const existingCss = document.querySelector(`link[href="${LEAFLET_CSS}"]`)
    if (!existingCss) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }
    const existingScript = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as LeafletWindow).L as LeafletInstance), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('تعذر تحميل خريطة اختيار الموقع.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => {
      const leaflet = (window as LeafletWindow).L
      if (leaflet) resolve(leaflet)
      else reject(new Error('تعذر تهيئة خريطة اختيار الموقع.'))
    }
    script.onerror = () => reject(new Error('تعذر تحميل خريطة اختيار الموقع.'))
    document.head.appendChild(script)
  })
  return leafletPromise
}

export function LocationMapPicker({ title, value, locationText, onChange, onLocationLabelChange, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState(locationText ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState('')
  const current = value ? [value.latitude, value.longitude] as [number, number] : DEFAULT_CENTER

  useEffect(() => {
    let cancelled = false
    void loadLeaflet().then(L => {
      if (cancelled || !mapRef.current) return
      const map = L.map(mapRef.current, { zoomControl: true }).setView(current, value ? 16 : 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
      const marker = L.marker(current, { draggable: true }).addTo(map)
      marker.bindPopup(value ? 'الموقع الحالي' : 'اضغط على الخريطة لتحديد الموقع')
      marker.on('dragend', event => { onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }); setError('') })
      markerRef.current = marker
      map.on('click', event => {
        const next = { latitude: event.latlng.lat, longitude: event.latlng.lng }
        marker.setLatLng(event.latlng)
        onChange(next)
        setError('')
      })
      mapInstanceRef.current = map
      setReady(true)
      window.setTimeout(() => map.invalidateSize(), 50)
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل الخريطة.') })
    return () => { cancelled = true; mapInstanceRef.current?.remove(); mapInstanceRef.current = null; markerRef.current = null }
  // Initial map only; the marker itself is updated below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!value || !markerRef.current || !mapInstanceRef.current) return
    markerRef.current.setLatLng({ lat: value.latitude, lng: value.longitude })
    mapInstanceRef.current.setView([value.latitude, value.longitude], Math.max(16, 16))
  }, [value?.latitude, value?.longitude])

  async function searchPlaces() {
    const query = search.trim()
    if (!query) return
    setBusy(true); setError(''); setResults([])
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=ar&q=${encodeURIComponent(query)}`
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('تعذر البحث عن الموقع.')
      const data = await response.json() as SearchResult[]
      if (!data.length) setError('لم يتم العثور على نتائج. جرّب اسمًا أو عنوانًا أوضح.')
      setResults(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر البحث عن الموقع.') }
    finally { setBusy(false) }
  }

  function chooseResult(result: SearchResult) {
    const next = { latitude: Number(result.lat), longitude: Number(result.lon) }
    onChange(next)
    setSearch(result.display_name)
    onLocationLabelChange?.(result.display_name)
    setResults([])
    mapInstanceRef.current?.setView([next.latitude, next.longitude], 17)
    markerRef.current?.setLatLng({ lat: next.latitude, lng: next.longitude })
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError('المتصفح لا يدعم تحديد الموقع الحالي.'); return }
    setBusy(true); setError('')
    navigator.geolocation.getCurrentPosition(position => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      onChange(next)
      mapInstanceRef.current?.setView([next.latitude, next.longitude], 17)
      markerRef.current?.setLatLng({ lat: next.latitude, lng: next.longitude })
      setBusy(false)
    }, () => { setBusy(false); setError('تعذر الوصول إلى موقعك الحالي.') }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 })
  }

  const modal = <div className="location-map-picker-backdrop" dir="rtl">
    <div className="location-map-picker-card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="location-map-picker-head flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div><h2 className="text-base font-black text-slate-900">{title}</h2><p className="mt-0.5 text-[11px] text-slate-500">ابحث عن المكان أو اضغط على الخريطة وحرك العلامة للموقع الدقيق.</p></div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={18}/></button>
      </div>
      <div className="location-map-picker-toolbar border-b border-slate-100 bg-slate-50 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={16} className="shrink-0 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchPlaces()}} className="min-h-11 w-full bg-transparent text-sm outline-none" placeholder="مثال: مخزن العاشر، العاشر من رمضان"/>
          </div>
          <button type="button" onClick={()=>void searchPlaces()} disabled={busy} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">{busy?<LoaderCircle size={16} className="mx-auto animate-spin"/>:'بحث عن الموقع'}</button>
          <button type="button" onClick={useCurrentLocation} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"><Crosshair size={16}/> موقعي الحالي</button>
        </div>
        {results.length>0&&<div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">{results.map(result=><button type="button" key={`${result.lat}-${result.lon}-${result.display_name}`} onClick={()=>chooseResult(result)} className="block w-full border-b border-slate-100 px-3 py-2 text-right text-xs leading-5 text-slate-700 last:border-0 hover:bg-slate-50">{result.display_name}</button>)}</div>}
        {error&&<div role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
      </div>
      <div className="location-map-picker-map-wrap">
        <div ref={mapRef} className="location-map-picker-map" aria-label="خريطة اختيار الموقع"/>
        {!ready&&<div className="absolute inset-0 grid place-items-center bg-white/85"><div className="text-center"><LoaderCircle size={26} className="mx-auto animate-spin text-slate-600"/><p className="mt-2 text-xs font-semibold text-slate-500">جارٍ تحميل الخريطة...</p></div></div>}
      </div>
      <div className="location-map-picker-actions flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 text-xs text-slate-500">{value?<><span className="font-bold text-slate-700">الموقع المختار:</span> {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</>:'لم يتم اختيار موقع بعد.'}</div>
        <div className="flex gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold">إلغاء</button><button type="button" disabled={!value} onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Check size={16}/> تأكيد الموقع</button></div>
      </div>
    </div>
  </div>
  return createPortal(modal, document.body)
}
