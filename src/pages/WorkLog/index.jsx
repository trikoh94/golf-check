import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const WORK_TYPES = [
  { key: '예초',   emoji: '🌿', fields: ['height_mm', 'equipment'] },
  { key: '시비',   emoji: '🌱', fields: ['product', 'amount', 'type'] },
  { key: '농약',   emoji: '💊', fields: ['product', 'amount', 'target'] },
  { key: '코어링', emoji: '🔧', fields: ['tine_size', 'spacing'] },
  { key: '갱신',   emoji: '♻️', fields: ['method'] },
  { key: '관개',   emoji: '💧', fields: ['amount_mm'] },
  { key: '기타',   emoji: '📝', fields: [] },
]

const SECTIONS = [
  { key: 'all',   label: '전체' },
  { key: 'tee',   label: '티잉그라운드' },
  { key: 'fw',    label: '페어웨이' },
  { key: 'green', label: '그린' },
]

const FIELD_LABEL = {
  height_mm:  { label: '예고 (mm)', type: 'number', placeholder: '예: 5' },
  equipment:  { label: '장비명', type: 'text', placeholder: '예: 그린모아' },
  product:    { label: '제품명', type: 'text', placeholder: '제품명' },
  amount:     { label: '살포량', type: 'text', placeholder: '예: 2kg/1000㎡' },
  type:       { label: '비료 종류', type: 'text', placeholder: '예: N-P-K 21-0-0' },
  target:     { label: '방제 대상', type: 'text', placeholder: '예: 브라운패치' },
  tine_size:  { label: '타인 크기', type: 'text', placeholder: '예: 12mm' },
  spacing:    { label: '간격', type: 'text', placeholder: '예: 5cm' },
  method:     { label: '갱신 방법', type: 'text', placeholder: '예: 버티컬컷' },
  amount_mm:  { label: '관개량 (mm)', type: 'number', placeholder: '예: 10' },
}

export default function WorkLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    worker: '',
    work_type: '예초',
    section: 'all',
    memo: '',
    detail: {},
  })

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)
    setLogs(data || [])
    setLoading(false)
  }

  function setDetail(key, val) {
    setForm(f => ({ ...f, detail: { ...f.detail, [key]: val } }))
  }

  async function handleSave() {
    if (!form.date || !form.work_type) return
    setSaving(true)
    const { error } = await supabase.from('work_logs').insert([{
      date: form.date,
      club: '해남 파인트리 골프장',
      worker: form.worker || null,
      work_type: form.work_type,
      section: form.section,
      detail: form.detail,
      memo: form.memo || null,
    }])
    setSaving(false)
    if (!error) {
      setShowForm(false)
      setForm({ date: new Date().toISOString().slice(0, 10), worker: '', work_type: '예초', section: 'all', memo: '', detail: {} })
      fetchLogs()
    }
  }

  const currentType = WORK_TYPES.find(t => t.key === form.work_type)

  return (
    <div className="page-section">
      <div className="wl-header">
        <h2 className="section-title">🔧 작업 기록</h2>
        <button className="btn-add-log" onClick={() => setShowForm(true)}>+ 작업 추가</button>
      </div>

      {/* 입력 폼 */}
      {showForm && (
        <div className="wl-form">
          <div className="wlf-title">새 작업 기록</div>

          <div className="form-grid">
            <label className="form-label">작업일자</label>
            <input type="date" className="form-input" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />

            <label className="form-label">작업자</label>
            <input type="text" className="form-input" value={form.worker}
              placeholder="작업자명" onChange={e => setForm(f => ({ ...f, worker: e.target.value }))} />

            <label className="form-label">작업 구분</label>
            <div className="wl-type-grid">
              {WORK_TYPES.map(t => (
                <button key={t.key}
                  className={'wl-type-btn' + (form.work_type === t.key ? ' active' : '')}
                  onClick={() => setForm(f => ({ ...f, work_type: t.key, detail: {} }))}>
                  {t.emoji} {t.key}
                </button>
              ))}
            </div>

            <label className="form-label">구역</label>
            <div className="btn-group">
              {SECTIONS.map(s => (
                <button key={s.key}
                  className={'btn-option' + (form.section === s.key ? ' active' : '')}
                  onClick={() => setForm(f => ({ ...f, section: s.key }))}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* 작업별 상세 필드 */}
            {currentType?.fields.map(field => (
              <>
                <label key={field + '_l'} className="form-label">{FIELD_LABEL[field].label}</label>
                <input key={field} type={FIELD_LABEL[field].type} className="form-input"
                  placeholder={FIELD_LABEL[field].placeholder}
                  value={form.detail[field] ?? ''}
                  onChange={e => setDetail(field, e.target.value)} />
              </>
            ))}

            <label className="form-label">메모</label>
            <textarea className="form-input" rows={2} value={form.memo}
              placeholder="추가 메모" onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />
          </div>

          <div className="wlf-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '💾 저장'}
            </button>
            <button className="wlf-cancel" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {/* 기록 목록 */}
      {loading ? (
        <div className="loading">불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div className="empty">작업 기록이 없습니다.</div>
      ) : (
        <div className="wl-list">
          {logs.map(log => {
            const wt = WORK_TYPES.find(t => t.key === log.work_type)
            const sec = SECTIONS.find(s => s.key === log.section)
            const details = Object.entries(log.detail || {}).filter(([,v]) => v)
            return (
              <div key={log.id} className="wl-card">
                <div className="wlc-header">
                  <span className="wlc-emoji">{wt?.emoji ?? '📝'}</span>
                  <span className="wlc-type">{log.work_type}</span>
                  <span className="wlc-section">{sec?.label ?? log.section}</span>
                  <span className="wlc-date">{log.date}</span>
                </div>
                {details.length > 0 && (
                  <div className="wlc-details">
                    {details.map(([k, v]) => (
                      <span key={k} className="wlc-detail-chip">
                        {FIELD_LABEL[k]?.label ?? k}: {v}
                      </span>
                    ))}
                  </div>
                )}
                {log.memo && <div className="wlc-memo">{log.memo}</div>}
                {log.worker && <div className="wlc-worker">👤 {log.worker}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
