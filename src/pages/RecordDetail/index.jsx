import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SCORE_META, SEC_KEYS, SEC_NAME, SEC_EMOJI } from '../../constants'

export default function RecordDetail({ id, onBack }) {
  const [rec, setRec] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('inspections').select('*').eq('id', id).single()
      .then(({ data }) => { setRec(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="loading">불러오는 중...</div>
  if (!rec) return <div className="empty">기록을 찾을 수 없습니다.</div>

  const secMap = { tee: rec.tee, fw: rec.fairway, green: rec.green }

  function getHoles(secData) {
    return Object.entries(secData || {})
      .map(([n, h]) => ({ num: Number(n), ...h }))
      .filter(h => h.score !== null)
      .sort((a, b) => a.num - b.num)
  }

  function avg(secData) {
    const holes = getHoles(secData)
    if (!holes.length) return null
    return (holes.reduce((s, h) => s + h.score, 0) / holes.length).toFixed(1)
  }

  function totalUninspected(secData) {
    return Object.values(secData || {}).filter(h => h.score === null).length
  }

  return (
    <div className="report">
      <div className="report-topbar">
        <button className="btn-back" onClick={onBack}>← 목록</button>
        <span className="report-id">점검 #{rec.id}</span>
      </div>

      <div className="report-header">
        <div className="report-title-block">
          <div className="report-badge">잔디 상태 점검 보고서</div>
          <h1 className="report-club">{rec.club}</h1>
          {rec.course && <div className="report-course">{rec.course}</div>}
        </div>
        <div className="report-meta-grid">
          <div className="meta-item"><span>점검일</span><strong>{rec.date}</strong></div>
          <div className="meta-item"><span>점검자</span><strong>{rec.inspector}</strong></div>
          <div className="meta-item"><span>날씨</span><strong>{rec.weather || '—'}</strong></div>
          <div className="meta-item"><span>홀 수</span><strong>{rec.hole_count}홀</strong></div>
          {rec.next_visit && <div className="meta-item"><span>다음 점검</span><strong>{rec.next_visit}</strong></div>}
        </div>
      </div>

      <div className="report-section">
        <h2 className="report-section-title">📊 종합 평가</h2>
        <div className="summary-cards-report">
          {SEC_KEYS.map(sec => {
            const a = avg(secMap[sec])
            const m = a ? SCORE_META[Math.round(Number(a))] : null
            const uninsp = totalUninspected(secMap[sec])
            const inspected = getHoles(secMap[sec]).length
            return (
              <div key={sec} className="summary-card-report" style={m ? { borderTop: `4px solid ${m.color}` } : {}}>
                <div className="scr-label">{SEC_EMOJI[sec]} {SEC_NAME[sec]}</div>
                {a ? (
                  <>
                    <div className="scr-score" style={{ color: m.color }}>{a}</div>
                    <div className="scr-tag" style={{ background: m.bg, color: m.color }}>{m.label}</div>
                    <div className="scr-sub">점검 {inspected}홀{uninsp > 0 ? ` / 미점검 ${uninsp}홀` : ''}</div>
                  </>
                ) : <div className="scr-none">미점검</div>}
              </div>
            )
          })}
        </div>
      </div>

      {SEC_KEYS.map(sec => {
        const holes = getHoles(secMap[sec])
        if (!holes.length) return null
        const badHoles = holes.filter(h => h.score < 5 || h.issues?.length > 0)
        const goodWithPhoto = holes.filter(h => h.score >= 5 && !h.issues?.length && h.photos?.length > 0)

        return (
          <div key={sec} className="report-section">
            <h2 className="report-section-title">{SEC_EMOJI[sec]} {SEC_NAME[sec]} 상세</h2>

            <div className="hole-score-bars">
              {holes.map(h => {
                const m = SCORE_META[h.score]
                return (
                  <div key={h.num} className="score-bar-item">
                    <div className="sbi-num">{h.num}번</div>
                    <div className="sbi-bar-wrap">
                      <div className="sbi-bar" style={{ width: `${(h.score / 9) * 100}%`, background: m.color }} />
                    </div>
                    <div className="sbi-score" style={{ color: m.color }}>{h.score}</div>
                    <div className="sbi-label" style={{ color: m.color }}>{m.label}</div>
                  </div>
                )
              })}
            </div>

            {badHoles.length > 0 && (
              <>
                <h3 className="report-sub-title">⚠️ 이슈 발생 홀</h3>
                <div className="issue-cards">
                  {badHoles.map(h => {
                    const m = SCORE_META[h.score]
                    return (
                      <div key={h.num} className="issue-card" style={{ borderLeft: `4px solid ${m.color}` }}>
                        <div className="ic-header">
                          <span className="ic-num">{h.num}번 홀</span>
                          <span className="ic-score-badge" style={{ background: m.color }}>{h.score}점 {m.label}</span>
                        </div>
                        {h.issues?.length > 0 && (
                          <div className="ic-issues">
                            {h.issues.map(i => <span key={i} className="ic-chip">{i}</span>)}
                          </div>
                        )}
                        {h.memo && <div className="ic-memo">📝 {h.memo}</div>}
                        {h.photos?.length > 0 && (
                          <div className="ic-photos">
                            {h.photos.map((p, idx) => (
                              <img key={idx} src={p.dataUrl} alt="" className="ic-photo" />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {goodWithPhoto.map(h => (
              <div key={h.num} className="issue-card" style={{ borderLeft: '4px solid #16a34a' }}>
                <div className="ic-header">
                  <span className="ic-num">{h.num}번 홀</span>
                  <span className="ic-score-badge" style={{ background: SCORE_META[h.score].color }}>{h.score}점 {SCORE_META[h.score].label}</span>
                </div>
                {h.memo && <div className="ic-memo">📝 {h.memo}</div>}
                <div className="ic-photos">
                  {h.photos.map((p, idx) => (
                    <img key={idx} src={p.dataUrl} alt="" className="ic-photo" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {rec.memo && (
        <div className="report-section">
          <h2 className="report-section-title">📋 종합 메모</h2>
          <div className="report-memo">{rec.memo}</div>
        </div>
      )}

      <div className="report-footer">
        점검일: {rec.date} · 점검자: {rec.inspector} · {rec.club}
      </div>
    </div>
  )
}
