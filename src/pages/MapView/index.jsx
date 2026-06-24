import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SCORE_META } from '../../constants'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STORAGE_KEY = 'turf_hole_pins_v2'
const HOLE_COUNT = 18

function loadPins() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function savePins(pins) { localStorage.setItem(STORAGE_KEY, JSON.stringify(pins)) }

export default function MapView() {
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const markersRef = useRef({})
  const accuracyCircleRef = useRef(null)
  const myLocMarkerRef = useRef(null)

  const [pins, setPins] = useState(loadPins)
  const [mode, setMode] = useState('overview')
  const [setupStep, setSetupStep] = useState(1)
  const [gpsStatus, setGpsStatus] = useState('idle')
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [myLoc, setMyLoc] = useState(null)

  const placedCount = Object.keys(pins).length
  const allPlaced = placedCount >= HOLE_COUNT

  useEffect(() => {
    if (leafletMap.current) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView([34.57, 126.60], 17)
    leafletMap.current = map
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 20 }
    ).addTo(map)
    navigator.geolocation?.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 17)
    })
    return () => { map.remove(); leafletMap.current = null }
  }, [])

  useEffect(() => {
    if (!leafletMap.current) return
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}
    Object.entries(pins).forEach(([hole, { lat, lng, score }]) => {
      const meta = score ? SCORE_META[score] : null
      const color = meta?.color ?? '#6b7280'
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${hole}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      })
      const marker = L.marker([lat, lng], { icon }).addTo(leafletMap.current)
      marker.bindPopup(`<b>${hole}번 홀</b>${score ? `<br>${score}점 · ${meta.label}` : '<br>점수 미기록'}`)
      markersRef.current[hole] = marker
    })
  }, [pins])

  useEffect(() => {
    if (!leafletMap.current || !myLoc) return
    myLocMarkerRef.current?.remove()
    accuracyCircleRef.current?.remove()
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9],
    })
    myLocMarkerRef.current = L.marker([myLoc.lat, myLoc.lng], { icon }).addTo(leafletMap.current)
    if (gpsAccuracy) {
      accuracyCircleRef.current = L.circle([myLoc.lat, myLoc.lng], {
        radius: gpsAccuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1,
      }).addTo(leafletMap.current)
    }
  }, [myLoc, gpsAccuracy])

  const getCurrentLocation = useCallback(() => {
    setGpsStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        setMyLoc({ lat, lng })
        setGpsAccuracy(Math.round(accuracy))
        setGpsStatus('done')
        leafletMap.current?.setView([lat, lng], 18)
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  function saveCurrentAsPin(holeNum) {
    if (!myLoc) return
    const updated = { ...pins, [holeNum]: { lat: myLoc.lat, lng: myLoc.lng, score: null } }
    setPins(updated)
    savePins(updated)
    if (holeNum < HOLE_COUNT) setSetupStep(holeNum + 1)
    setGpsStatus('idle')
    setMyLoc(null)
  }

  function removePin(hole) {
    const updated = { ...pins }
    delete updated[hole]
    setPins(updated)
    savePins(updated)
  }

  function resetAllPins() {
    if (!window.confirm('모든 핀을 초기화할까요?')) return
    setPins({})
    savePins({})
  }

  useEffect(() => {
    if (!leafletMap.current) return
    const handler = (e) => {
      if (mode !== 'setup') return
      const { lat, lng } = e.latlng
      const updated = { ...pins, [setupStep]: { lat, lng, score: null } }
      setPins(updated)
      savePins(updated)
      if (setupStep < HOLE_COUNT) setSetupStep(setupStep + 1)
    }
    leafletMap.current.on('click', handler)
    return () => leafletMap.current?.off('click', handler)
  }, [mode, setupStep, pins])

  return (
    <div className="map-view">
      <div ref={mapRef} className="leaflet-container-custom" />

      {mode === 'overview' && (
        <div className="map-panel">
          <div className="map-panel-header">
            <div>
              <div className="map-panel-title">🗺️ 코스 현황</div>
              <div className="map-panel-sub">
                {allPlaced ? `전체 ${HOLE_COUNT}홀 위치 설정 완료 ✅` : `${placedCount} / ${HOLE_COUNT}홀 위치 설정됨`}
              </div>
            </div>
            <button className="btn-setup" onClick={() => { setMode('setup'); setSetupStep(1) }}>
              {allPlaced ? '📍 재설정' : '📍 위치 설정 시작'}
            </button>
          </div>

          {!allPlaced && (
            <div className="setup-notice">
              ⚠️ 현장에서 한 번만 설정하면 이후엔 자동으로 표시됩니다.
            </div>
          )}

          <div className="pin-status-grid">
            {Array.from({ length: HOLE_COUNT }, (_, i) => i + 1).map(n => (
              <div key={n} className={`pin-status-item ${pins[n] ? 'placed' : 'empty'}`}>
                <span>{n}</span>
                {pins[n] && <span className="pin-check">✓</span>}
              </div>
            ))}
          </div>

          {placedCount > 0 && (
            <button className="btn-reset-pins" onClick={resetAllPins}>전체 초기화</button>
          )}
        </div>
      )}

      {mode === 'setup' && (
        <div className="map-panel setup-mode">
          <div className="setup-header">
            <button className="btn-back-setup" onClick={() => { setMode('overview'); setGpsStatus('idle'); setMyLoc(null) }}>← 완료</button>
            <div className="setup-progress">
              <div className="setup-progress-bar" style={{ width: `${(placedCount / HOLE_COUNT) * 100}%` }} />
            </div>
            <span className="setup-progress-text">{placedCount}/{HOLE_COUNT}</span>
          </div>

          <div className="setup-instruction">
            <div className="setup-hole-num">{setupStep}번 홀</div>
            <div className="setup-guide">
              {pins[setupStep]
                ? '✅ 위치 저장됨'
                : '📍 해당 홀 위치에 서서 아래 버튼을 누르세요'}
            </div>
          </div>

          {!pins[setupStep] && (
            <div className="gps-actions">
              <button
                className={`btn-gps${gpsStatus === 'locating' ? ' locating' : ''}`}
                onClick={getCurrentLocation}
                disabled={gpsStatus === 'locating'}
              >
                {gpsStatus === 'locating' ? '📡 위치 찾는 중...' : '📡 현재 위치로 기록'}
              </button>

              {gpsStatus === 'done' && myLoc && (
                <div className="gps-result">
                  <div className="gps-accuracy">
                    정확도 ±{gpsAccuracy}m
                    <span className={`accuracy-badge ${gpsAccuracy <= 10 ? 'good' : gpsAccuracy <= 30 ? 'ok' : 'bad'}`}>
                      {gpsAccuracy <= 10 ? '우수' : gpsAccuracy <= 30 ? '보통' : '낮음'}
                    </span>
                  </div>
                  <button className="btn-confirm-pin" onClick={() => saveCurrentAsPin(setupStep)}>
                    ✅ {setupStep}번 홀 위치 확정
                  </button>
                </div>
              )}

              {gpsStatus === 'error' && (
                <div className="gps-error">GPS 신호가 없어요. 지도를 직접 탭해서 위치를 설정할 수 있어요.</div>
              )}
            </div>
          )}

          {pins[setupStep] && (
            <div className="gps-actions">
              <button className="btn-next-hole" onClick={() => { setSetupStep(Math.min(setupStep + 1, HOLE_COUNT)); setGpsStatus('idle'); setMyLoc(null) }}>
                다음 홀 →
              </button>
              <button className="btn-redo-pin" onClick={() => { removePin(setupStep); setGpsStatus('idle'); setMyLoc(null) }}>
                재설정
              </button>
            </div>
          )}

          <div className="hole-step-bar">
            {Array.from({ length: HOLE_COUNT }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`hole-step-btn${setupStep === n ? ' current' : ''}${pins[n] ? ' done' : ''}`}
                onClick={() => { setSetupStep(n); setGpsStatus('idle'); setMyLoc(null) }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
