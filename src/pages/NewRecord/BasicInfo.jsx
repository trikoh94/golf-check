import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import DiseasePanel from '../../components/disease/DiseasePanel'

const HOLE_OPTIONS = [9, 18, 27]

export default function BasicInfo() {
  const {
    formData, setForm, setHoleCount,
    hasDraft, resetAll,
    supabaseDraft, restoreSupabaseDraft, dismissSupabaseDraft
  } = useApp()
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(null)

  async function fetchWeather() {
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch('/api/weather', { cache: 'no-store' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm({ weather: data.label, weatherDetail: data })
    } catch (e) {
      setWeatherError('날씨를 가져오지 못했어요.')
    } finally {
      setWeatherLoading(false)
    }
  }

  const wd = formData.weatherDetail

  return (
    <div className="page-section">

      {/* Supabase 임시저장 복구 배너 (우선순위 높음) */}
      {supabaseDraft && (
        <div className="draft-banner draft-banner--supabase">
          <div className="draft-banner-info">
            <span>📋 미완료 점검이 있어요</span>
            <span className="draft-banner-meta">
              {supabaseDraft.date} · {supabaseDraft.inspector || '점검자 미입력'} · {supabaseDraft.hole_count}홀
            </span>
          </div>
          <div className="draft-banner-actions">
            <button className="draft-restore" onClick={restoreSupabaseDraft}>이어서 점검</button>
            <button className="draft-discard" onClick={dismissSupabaseDraft}>새로 시작</button>
          </div>
        </div>
      )}

      {/* localStorage 임시 복구 배너 (Supabase 배너 없을 때만) */}
      {!supabaseDraft && hasDraft && (
        <div className="draft-banner">
          <span>💾 이전에 작성 중이던 점검이 있어요</span>
          <button className="draft-discard" onClick={resetAll}>새로 시작</button>
        </div>
      )}

      <h2 className="section-title">기본 정보</h2>
      <div className="form-grid">
        <label className="form-label">점검일자</label>
        <input type="date" className="form-input" value={formData.date}
          onChange={e => setForm({ date: e.target.value })} />

        <label className="form-label">골프장명</label>
        <input type="text" className="form-input" value={formData.club}
          onChange={e => setForm({ club: e.target.value })} />

        <label className="form-label">코스명</label>
        <div className="course-select-wrap">
          <div className="course-presets">
            {['솔라', '시도', '비치'].map(c => (
              <button key={c}
                className={'course-preset-btn' + (formData.course === c ? ' active' : '')}
                onClick={() => setForm({ course: c })}>
                {c}
              </button>
            ))}
          </div>
          <input type="text" className="form-input" value={formData.course}
            placeholder="직접 입력" onChange={e => setForm({ course: e.target.value })} />
        </div>

        <label className="form-label">점검자</label>
        <input type="text" className="form-input" value={formData.inspector}
          placeholder="성명" onChange={e => setForm({ inspector: e.target.value })} />

        <label className="form-label">홀 수</label>
        <div className="btn-group">
          {HOLE_OPTIONS.map(n => (
            <button key={n}
              className={'btn-option' + (formData.holeCount === n ? ' active' : '')}
              onClick={() => setHoleCount(n)}>{n}홀</button>
          ))}
        </div>

        <label className="form-label">날씨</label>
        <div className="weather-section">
          <button
            className={'btn-weather-fetch' + (weatherLoading ? ' loading' : '')}
            onClick={fetchWeather} disabled={weatherLoading}
          >
            {weatherLoading ? '📡 불러오는 중...' : '📡 현재 날씨 불러오기 (해남)'}
          </button>

          {wd && (
            <>
              <div className="weather-card">
                <div className="wc-main">
                  <span className="wc-label">{wd.label}</span>
                  <span className="wc-temp">{wd.temp}</span>
                  {wd.tMin && wd.tMax && (
                    <span className="wc-minmax">최저 {wd.tMin} / 최고 {wd.tMax}</span>
                  )}
                </div>
                <div className="wc-chips">
                  {wd.humidity     && <span className="wc-chip">💧 습도 {wd.humidity}</span>}
                  {wd.wind         && <span className="wc-chip">💨 풍속 {wd.wind}</span>}
                  {wd.dewPoint     && <span className="wc-chip">🌡 이슬점 {wd.dewPoint}</span>}
                  {wd.nightMinTemp && <span className="wc-chip">🌙 야간최저 {wd.nightMinTemp}</span>}
                  {wd.soilTemp0    && <span className="wc-chip">🌿 지면 {wd.soilTemp0}</span>}
                  {wd.soilTemp6    && <span className="wc-chip">🪱 토양6cm {wd.soilTemp6}</span>}
                  {wd.etDay        && <span className="wc-chip et">💧 ET {wd.etDay}</span>}
                  {wd.radiationDay && <span className="wc-chip rad">☀️ 일사 {wd.radiationDay}</span>}
                  {wd.rain         && <span className="wc-chip rain">🌧 강수 {wd.rain}</span>}
                </div>
                <button className="wc-reset" onClick={() => setForm({ weather: '', weatherDetail: null })}>
                  다시 불러오기
                </button>
              </div>

              {/* 관리자 전용: 병해 위험도 */}
              <DiseasePanel weatherRaw={wd._raw} />
            </>
          )}

          {weatherError && <div className="weather-error">⚠️ {weatherError}</div>}
        </div>

        <label className="form-label">다음 점검</label>
        <input type="date" className="form-input" value={formData.nextVisit}
          onChange={e => setForm({ nextVisit: e.target.value })} />

        <label className="form-label">전체 메모</label>
        <textarea className="form-input" value={formData.memo}
          placeholder="전체 종합 메모" rows={3}
          onChange={e => setForm({ memo: e.target.value })} />
      </div>
    </div>
  )
}
