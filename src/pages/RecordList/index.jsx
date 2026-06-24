import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SCORE_META, SEC_KEYS, SEC_NAME } from '../../constants'

export default function RecordList({ onSelect }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('inspections')
      .select('id, date, club, course, inspector, tee, fairway, green, hole_count')
      .order('date', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) setRecords(data || [])
        setLoading(false)
      })
  }, [])

  function avgScore(secData) {
    if (!secData) return null
    const vals = Object.values(secData).filter(h => h.score !== null).map(h => h.score)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  if (loading) return <div className="loading">불러오는 중...</div>
  if (!records.length) return <div className="empty">저장된 기록이 없습니다.</div>

  return (
    <div className="record-list">
      {records.map(r => {
        const teeAvg = avgScore(r.tee)
        const meta = teeAvg ? SCORE_META[Math.round(Number(teeAvg))] : null
        return (
          <div key={r.id} className="record-card" onClick={() => onSelect(r.id)}>
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
        )
      })}
    </div>
  )
}
