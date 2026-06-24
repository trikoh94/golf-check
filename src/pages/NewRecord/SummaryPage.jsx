import { useApp } from '../../context/AppContext'
import { SCORE_META, SEC_KEYS, SEC_NAME, SEC_EMOJI } from '../../constants'
import { supabase } from '../../lib/supabase'

export default function SummaryPage({ onSaved }) {
  const { formData, holeState, showToast, resetAll } = useApp()

  function avgScore(sec) {
    const inspected = Object.values(holeState[sec]).filter(h => h.score !== null)
    if (!inspected.length) return null
    return (inspected.reduce((s, h) => s + h.score, 0) / inspected.length).toFixed(1)
  }

  function countUninspected(sec) {
    return Object.values(holeState[sec]).filter(h => h.score === null).length
  }

  async function handleSave() {
    const { date, club, course, inspector, weather, nextVisit, memo, holeCount } = formData
    if (!date || !inspector) {
      showToast('점검일자와 점검자는 필수입니다', 'error')
      return
    }

    const payload = {
      date,
      club: club || '해남 파인트리 골프장',
      course: course || null,
      inspector,
      weather: weather || null,
      next_visit: nextVisit || null,
      memo: memo || null,
      hole_count: holeCount,
      tee: holeState.tee,
      fairway: holeState.fw,
      green: holeState.green,
    }

    const { error } = await supabase.from('inspections').insert([payload])
    if (error) {
      console.error(error)
      showToast('저장 실패: ' + error.message, 'error')
    } else {
      showToast('저장 완료!', 'success')
      setTimeout(() => { resetAll(); onSaved?.() }, 800)
    }
  }

  return (
    <div className="page-section">
      <h2 className="section-title">종합 요약</h2>

      <div className="summary-info">
        <div className="info-row"><span>점검일</span><strong>{formData.date}</strong></div>
        <div className="info-row"><span>골프장</span><strong>{formData.club}</strong></div>
        <div className="info-row"><span>코스</span><strong>{formData.course || '—'}</strong></div>
        <div className="info-row"><span>점검자</span><strong>{formData.inspector || '—'}</strong></div>
        <div className="info-row"><span>날씨</span><strong>{formData.weather || '—'}</strong></div>
      </div>

      <div className="summary-cards">
        {SEC_KEYS.map(sec => {
          const avg = avgScore(sec)
          const uninspected = countUninspected(sec)
          const meta = avg ? SCORE_META[Math.round(Number(avg))] : null
          return (
            <div key={sec} className="summary-card" style={meta ? { borderLeft: `4px solid ${meta.color}` } : {}}>
              <div className="summary-card-title">{SEC_EMOJI[sec]} {SEC_NAME[sec]}</div>
              {avg ? (
                <>
                  <div className="summary-score" style={{ color: meta.color }}>{avg}점</div>
                  <div className="summary-label">{meta.label}</div>
                  {uninspected > 0 && <div className="summary-uninspected">미점검 {uninspected}홀</div>}
                </>
              ) : (
                <div className="summary-no-data">미점검</div>
              )}
            </div>
          )
        })}
      </div>

      {formData.memo && (
        <div className="summary-memo">
          <strong>메모</strong>
          <p>{formData.memo}</p>
        </div>
      )}

      <button className="btn-save" onClick={handleSave}>
        💾 저장하기
      </button>
    </div>
  )
}
