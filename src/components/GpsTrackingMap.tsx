import { useEffect, useRef, useState } from 'react'

type MarkerPoint = {
  id: string
  name: string
  code?: string | null
  latitude: number
  longitude: number
  speed?: number | null
  status?: string | null
  selected?: boolean
}

type TrackPoint = {
  latitude: number
  longitude: number
}

type LeafletMarker = {
  bindPopup: (html: string) => LeafletMarker
  addTo: (map: LeafletMap) => LeafletMarker
  remove: () => void
}

type LeafletCircle = {
  addTo: (map: LeafletMap) => LeafletCircle
  remove: () => void
}

type LeafletPolyline = {
  addTo: (map: LeafletMap) => LeafletPolyline
  remove: () => void
}

type LeafletMap = {
  setView: (value: [number, number], zoom: number) => LeafletMap
  fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => LeafletMap
  invalidateSize: () => void
  remove: () => void
}

type LeafletInstance = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  circleMarker: (value: [number, number], options?: Record<string, unknown>) => LeafletMarker
  circle: (value: [number, number], options?: Record<string, unknown>) => LeafletCircle
  polyline: (points: [number, number][], options?: Record<string, unknown>) => LeafletPolyline
}

type LeafletWindow = Window & { L?: LeafletInstance }

const DEFAULT_CENTER: [number, number] = [30.0444, 31.2357]
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

let leafletPromise: Promise<LeafletInstance> | null = null

function loadLeaflet() {
  if ((window as LeafletWindow).L) {
    return Promise.resolve((window as LeafletWindow).L as LeafletInstance)
  }

  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise<LeafletInstance>((resolve, reject) => {
    if (!document.querySelector('link[href="' + LEAFLET_CSS + '"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }

    const existing = document.querySelector('script[src="' + LEAFLET_JS + '"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener(
        'load',
        () => resolve((window as LeafletWindow).L as LeafletInstance),
        { once: true },
      )
      existing.addEventListener(
        'error',
        () => reject(new Error('تعذر تحميل مكتبة الخريطة.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => {
      const leaflet = (window as LeafletWindow).L
      if (leaflet) resolve(leaflet)
      else reject(new Error('تعذر تهيئة مكتبة الخريطة.'))
    }
    script.onerror = () => reject(new Error('تعذر تحميل مكتبة الخريطة.'))
    document.head.appendChild(script)
  })

  return leafletPromise
}

export function GpsTrackingMap({
  points,
  track,
  selectedAssetId,
  playbackPoint = null,
  geofences = [],
}: {
  points: MarkerPoint[]
  track: TrackPoint[]
  selectedAssetId?: string | null
  playbackPoint?: TrackPoint | null
  geofences?: Array<{ id: string; label: string; latitude: number; longitude: number; radiusM: number }>
}) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])
  const polylineRef = useRef<LeafletPolyline | null>(null)
  const geofenceRefs = useRef<LeafletCircle[]>([])
  const playbackMarkerRef = useRef<LeafletMarker | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    void loadLeaflet()
      .then(L => {
        if (cancelled || !mapRef.current) return

        const map = L.map(mapRef.current, { zoomControl: true })
          .setView(DEFAULT_CENTER, 6)

        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          },
        ).addTo(map)

        mapInstanceRef.current = map
        setReady(true)
        window.setTimeout(() => map.invalidateSize(), 50)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      polylineRef.current?.remove()
      polylineRef.current = null
      geofenceRefs.current.forEach(circle => circle.remove())
      geofenceRefs.current = []
      playbackMarkerRef.current?.remove()
      playbackMarkerRef.current = null
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    const L = (window as LeafletWindow).L
    if (!map || !L || !ready) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    points.forEach(point => {
      const marker = L.circleMarker(
        [point.latitude, point.longitude],
        {
          radius: point.selected ? 11 : 8,
          color: point.selected ? '#0f172a' : '#2563eb',
          fillColor: point.selected ? '#0f172a' : '#2563eb',
          fillOpacity: 0.85,
          weight: point.selected ? 4 : 2,
        },
      )

      marker
        .bindPopup(
          '<strong>' + escapeHtml(point.name) + '</strong><br/>' +
          escapeHtml(point.code ?? '') + '<br/>' +
          'السرعة: ' +
          (point.speed == null ? '—' : Math.round(point.speed) + ' كم/س') +
          '<br/>الحالة: ' +
          escapeHtml(point.status ?? 'غير معروفة'),
        )
        .addTo(map)

      markersRef.current.push(marker)
    })

    polylineRef.current?.remove()
    polylineRef.current = null
    geofenceRefs.current.forEach(circle => circle.remove())
    geofenceRefs.current = []
    playbackMarkerRef.current?.remove()
    playbackMarkerRef.current = null

    if (track.length >= 2) {
      const line = track.map(point => [point.latitude, point.longitude] as [number, number])
      const polyline = L.polyline(line, { color: '#0f172a', weight: 4, opacity: 0.7 })
      polylineRef.current = polyline
      polyline.addTo(map)
      const lats = line.map(point => point[0])
      const lngs = line.map(point => point[1])
      map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [28, 28], maxZoom: 14 })
    }

    geofences.forEach(geofence => {
      if (!Number.isFinite(geofence.latitude) || !Number.isFinite(geofence.longitude) || !Number.isFinite(geofence.radiusM) || geofence.radiusM <= 0) return
      const circle = L.circle([geofence.latitude, geofence.longitude], { radius: geofence.radiusM, color: '#0b7285', fillColor: '#0b7285', fillOpacity: 0.08, weight: 2 })
      circle.addTo(map)
      geofenceRefs.current.push(circle)
    })

    const focus = selectedAssetId
      ? points.find(point => point.id === selectedAssetId)
      : points[0]

    if (focus) {
      map.setView(
        [focus.latitude, focus.longitude],
        selectedAssetId ? 13 : 7,
      )
    }
  }, [points, track, selectedAssetId, geofences, ready])

  useEffect(() => {
    const map = mapInstanceRef.current
    const L = (window as LeafletWindow).L
    if (!map || !L || !ready) return
    playbackMarkerRef.current?.remove()
    playbackMarkerRef.current = null
    if (!playbackPoint || !Number.isFinite(playbackPoint.latitude) || !Number.isFinite(playbackPoint.longitude)) return
    const marker = L.circleMarker([playbackPoint.latitude, playbackPoint.longitude], { radius: 9, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.95, weight: 3 })
    marker.addTo(map)
    playbackMarkerRef.current = marker
    map.setView([playbackPoint.latitude, playbackPoint.longitude], 14)
  }, [playbackPoint, ready])

  return (
    <div
      className="h-[520px] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      ref={mapRef}
      aria-label="خريطة تتبع المركبات"
    />
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
