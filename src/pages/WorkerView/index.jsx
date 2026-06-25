import { useState, useEffect } from 'react'
import { calcDiseaseRisk } from '../../lib/diseaseRisk'
import { supabase } from '../../lib/supabase'

const TODAY = new Date().toISOString().slice(0, 10)

const WORK_TYPES = [
  { key: 'fungicide', label: '🧪 살균제 살포' },
  { key: 'insecticide', label: '🐛 살충제 살포' },
  { key: 'fertilizer', label: '🌱 시비' },
  { key: 'mowing', label: '✂️ 예초' },
  { key: 'watering', label: '💧 관개' },
  { key: 'observation', label: '👁 관찰만' },
  { key: 'other', label: '📝 기타' },
]

const SECTIONS = [
  { key: 'green', label: '그린' },
  { key: 'fw', label: '페어웨이' },
  { key: 'tee', label: '티잉그라운드' },
]

const HOLE_COUNTS = [9, 18, 27]

export default function WorkerView() {
  const [holeCount, setHoleCount] = useState(18)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherRaw, setWeatherRaw] = useState(null)
  const [weatherLabel, setWeatherLabel] = useState(null)
  const [risks, setRisks] = useState([])
  const [error, setError] = useState(null)

  // 작업 기록 모달
  const [modal, setModal] = useState(null) // { hole, section, sectionLabel, disease }
  const [form, setForm] = useState({ workType: '', memo: '', inspector: '' })
  const [saving, setSaving] = useState(false)
  const [savedLogs, setSavedLogs] = useState([]) // 오늘 저장된 로그

  // 오늘 작업 로그 불러오기
  useEffect(() => {
    supabase.from('work_logs').select('*').eq('date', TODAY).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSavedLogs(data) })
  }, [])

  async function fetchWeather() {
    setWeatherLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/weather', { cache: 'no-store' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWeatherRaw(data._raw)
      setWeatherLabel(data.label)
      setRisks(calcDiseaseRisk(data._raw))
    } catch {
      setError('날씨 로드 실패')
    } finally {
      setWeatherLoading(false)
    }
  }

  function openModal(hole, sec, disease = null) {
    const secLabel = SECTIONS.find(s => s.key === sec)?.label ?? sec
    setModal({ hole, section: sec, sectionLabel: secLabel, disease })
    setForm({ workType: '', memo: '', inspector: '' })
  }

  async function saveLog() {
    if (!form.workType) return
    setSaving(true)
    const payload = {
      date: TODAY,
      work_type: form.workType,
      section: modal.section,
      memo: form.memo || null,
      inspector: form.inspector || null,
      detail: {
        hole_num: modal.hole,
        section_label: modal.sectionLabel,
        disease_context: modal.disease,
        risks_at_time: risks.map(r => ({ name: r.name, score: r.score })),
      },
    }
    const { error: err } = await supabase.from('work_logs').insert([payload])
    if (err) {
      alert('저장 실패: ' + err.message)
    } else {
      setSavedLogs(prev => [{ ...payload, id: Date.now(), created_at: new Date().toISOString() }, ...prev])
      setModal(null)
    }
    setSaving(false)
  }

  // 홀별 오늘 로그 개수
  function holeLogCount(hole, sec) {
    return savedLogs.filter(l => l.detail?.hole_num === hole && l.section === sec).length
  }

  const urgentRisks = risks.filter(r => r.score >= 60)
  const hasRisks = risks.length > 0

  // 위험 구역 홀 목록 자동 생성
  const riskHoles = []
  if (hasRisks) {
    risks.forEach(risk => {
      risk.section?.forEach(sec => {
        for (let h = 1; h <= holeCount; h++) {
          if (!riskHoles.find(x => x.hole === h && x.sec === sec)) {
            riskHoles.push({ hole: h, sec, disease: risk.name, score: risk.score, color: risk.color, level: risk.level })
          }
        }
      })
    })
    riskHoles.sort((a, b) => b.score - a.score)
  }

  return (
    <div className="page-section worker-view">
      <div className="worker-header">
        <h2>👷 오늘의 작업</h2>
        <p className="worker-subtitle">{TODAY}</p>
      </div>

      {/* 홀 수 선택 */}
      <div className="worker-hole-row">
        <span className="worker-hole-label">코스 홀 수</span>
        <div className="btn-group">
          {HOLE_COUNTS.map(n => (
            <button key={n}
              className={'btn-option' + (holeCount === n ? ' active' : '')}
              onClick={() => setHoleCount(n)}>{n}홀</button>
          ))}
        </div>
      </div>

      {/* 날씨 */}
      <div className="worker-weather-bar">
        <button className={'btn-weather-fetch' + (weatherLoading ? ' loading' : '')}
          onClick={fetchWeather} disabled={weatherLoading}>
          {weatherLoading ? '📡 불러오는 중...' : '📡 오늘 날씨 / 병해 위험 확인'}
        </button>
        {weatherLabel && <span className="worker-weather-label">📍 {weatherLabel}</span>}
        {error && <span className="weather-error">⚠️ {error}</span>}
      </div>

      {/* 긴급 경보 */}
      {urgentRisks.length > 0 && (
        <div className="worker-alert-banner urgent">
          <div className="alert-banner-title">🚨 긴급 방제 경보</div>
          {urgentRisks.map(r => (
            <div key={r.name} className="alert-banner-item">
              <strong>{r.name}</strong> {r.score}점 — {r.description}
            </div>
          ))}
        </div>
      )}

      {/* 병해 위험 요약 */}
      {hasRisks && (
        <div className="worker-risk-summary">
          <h3>⚠️ 병해 위험도</h3>
          <div className="worker-risk-chips">
            {risks.map(r => (
              <div key={r.name} className={'worker-risk-chip' + (r.score >= 70 ? ' high' : r.score >= 50 ? ' mid' : ' low')}
                style={{ borderLeft: `3px solid ${r.color}` }}>
                <span className="risk-chip-name">{r.name}</span>
                <span className="risk-chip-score">{r.score}점</span>
                <span className={'risk-chip-level ' + (r.score >= 70 ? 'lvl-danger' : r.score >= 50 ? 'lvl-warn' : 'lvl-watch')}>{r.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 홀별 작업 기록 */}
      <div className="worker-holes-section">
        <h3>📋 홀별 작업 기록</h3>
        {!hasRisks && (
          <p className="worker-holes-hint">날씨를 먼저 불러오면 위험 구역이 표시돼요. 날씨 없이도 직접 기록 가능합니다.</p>
        )}

        {/* 섹션별 탭 */}
        {SECTIONS.map(({ key: sec, label: secLabel }) => (
          <div key={sec} className="worker-sec-block">
            <div className="worker-sec-title">{secLabel}</div>
            <div className="worker-hole-grid">
              {Array.from({ length: holeCount }, (_, i) => i + 1).map(hole => {
                const riskInfo = riskHoles.find(r => r.hole === hole && r.sec === sec)
                const logCount = holeLogCount(hole, sec)
                return (
                  <button key={hole}
                    className={'worker-hole-btn' + (riskInfo ? ' at-risk' : '') + (logCount > 0 ? ' logged' : '')}
                    style={riskInfo ? { borderColor: riskInfo.color } : {}}
                    onClick={() => openModal(hole, sec, riskInfo?.disease)}
                  >
                    <span className="whb-num">{hole}</span>
                    {riskInfo && (
                      <span className="whb-risk" style={{ color: riskInfo.color }}>
                        {riskInfo.score >= 70 ? '🔴' : '🟡'}
                      </span>
                    )}
                    {logCount > 0 && <span className="whb-logged">✓{logCount}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 오늘 작업 로그 */}
      {savedLogs.length > 0 && (
        <div className="worker-today-logs">
          <h3>📝 오늘 기록 ({savedLogs.length}건)</h3>
          <div className="worker-log-list">
            {savedLogs.map((log, i) => {
              const wt = WORK_TYPES.find(w => w.key === log.work_type)
              const sec = SECTIONS.find(s => s.key === log.section)
              return (
                <div key={log.id ?? i} className="worker-log-item">
                  <div className="wli-top">
                    <span className="wli-hole">{log.detail?.hole_num}번홀</span>
                    <span className="wli-sec">{sec?.label ?? log.section}</span>
                    <span className="wli-type">{wt?.label ?? log.work_type}</span>
                    {log.inspector && <span className="wli-who">👤 {log.inspector}</span>}
                  </div>
                  {log.detail?.disease_context && (
                    <div className="wli-disease">병해 맥락: {log.detail.disease_context}</div>
                  )}
                  {log.memo && <div className="wli-memo">{log.memo}</div>}
                  <div className="wli-time">{new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 작업 기록 모달 */}
      {modal && (
        <>
          <div className="bottom-sheet-backdrop" onClick={() => setModal(null)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <div className="worker-modal">
              <div className="worker-modal-title">
                {modal.hole}번홀 {modal.sectionLabel}
                {modal.disease && <span className="wm-disease-badge">{modal.disease}</span>}
              </div>

              <div className="wm-label">작업 유형 *</div>
              <div className="wm-type-grid">
                {WORK_TYPES.map(wt => (
                  <button key={wt.key}
                    className={'wm-type-btn' + (form.workType === wt.key ? ' active' : '')}
                    onClick={() => setForm(f => ({ ...f, workType: wt.key }))}>
                    {wt.label}
                  </button>
                ))}
              </div>

              <div className="wm-label">작업자</div>
              <input className="form-input" placeholder="이름 입력" value={form.inspector}
                onChange={e => setForm(f => ({ ...f, inspector: e.target.value }))} />

              <div className="wm-label">메모 / 관찰 내용</div>
              <textarea className="form-input" rows={3}
                placeholder="예: 3번 컵 주변 원형 반점 확인, 달러스팟 의심으로 살균제 살포"
                value={form.memo}
                onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />

              <button className="btn-save" disabled={!form.workType || saving}
                onClick={saveLog}>
                {saving ? '저장 중...' : '💾 기록 저장'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
