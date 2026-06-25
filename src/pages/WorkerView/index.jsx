import { useState, useEffect, useRef } from 'react'
import { calcDiseaseRisk } from '../../lib/diseaseRisk'
import { supabase } from '../../lib/supabase'
import { SCORE_META } from '../../constants'
import { uploadPhoto } from '../../lib/uploadPhoto'

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
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherRaw, setWeatherRaw] = useState(null)
  const [weatherLabel, setWeatherLabel] = useState(null)
  const [risks, setRisks] = useState([])
  const [error, setError] = useState(null)
  const [latestInspection, setLatestInspection] = useState(null)

  // 신규 기록 모달
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ workType: '', memo: '', inspector: '', photos: [] })
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  // 수정 모달
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const photoRef = useRef()
  const editPhotoRef = useRef()

  useEffect(() => { fetchLogs() }, [selectedDate])

  useEffect(() => {
    supabase.from('inspections').select('tee, fairway, green, hole_count, date')
      .order('date', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setLatestInspection(data[0]) })
  }, [])

  async function fetchLogs() {
    setLogsLoading(true)
    const { data } = await supabase.from('work_logs').select('*')
      .eq('date', selectedDate).order('created_at', { ascending: false })
    setLogs(data ?? [])
    setLogsLoading(false)
  }

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

  async function handleAddPhoto(e, target) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setPhotoUploading(true)
    const urls = []
    for (const f of files) {
      try {
        const sec = target === 'edit' ? editTarget?.section : modal?.section
        const url = await uploadPhoto(f, 'work-photos', `${selectedDate}/${sec ?? 'misc'}`)
        urls.push(url)
      } catch (err) {
        alert('사진 업로드 실패: ' + err.message)
      }
    }
    setPhotoUploading(false)
    if (!urls.length) return
    if (target === 'edit') setEditForm(f => ({ ...f, photos: [...(f.photos??[]), ...urls] }))
    else setForm(f => ({ ...f, photos: [...f.photos, ...urls] }))
    e.target.value = ''
  }

  async function saveLog() {
    if (!form.workType) return
    setSaving(true)
    const payload = {
      date: selectedDate,
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
    if (err) alert('저장 실패: ' + err.message)
    else { await fetchLogs(); setModal(null) }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('이 기록을 삭제할까요?')) return
    await supabase.from('work_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  function openEdit(log) {
    setEditTarget(log)
    setEditForm({
      work_type: log.work_type,
      inspector: log.inspector ?? '',
      memo: log.memo ?? '',
      photos: log.detail?.photos ?? [],
    })
  }

  async function saveEdit() {
    setEditSaving(true)
    const newDetail = { ...editTarget.detail, photos: editForm.photos }
    const { error: err } = await supabase.from('work_logs').update({
      work_type: editForm.work_type,
      inspector: editForm.inspector || null,
      memo: editForm.memo || null,
      detail: newDetail,
    }).eq('id', editTarget.id)
    if (!err) {
      setLogs(prev => prev.map(l => l.id === editTarget.id
        ? { ...l, work_type: editForm.work_type, inspector: editForm.inspector||null, memo: editForm.memo||null, detail: newDetail }
        : l
      ))
      setEditTarget(null)
    }
    setEditSaving(false)
  }

  function holeLogCount(hole, sec) {
    return logs.filter(l => l.detail?.hole_num === hole && l.section === sec).length
  }

  const urgentRisks = risks.filter(r => r.score >= 60)
  const isToday = selectedDate === TODAY

  return (
    <div className="page-section worker-view">
      <div className="worker-header">
        <h2>👷 작업 기록</h2>
      </div>

      {/* 날짜 선택 */}
      <div className="worker-date-row">
        <input type="date" className="form-input" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ maxWidth: '160px' }} />
        {!isToday && <span className="worker-past-badge">과거 날짜</span>}
        {latestInspection && (
          <span className="worker-insp-ref">점검 기준: {latestInspection.date}</span>
        )}
      </div>

      {/* 홀 수 */}
      <div className="worker-hole-row">
        <span className="worker-hole-label">코스 홀 수</span>
        <div className="btn-group">
          {[9,18,27].map(n => (
            <button key={n} className={'btn-option'+(holeCount===n?' active':'')}
              onClick={() => setHoleCount(n)}>{n}홀</button>
          ))}
        </div>
      </div>

      {/* 날씨 (오늘만) */}
      {isToday && (
        <div className="worker-weather-bar">
          <button className={'btn-weather-fetch'+(weatherLoading?' loading':'')}
            onClick={fetchWeather} disabled={weatherLoading}>
            {weatherLoading ? '📡 불러오는 중...' : '📡 오늘 날씨 / 병해 위험 확인'}
          </button>
          {weatherLabel && <span className="worker-weather-label">📍 {weatherLabel}</span>}
          {error && <span className="weather-error">⚠️ {error}</span>}
        </div>
      )}

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
        </div>
      )}

      {/* 홀 그리드 */}
      <div className="worker-holes-section">
        <h3>📋 홀 탭 → 작업 기록</h3>
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

      {/* 기록 목록 */}
      <div className="worker-today-logs">
        <h3>📝 {selectedDate} 기록 {logsLoading ? '' : `(${logs.length}건)`}</h3>
        {logsLoading ? (
          <div className="wc-empty">불러오는 중...</div>
        ) : logs.length === 0 ? (
          <div className="wc-empty">기록 없음 — 홀을 눌러 작업을 기록하세요</div>
        ) : (
          <div className="worker-log-list">
            {logs.map((log, i) => {
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
                    <div className="wcl-actions">
                      <button className="wcl-btn-edit" onClick={() => openEdit(log)}>수정</button>
                      <button className="wcl-btn-del" onClick={() => handleDelete(log.id)}>삭제</button>
                    </div>
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
        )}
      </div>

      {/* 신규 기록 바텀시트 */}
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
                value={form.memo} onChange={e => setForm(f=>({...f, memo:e.target.value}))} />
              <div className="wm-label">
                사진 첨부 {form.photos.length > 0 && `(${form.photos.length}장)`}
              </div>
              <div className="wm-photo-area">
                {form.photos.map((p, i) => (
                  <div key={i} className="wm-photo-wrap">
                    <img src={p} className="wm-photo-thumb" alt="" />
                    <button className="wm-photo-del"
                      onClick={() => setForm(f=>({...f, photos:f.photos.filter((_,j)=>j!==i)}))}>✕</button>
                  </div>
                ))}
                {photoUploading && (
                  <div className="hps-photo-uploading">⏳</div>
                )}
                {!photoUploading && (
                  <button className="wm-photo-add" onClick={() => photoRef.current.click()}>📷 추가</button>
                )}
                <input ref={photoRef} type="file" accept="image/*" multiple capture="environment"
                  style={{display:'none'}} onChange={e => handleAddPhoto(e, 'new')} />
              </div>
              <button className="btn-save" disabled={!form.workType || saving || photoUploading} onClick={saveLog}>
                {photoUploading ? '📷 업로드 중...' : saving ? '저장 중...' : '💾 기록 저장'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 수정 바텀시트 */}
      {editTarget && (
        <>
          <div className="bottom-sheet-backdrop" onClick={() => setEditTarget(null)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <div className="worker-modal">
              <div className="worker-modal-title">
                {editTarget.detail?.hole_num}번홀 수정
              </div>
              <div className="wm-label">작업 유형</div>
              <div className="wm-type-grid">
                {WORK_TYPES.map(wt => (
                  <button key={wt.key}
                    className={'wm-type-btn'+(editForm.work_type===wt.key?' active':'')}
                    onClick={() => setEditForm(f=>({...f, work_type:wt.key}))}>
                    {wt.label}
                  </button>
                ))}
              </div>
              <div className="wm-label">작업자</div>
              <input className="form-input" value={editForm.inspector??''}
                onChange={e => setEditForm(f=>({...f, inspector:e.target.value}))} />
              <div className="wm-label">메모</div>
              <textarea className="form-input" rows={3} value={editForm.memo??''}
                onChange={e => setEditForm(f=>({...f, memo:e.target.value}))} />
              <div className="wm-label">사진</div>
              <div className="wm-photo-area">
                {(editForm.photos??[]).map((p, i) => (
                  <div key={i} className="wm-photo-wrap">
                    <img src={p} className="wm-photo-thumb" alt="" />
                    <button className="wm-photo-del"
                      onClick={() => setEditForm(f=>({...f, photos:f.photos.filter((_,j)=>j!==i)}))}>✕</button>
                  </div>
                ))}
                <button className="wm-photo-add" onClick={() => editPhotoRef.current.click()}>📷 추가</button>
                <input ref={editPhotoRef} type="file" accept="image/*" multiple capture="environment"
                  style={{display:'none'}} onChange={e => handleAddPhoto(e, 'edit')} />
              </div>
              <button className="btn-save" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? '저장 중...' : '💾 수정 저장'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
