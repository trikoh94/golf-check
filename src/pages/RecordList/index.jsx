import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SCORE_META, SEC_KEYS, SEC_NAME } from '../../constants'

export default function RecordList({ onSelect }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [editRec, setEditRec] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  function load() {
    supabase
      .from('inspections')
      .select('id, date, club, course, inspector, next_visit, memo, tee, fairway, green, hole_count')
      .or('status.is.null,status.eq.completed')
      .order('date', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) setRecords(data || [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  function avgScore(secData) {
    if (!secData) return null
    const vals = Object.values(secData).filter(h => h.score !== null).map(h => h.score)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  async function handleDelete() {
    await supabase.from('inspections').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  function openEdit(e, r) {
    e.stopPropagation()
    setEditRec(r)
    setEditForm({ date: r.date, inspector: r.inspector, course: r.course || '', next_visit: r.next_visit || '', memo: r.memo || '' })
  }

  async function handleEditSave() {
    setSaving(true)
    await supabase.from('inspections').update({
      date: editForm.date,
      inspector: editForm.inspector,
      course: editForm.course || null,
      next_visit: editForm.next_visit || null,
      memo: editForm.memo || null,
    }).eq('id', editRec.id)
    setSaving(false)
    setEditRec(null)
    load()
  }

  if (loading) return <div className="loading">불러오는 중...</div>
  if (!records.length) return <div className="empty">저장된 기록이 없습니다.</div>

  return (
    <div className="record-list">
      {records.map(r => {
        return (
          <div key={r.id} className="record-card-wrap">
            <div className="record-card" onClick={() => onSelect(r.id)}>
              <div className="rc-header">
                <span className="rc-date">{r.date}</span>
                <span className="rc-club">{r.club} {r.course ? `/ ${r.course}` : ''}</span>
              </div>
              <div className="rc-scores">
                {SEC_KEYS.map(sec => {
                  const key = sec === 'fw' ? 'fairway' : sec
                  const avg = avgScore(r[key])
                  const m = avg ? SCORE_META[Math.round(Number(avg))] : null
                  return (
                    <span key={sec} className="rc-score-chip" style={m ? { color: m.color } : {}}>
                      {SEC_NAME[sec]}: {avg ?? '—'}
                    </span>
                  )
                })}
              </div>
              <div className="rc-inspector">{r.inspector} · {r.hole_count}홀</div>
            </div>
            <div className="rc-actions">
              <button className="rc-btn-edit" onClick={e => openEdit(e, r)}>✏️ 수정</button>
              <button className="rc-btn-delete" onClick={e => { e.stopPropagation(); setDeleteId(r.id) }}>🗑️ 삭제</button>
            </div>
          </div>
        )
      })}

      {/* 삭제 확인 */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <p className="modal-title">기록을 삭제할까요?</p>
            <p className="modal-desc">삭제 후 복구할 수 없습니다.</p>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setDeleteId(null)}>취소</button>
              <button className="modal-btn-confirm" onClick={handleDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editRec && (
        <div className="modal-overlay" onClick={() => setEditRec(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <p className="modal-title">기록 수정</p>
            <div className="edit-form">
              <label>점검일
                <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </label>
              <label>점검자
                <input type="text" value={editForm.inspector} onChange={e => setEditForm(f => ({ ...f, inspector: e.target.value }))} />
              </label>
              <label>코스
                <input type="text" placeholder="예: A코스" value={editForm.course} onChange={e => setEditForm(f => ({ ...f, course: e.target.value }))} />
              </label>
              <label>다음 점검일
                <input type="date" value={editForm.next_visit} onChange={e => setEditForm(f => ({ ...f, next_visit: e.target.value }))} />
              </label>
              <label>메모
                <textarea rows={2} value={editForm.memo} onChange={e => setEditForm(f => ({ ...f, memo: e.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setEditRec(null)}>취소</button>
              <button className="modal-btn-confirm" onClick={handleEditSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
