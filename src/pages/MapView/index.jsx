import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SCORE_META } from '../../constants'

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STORAGE_KEY = 'turf_hole_pins'

export default function MapView() {
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const markersRef = useRef({})
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [placingHole, setPlacingHole] = useState(null)
  const [holeCount] = useState(18)

  useEffect(() => {
    if (leafletMap.current) return

    const map = L.map(mapRef.current, { zoomControl: true }).setView([34.57, 126.60], 16)
    leafletMap.current = map

    // Esri WorldImagery satellite (free, no key needed)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 20 }
    ).addTo(map)

    // Try to center on user GPS
    navigator.geolocation?.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 17)
    })

    return () => { map.remove(); leafletMap.current = null }
  }, [])

  // Render saved pins
  useEffect(() => {
    if (!leafletMap.current) return
    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    Object.entries(pins).forEach(([hole, { lat, lng, score }]) => {
      const meta = score ? SCORE_META[score] : null
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${meta?.color ?? '#6b7280'};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${hole}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker([lat, lng], { icon }).addTo(leafletMap.current)
      marker.bindPopup(`<b>${hole}번 홀</b>${score ? `<br>점수: ${score}점 (${meta.label})` : ''}`)
      markersRef.current[hole] = marker
    })
  }, [pins])

  // Map click handler for pin placement
  useEffect(() => {
    if (!leafletMap.current) return
    const handler = (e) => {
      if (placingHole === null) return
      const { lat, lng } = e.latlng
      const updated = { ...pins, [placingHole]: { lat, lng, score: null } }
      setPins(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setPlacingHole(null)
    }
    leafletMap.current.on('click', handler)
    return () => leafletMap.current?.off('click', handler)
  }, [placingHole, pins])

  function removePin(hole) {
    const updated = { ...pins }
    delete updated[hole]
    setPins(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <span className="map-hint">
          {placingHole !== null
            ? `🎯 지도에서 ${placingHole}번 홀 위치를 탭하세요`
            : '홀 번호를 선택 후 지도에서 위치를 탭하세요'}
        </span>
        {placingHole !== null && (
          <button className="btn-cancel" onClick={() => setPlacingHole(null)}>취소</button>
        )}
      </div>

      <div ref={mapRef} className="leaflet-container-custom" />

      <div className="hole-pin-list">
        <div className="pin-list-title">홀 위치 설정</div>
        <div className="pin-grid">
          {Array.from({ length: holeCount }, (_, i) => i + 1).map(n => {
            const placed = !!pins[n]
            return (
              <div key={n} className={'pin-item' + (placed ? ' placed' : '')}>
                <button
                  className={'pin-btn' + (placingHole === n ? ' selecting' : '')}
                  onClick={() => setPlacingHole(placingHole === n ? null : n)}
                >
                  {n}홀
                </button>
                {placed && (
                  <button className="pin-remove" onClick={() => removePin(n)}>✕</button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
