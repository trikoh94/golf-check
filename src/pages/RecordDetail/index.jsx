import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SCORE_META, SEC_KEYS, SEC_NAME, SEC_EMOJI } from '../../constants'
import { METRICS, SCORE_METRICS } from '../../lib/scoreCalc'

const METRIC_MAP = Object.fromEntries(METRICS.map(m => [m.key, m]))

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
      .filter(h =>
        h.score !== null ||
        Object.keys(h.detail || {}).some(k => h.detail[k] != null && h.detail[k] !== '') ||
        h.photos?.length > 0 ||
        h.memo
      )
      .sort((a, b) => a.num - b.num)
  }

  function avg(secData) {
    const holes = getHoles(secData).filter(h => h.score != null)
    if (!holes.length) return null
    return (holes.reduce((s, h) => s + h.score, 0) / holes.length).toFixed(1)
  }

  function totalUninspected(secData) {
    const all = Object.values(secData || {})
    const scored = all.filter(h => h.score != null)
    return all.length - scored.length
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
          <div className="meta-item"><span>날씨</span><strong>{rec.weather || '—'}{rec.temperature != null ? ` / ${rec.temperature}°C` : ''}</strong></div>
          {rec.soil_temp_0 != null && <div className="meta-item"><span>토양온도</span><strong>0cm: {rec.soil_temp_0}°C{rec.soil_temp_6 != null ? ` / 6cm: ${rec.soil_temp_6}°C` : ''}</strong></div>}
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
            const inspected = getHoles(secMap[sec]).filter(h => h.score != null).length
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
        const scoredHoles = holes.filter(h => h.score != null)
        const noteHoles = holes.filter(h =>
          (h.score != null && h.score < 5) ||
          h.issues?.length > 0 ||
          h.photos?.length > 0 ||
          h.memo ||
          Object.keys(h.detail || {}).some(k => h.detail[k] != null)
        )

        return (
          <div key={sec} className="report-section">
            <h2 className="report-section-title">{SEC_EMOJI[sec]} {SEC_NAME[sec]} 상세</h2>

            {scoredHoles.length > 0 && (
              <div className="hole-score-bars">
                {scoredHoles.map(h => {
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
            )}

            {noteHoles.length > 0 && (
              <>
                <h3 className="report-sub-title">📌 메모 / 사진 / 이슈 홀</h3>
                <div className="issue-cards">
                  {noteHoles.map(h => {
                    const m = h.score != null ? SCORE_META[h.score] : null
                    const detail = h.detail || {}
                    const sectionMetrics = SCORE_METRICS.filter(met => met.sections.includes(sec))
                    const hasDetail = sectionMetrics.some(met => detail[met.key] != null)
                    return (
                      <div key={h.num} className="issue-card" style={{ borderLeft: `4px solid ${m ? m.color : '#94a3b8'}` }}>
                        <div className="ic-header">
                          <span className="ic-num">{h.num}번 홀</span>
                          {m
                            ? <span className="ic-score-badge" style={{ background: m.color }}>{h.score}점 {m.label}</span>
                            : <span className="ic-score-badge" style={{ background: '#94a3b8' }}>세부입력</span>
                          }
                        </div>

                        {hasDetail && (
                          <div className="ic-detail-metrics">
                            {sectionMetrics.map(met => {
                              const val = detail[met.key]
                              if (val == null) return null
                              const isGood = met.dir === 'good'
                              const colors = isGood
                                ? ['#dc2626','#f97316','#eab308','#16a34a','#0284c7']
                                : ['#0284c7','#16a34a','#eab308','#f97316','#dc2626']
                              return (
                                <div key={met.key} className="ic-metric-row">
                                  <span className="ic-metric-label">{met.emoji} {met.label}</span>
                                  <span className="ic-metric-val" style={{ color: colors[val - 1], fontWeight: 600 }}>{val}/5</span>
                                </div>
                              )
                            })}
                            {/* 수분/그린스피드 */}
                            {detail.moisture != null && (
                              <div className="ic-metric-row">
                                <span className="ic-metric-label">💧 수분</span>
                                <span className="ic-metric-val">{detail.moisture}%</span>
                              </div>
                            )}
                            {detail.greenSpeed != null && sec === 'green' && (
                              <div className="ic-metric-row">
                                <span className="ic-metric-label">⚡ 그린스피드</span>
                                <span className="ic-metric-val">{detail.greenSpeed}ft</span>
                              </div>
                            )}
                            {/* 이종잔디 종류 */}
                            {h.weedTypes && Object.values(h.weedTypes).some(Boolean) && (
                              <div className="ic-metric-row">
                                <span className="ic-metric-label">🌿 이종잔디</span>
                                <span className="ic-metric-val">
                                  {Object.entries(h.weedTypes).filter(([,v]) => v).map(([k]) =>
                                    k === 'kentucky' ? '켄터키' : k === 'bermuda' ? '버뮤다' : '포아'
                                  ).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {h.issues?.length > 0 && (
                          <div className="ic-issues">
                            {h.issues.map(i => <span key={i} className="ic-chip">{i}</span>)}
                          </div>
                        )}
                        {h.memo && <div className="ic-memo">📝 {h.memo}</div>}
                        {h.photos?.length > 0 && (
                          <div className="ic-photos">
                            {h.photos.map((p, idx) => {
                              const src = typeof p === 'string' ? p : p.dataUrl
                              return <img key={idx} src={src} alt="" className="ic-photo" />
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
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
