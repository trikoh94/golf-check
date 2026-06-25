import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { calcDiseaseRisk, generateWorkerAlerts } from '../../lib/diseaseRisk'
import { SEC_NAME, SEC_EMOJI, SCORE_META } from '../../constants'

export default function WorkerView() {
  const { formData, holeState } = useApp()
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherRaw, setWeatherRaw] = useState(null)
  const [weatherLabel, setWeatherLabel] = useState(null)
  const [error, setError] = useState(null)

  async function fetchWeather() {
    setWeatherLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/weather', { cache: 'no-store' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWeatherRaw(data._raw)
      setWeatherLabel(data.label)
    } catch {
      setError('날씨 로드 실패')
    } finally {
      setWeatherLoading(false)
    }
  }

  const risks = weatherRaw ? calcDiseaseRisk(weatherRaw) : []
  const urgentRisks = risks.filter(r => r.score >= 60)

  // 홀 상태가 있으면 홀별 알림 생성
  const hasHoleData = Object.values(holeState).some(sec =>
    Object.values(sec).some(h => h.score !== null)
  )
  const alerts = hasHoleData ? generateWorkerAlerts(holeState, risks) : []

  const SEC_KEYS = ['tee', 'fw', 'green']

  return (
    <div className="page-section worker-view">
      <div className="worker-header">
        <h2>👷 작업 지시</h2>
        <p className="worker-subtitle">오늘의 현장 알림 및 우선 작업구역</p>
      </div>

      {/* 날씨 불러오기 */}
      <div className="worker-weather-bar">
        <button
          className={'btn-weather-fetch' + (weatherLoading ? ' loading' : '')}
          onClick={fetchWeather} disabled={weatherLoading}
        >
          {weatherLoading ? '📡 불러오는 중...' : '📡 오늘 날씨 불러오기'}
        </button>
        {weatherLabel && (
          <span className="worker-weather-label">📍 현재: {weatherLabel}</span>
        )}
        {error && <span className="weather-error">⚠️ {error}</span>}
      </div>

      {/* 긴급 병해 경보 */}
      {urgentRisks.length > 0 && (
        <div className="worker-alert-banner urgent">
          <div className="alert-banner-title">🚨 긴급 방제 경보</div>
          {urgentRisks.map(r => (
            <div key={r.name} className="alert-banner-item">
              <strong>{r.name}</strong> 위험도 {r.score}점 — {r.description}
            </div>
          ))}
        </div>
      )}

      {/* 병해 위험 요약 (날씨 로드 후) */}
      {risks.length > 0 && (
        <div className="worker-risk-summary">
          <h3>⚠️ 오늘 병해 위험</h3>
          <div className="worker-risk-chips">
            {risks.map(r => (
              <div key={r.name}
                className={'worker-risk-chip' + (r.score >= 70 ? ' high' : r.score >= 50 ? ' mid' : ' low')}
                style={{ borderLeft: `3px solid ${r.color}` }}
              >
                <span className="risk-chip-name">{r.name}</span>
                <span className="risk-chip-score">{r.score}점</span>
                <span className={'risk-chip-level ' + (r.score >= 70 ? 'lvl-danger' : r.score >= 50 ? 'lvl-warn' : 'lvl-watch')}>
                  {r.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 홀별 우선 작업 알림 */}
      {alerts.length > 0 ? (
        <div className="worker-alerts">
          <h3>📋 우선 작업 구역</h3>
          <div className="worker-alert-list">
            {alerts.map((a, i) => (
              <div key={i}
                className={'worker-alert-item' + (a.urgent ? ' urgent' : '')}
              >
                <div className="wai-left">
                  {a.urgent && <span className="wai-urgent-badge">긴급</span>}
                  <span className="wai-hole">{a.hole}번홀</span>
                  <span className="wai-sec">{a.sectionName}</span>
                </div>
                <div className="wai-right">
                  <span className="wai-disease" style={{ color: risks.find(r => r.name === a.disease)?.color }}>
                    {a.disease}
                  </span>
                  <span className={'wai-level ' + (a.level === '위험' ? 'lvl-danger' : a.level === '주의' ? 'lvl-warn' : 'lvl-watch')}>
                    {a.level}
                  </span>
                </div>
                <div className="wai-score">
                  현재 상태: {a.holeScore ? SCORE_META[a.holeScore]?.label ?? a.holeScore + '점' : '미점검'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasHoleData && risks.length > 0 ? (
        <div className="worker-no-alerts">✅ 현재 위험 수준의 작업 지시 없음</div>
      ) : null}

      {/* 점검 현황 요약 (읽기 전용) */}
      {hasHoleData && (
        <div className="worker-status">
          <h3>📊 점검 현황</h3>
          <div className="worker-status-grid">
            {SEC_KEYS.map(sec => {
              const holes = holeState[sec]
              const inspected = Object.values(holes).filter(h => h.score !== null)
              const avgScore = inspected.length
                ? (inspected.reduce((s, h) => s + h.score, 0) / inspected.length).toFixed(1)
                : null
              return (
                <div key={sec} className="worker-status-card">
                  <div>{SEC_EMOJI[sec]} {SEC_NAME[sec]}</div>
                  {avgScore ? (
                    <div className="ws-score" style={{ color: SCORE_META[Math.round(Number(avgScore))]?.color }}>
                      {avgScore}점
                    </div>
                  ) : (
                    <div className="ws-score gray">미점검</div>
                  )}
                  <div className="ws-count">{inspected.length}홀 점검됨</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!weatherRaw && !hasHoleData && (
        <div className="worker-empty">
          날씨를 불러오면 오늘의 병해 위험도와 작업 지시를 확인할 수 있어요.
        </div>
      )}
    </div>
  )
}
