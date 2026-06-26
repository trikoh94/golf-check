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
            <div className="record