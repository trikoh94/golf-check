import { useApp } from '../../context/AppContext'

const HOLE_OPTIONS = [9, 18, 27]
const WEATHER_OPTIONS = ['☀️ 맑음', '⛅ 구름', '🌧️ 비', '💨 바람', '🌫️ 안개']

export default function BasicInfo() {
  const { formData, setForm, setHoleCount } = useApp()

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
        <div className="btn-group wrap">
          {WEATHER_OPTIONS.map(w => (
            <button
              key={w}
              className={'btn-option' + (formData.weather === w ? ' active' : '')}
              onClick={() => setForm({ weather: formData.weather === w ? '' : w })}
            >
              {w}
            </button>
          ))}
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
