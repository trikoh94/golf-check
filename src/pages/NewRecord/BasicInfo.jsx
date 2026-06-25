import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const HOLE_OPTIONS = [9, 18, 27]
const WEATHER_OPTIONS = ['☀️ 맑음', '⛅ 구름', '🌧️ 비', '💨 바람', '🌫️ 안개']

export default function BasicInfo() {
  const { formData, setForm, setHoleCount } = useApp()
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherDetail, setWeatherDetail] = useState(null)
  const [weatherError, setWeatherError] = useState(null)

  async function fetchWeather() {
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch('/api/weather')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm({ weather: data.label })
      setWeatherDetail(data)
    } catch (e) {
      setWeatherError('날씨를 가져오지 못했어요. 직접 선택해주세요.')
    } finally {
      setWeatherLoading(false)
    }
  }

  return (
    <div className="page-section">
      <h2 className="section-title">기본 정보</h2>

      <div className="form-grid">
        <label className="form-label">점검일자</label>
        <input
          type="date"
          className="form-input"
          value={formData.date}
          onChange={e => setForm({ date: e.target.value })}
        />

        <label className="form-label">골프장명</label>
        <input
          type="text"
          className="form-input"
          value={formData.club}
          placeholder="골프장명"
          onChange={e => setForm({ club: e.target.value })}
        />

        <label className="form-label">코스명</label>
        <input
          type="text"
          className="form-input"
          value={formData.course}
          placeholder="예: A코스, 파인코스"
          onChange={e => setForm({ course: e.target.value })}
        />

        <label className="form-label">점검자</label>
        <input
          type="text"
          className="form-input"
          value={formData.inspector}
          placeholder="성명"
          onChange={e => setForm({ inspector: e.target.value })}
        />

        <label className="form-label">홀 수</label>
        <div className="btn-group">
          {HOLE_OPTIONS.map(n => (
            <button
              key={n}
              className={'btn-option' + (formData.holeCount === n ? ' active' : '')}
              onClick={() => setHoleCount(n)}
            >
              {n}홀
            </button>
          ))}
        </div>

        <label className="form-label">날씨</label>
        <div className="weather-section">
          <button
            className={'btn-weather-fetch' + (weatherLoading ? ' loading' : '')}
            onClick={fetchWeather}
            disabled={weatherLoading}
          >
            {weatherLoading ? '📡 불러오는 중...' : '📡 현재 날씨 가져오기'}
          </button>

          {weatherDetail && (
            <div className="weather-detail">
              <span className="wd-main">{weatherDetail.label}</span>
              {weatherDetail.temp && <span className="wd-chip">🌡 {weatherDetail.temp}</span>}
              {weatherDetail.humidity && <span className="wd-chip">💧 {weatherDetail.humidity}</span>}
              {weatherDetail.wind && <span className="wd-chip">💨 {weatherDetail.wind}</span>}
              {weatherDetail.rain && <span className="wd-chip">🌧 {weatherDetail.rain}</span>}
            </div>
          )}

          {weatherError && <div className="weather-error">{weatherError}</div>}

          <div className="weather-manual-label">직접 선택</div>
          <div className="btn-group wrap">
            {WEATHER_OPTIONS.map(w => (
              <button
                key={w}
                className={'btn-option' + (formData.weather === w ? ' active' : '')}
                onClick={() => { setForm({ weather: formData.weather === w ? '' : w }); setWeatherDetail(null) }}
              >
                {w}
              </button>
            ))}
          </div>

          {formData.weather && (
            <div className="weather-selected">선택됨: <strong>{formData.weather}</strong></div>
          )}
        </div>

        <label className="form-label">다음 점검</label>
        <input
          type="date"
          className="form-input"
          value={formData.nextVisit}
          onChange={e => setForm({ nextVisit: e.target.value })}
        />

        <label className="form-label">전체 메모</label>
        <textarea
          className="form-input"
          value={formData.memo}
          placeholder="전체 종합 메모"
          rows={3}
          onChange={e => setForm({ memo: e.target.value })}
        />
      </div>
    </div>
  )
}
