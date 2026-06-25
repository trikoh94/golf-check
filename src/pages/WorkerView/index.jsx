import { useState, useEffect, useRef } from 'react'
import { calcDiseaseRisk } from '../../lib/diseaseRisk'
import { supabase } from '../../lib/supabase'
import { SCORE_META, compressImage } from '../../constants'

const TODAY = new Date().toISOString().slice(0, 10)

const WORK_TYPES = [
  { key: 'fungicide',   label: '🧪 살균제 살포' },
  { key: 'insecticide', label: '🐛 살충제 살포' },
  { key: 'fertilizer',  label: '🌱 시비' },
  { key: 'mowing',      label: '✂️ 예초' },
  { key: 'watering',    label: '💧 관개' },
  { key: 'observation', label: '👁 관찰만' },
  { key: 'other',       label: '📝 기타' },
]

const SECTIONS = [
  { key: 'green', label: '그린' },
  { key: 'fw',    label: '페어웨이' },
  { key: 'tee',   label: '티잉그라운드' },
]

const SEC_DB = { green: 'green', fw: 'fairway', tee: 'tee' }

export default function WorkerView() {
  const [holeCount, setHoleCount] = useState(18)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherRaw, setWeatherRaw] = useState(null)
  const [weatherLabel, setWeatherLabel] = useState(null)
  const [risks, setRisks] = useState([])
  const [error, setError] = useState(null)
  const [latestInspection, setLatestInspection] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ workType: '', memo: '', inspector: '', photos: [] })
  const [saving, setSaving] = useState(false)
  const [savedLogs, setSavedLogs] = useState([])
  const photoRef = useRef()

  useEffect(() => {
    supabase.from('work_logs').select('*').eq('date', TODAY).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSavedLogs(data) })
    supabase.from('inspections').select('tee, fairway, green, hole_count, date')
      .order('date', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setLatestInspection(data[0]) })
  }, [])

  async function fetchWeather() {
    setWeatherLoading(true); setError(null)
    try {
      const res = await fetch('/api/weather', { cache: 'no-store' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWeatherRaw(data._raw); setWeatherLabel(data.label)
      setRisks(calcDiseaseRisk(data._raw))
    } catch { setError('날씨 로드 실패') }
    finally { setWeatherLoading(false) }
  }

  function getHoleScore(hole, sec) {
    if (!latestInspection) return null
    return latestInspection[SEC_DB[sec]]?.[hole]?.score ?? null
  }

  function getHoleAlert(hole, sec) {
    const score = getHoleScore(hole, sec)
    if (score === null) return null
    const secRisk = risks.find(r => r.section?.includes(sec))
    if (!secRisk) return null
    if (score <= 3 && secRisk.score >= 50) return 'high'
    if (score <= 5 && secRisk.score >= 65) return 'mid'
    return null
  }

  function openModal(hole, sec) {
    const secLabel = SECTIONS.find(s => s.key === sec)?.label ?? sec
    const secRisk = risks.find(r => r.section?.includes(sec))
    setModal({ hole, section: sec, sectionLabel: secLabel, disease: secRisk?.name ?? null })
    setForm({ workType: '', memo: '', inspector: '', photos: [] })
  }

  async function addPhoto(e) {
    const files = Array.from(e.target.files)
    const results = []
    for (const f of files) {
      const dataUrl = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = ev => res(ev.target.result)
        reader.readAsDataURL(f)
      })
      const compressed = await compressImage(dataUrl)
      results.push(compressed)
    }
    setForm(f => ({ ...f, photos: [...f.photos, ...results] }))
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
        hole_score_at_time: getHoleScore(modal.hole, modal.section),
        risks_at_time: risks.map(r => ({ name: r.name, score: r.score })),
        photos: form.photos,
      },
    }
    const { error: err } = await supabase.from('work_logs').insert([payload])
    if (err) { alert('저장 실패: ' + err.message) }
    else {
      setSavedLogs(prev => [{ ...payload, id: Date.now(), created_at: new Date().toISOString() }, ...prev])
      setModal(null)
    }
    setSaving(false)
  }

  function holeLogCount(hole, sec) {
    return savedLogs.filter(l => l.detail?.hole_num === hole && l.section === sec).length
  }

  const urgentRisks = risks.filter(r => r.score >= 60)

  return (
    <div className="page-section worker-view">
      <div className="worker-header">
        <h2>👷 오늘의 작업</h2>
        <p className="worker-subtitle">{TODAY}
          {latestInspection && <span className="worker-insp-ref"> · 최근 점검 {latestInspection.date} 기준</span>}
        </p>
      </div>

      <div className="worker-hole-row">
        <span className="worker-hole-label">코스 홀 수</span>
        <div className="btn-group">
          {[9,18,27].map(n => (
            <button key={n} className={'btn-option'+(holeCount===n?' active':'')}
              onClick={() => setHoleCount(n)}>{n}홀</button>
          ))}
        </div>
      </div>

      <div className="worker-weather-bar">
        <button className={'btn-weather-fetch'+(weatherLoading?' loading':'')}
          onClick={fetchWeather} disabled={weatherLoading}>
          {weatherLoading ? '📡 불러오는 중...' : '📡 오늘 날씨 / 병해 위험 확인'}
        </button>
        {weatherLabel && <span className="worker-weather-label">📍 {weatherLabel}</span>}
        {error && <span className="weather-error">⚠️ {error}</span>}
      </div>

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

      {risks.length > 0 && (
        <div className="worker-risk-summary">
          <h3>⚠️ 병해 위험도</h3>
          <div className="worker-risk-chips">
            {risks.map(r => (
              <div key={r.name} className={'worker-risk-chip'+(r.score>=70?' high':r.score>=50?' mid':' low')}
                style={{ borderLeft: `3px solid ${r.color}` }}>
                <span className="risk-chip-name">{r.name}</span>
                <span className="risk-chip-score">{r.score}점</span>
                <span className={'risk-chip-level '+(r.score>=70?'lvl-danger':r.score>=50?'lvl-warn':'lvl-watch')}>{r.level}</span>
              </div>
            ))}
          </div>
          {!latestInspection && (
            <p className="worker-holes-hint" style={{marginTop:'.4rem'}}>
              ※ 점검 기록이 없어 전체 홀 중립 표시. 점검 후 위험 홀이 자동 강조됩니다.
            </p>
          )}
        </div>
      )}

      <div className="worker-holes-section">
        <h3>📋 홀별 작업 기록</h3>
        {SECTIONS.map(({ key: sec, label: secLabel }) => (
          <div key={sec} className="worker-sec-block">
            <div className="worker-sec-title">{secLabel}</div>
            <div className="worker-hole-grid">
              {Array.from({ length: holeCount }, (_, i) => i + 1).map(hole => {
                const alert = getHoleAlert(hole, sec)
                const score = getHoleScore(hole, sec)
                const logCount = holeLogCount(hole, sec)
                const meta = score ? SCORE_META[score] : null
                return (
                  <button key={hole}
                    className={'worker-hole-btn'+(alert?' at-risk':'')+(logCount>0?' logged':'')}
                    style={alert ? {
                      borderColor: alert==='high'?'#dc2626':'#f97316',
                      background:  alert==='high'?'#fff1f1':'#fff8f0'
                    } : {}}
                    onClick={() => openModal(hole, sec)}
                  >
                    <span className="whb-num">{hole}</span>
                    {score && <span className="whb-score" style={{color: meta?.color}}>{score}</span>}
                    {alert==='high' && <span className="whb-risk">🔴</span>}
                    {alert==='mid'  && <span className="whb-risk">🟡</span>}
                    {logCount > 0   && <span className="whb-logged">✓{logCount}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {savedLogs.length > 0 && (
        <div className="worker-today-logs">
          <h3>📝 오늘 기록 ({savedLogs.length}건)</h3>
          <div className="worker-log-list">
            {savedLogs.map((log, i) => {
              const wt = WORK_TYPES.find(w => w.key === log.work_type)
              const sec = SECTIONS.find(s => s.key === log.section)
              const photos = log.detail?.photos ?? []
              return (
                <div key={log.id ?? i} className="worker-log-item">
                  <div className="wli-top">
                    <span className="wli-hole">{log.detail?.hole_num}번홀</span>
                    <span className="wli-sec">{sec?.label ?? log.section}</span>
                    <span className="wli-type">{wt?.label ?? log.work_type}</span>
                    {log.inspector && <span className="wli-who">👤 {log.inspector}</span>}
                  </div>
                  {log.detail?.disease_context && <div className="wli-disease">병해: {log.detail.disease_context}</div>}
                  {log.memo && <div className="wli-memo">{log.memo}</div>}
                  {photos.length > 0 && (
                    <div className="wli-photos">
                      {photos.map((p, pi) => <img key={pi} src={p} className="wli-photo-thumb" alt="" />)}
                    </div>
                  )}
                  <div className="wli-time">{new Date(log.created_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                    className={'wm-type-btn'+(form.workType===wt.key?' active':'')}
                    onClick={() => setForm(f=>({...f, workType:wt.key}))}>
                    {wt.label}
                  </button>
                ))}
              </div>

              <div className="wm-label">작업자</div>
              <input className="form-input" placeholder="이름" value={form.inspector}
                onChange={e => setForm(f=>({...f, inspector:e.target.value}))} />

              <div className="wm-label">메모 / 관찰 내용</div>
              <textarea className="form-input" rows={3}
                placeholder="예: 원형 반점 확인, 달러스팟 의심 → 살균제 살포"
                value={form.memo}
                onChange={e => setForm(f=>({...f, memo:e.target.value}))} />

              <div className="wm-label">사진 첨부</div>
              <div className="wm-photo-area">
                {form.photos.map((p, i) => (
                  <div key={i} className="wm-photo-wrap">
                    <img src={p} className="wm-photo-thumb" alt="" />
                    <button className="wm-photo-del"
                      onClick={() => setForm(f=>({...f, photos:f.photos.filter((_,j)=>j!==i)}))}>✕</button>
                  </div>
                ))}
                <button className="wm-photo-add" onClick={() => photoRef.current.click()}>
                  📷 사진 추가
                </button>
                <input ref={photoRef} type="file" accept="image/*" multiple capture="environment"
                  style={{display:'none'}} onChange={addPhoto} />
              </div>

              <button className="btn-save" disabled={!form.workType||saving} onClick={saveLog}>
                {saving ? '저장 중...' : '💾 기록 저장'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
