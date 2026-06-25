import { useRef, useState } from 'react'
import { SCORE_META, SECTION_ISSUES } from '../../constants'
import { useApp } from '../../context/AppContext'

export default function HolePanel({ sec, holeNum, holeData, onClose }) {
  const { setHoleScore, setHoleUninspected, toggleHoleIssue, setHoleMemo, addHolePhotos, removeHolePhoto, showLightbox, showToast } = useApp()
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  const { score, issues, memo, photos } = holeData
  const uninspected = score === null
  const meta = uninspected ? null : SCORE_META[score]
  const issueOptions = SECTION_ISSUES[sec]

  async function handleFileChange(e) {
    const files = Array.from(e.target.files).slice(0, 3 - photos.length)
    if (!files.length) return
    setUploading(true)
    try {
      await addHolePhotos(sec, holeNum, files)
    } catch {
      showToast('사진 업로드 실패', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleUninspected() {
    setHoleUninspected(sec, holeNum)
    onClose()
  }

  return (
    <div className="hole-panel-sheet">
      {/* 헤더 */}
      <div className="hps-header">
        <div className="hps-hole-info">
          <span className="hps-num">{holeNum}번 홀</span>
          {meta && (
            <span className="hps-badge" style={{ background: meta.color }}>
              {score}점 · {meta.label}
            </span>
          )}
        </div>
        <button className="hps-close" onClick={onClose}>✕</button>
      </div>

      {/* 점수 */}
      <div className="hps-score-section">
        <div className="hps-score-row">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n}
              className={`hps-score-btn${score === n ? ' active' : ''}`}
              style={score === n ? { background: SCORE_META[n].color, borderColor: SCORE_META[n].color } : {}}
              onClick={() => setHoleScore(sec, holeNum, n)}>
              {n}
            </button>
          ))}
        </div>
        {meta && (
          <div className="hps-score-bar-wrap">
            <div className="hps-score-bar" style={{ width: `${(score/9)*100}%`, background: meta.color }} />
          </div>
        )}
        {meta && <div className="hps-score-label" style={{ color: meta.color }}>{meta.label}</div>}
      </div>

      {/* 문제 항목 */}
      <div className="hps-section">
        <div className="hps-section-label">문제 항목</div>
        <div className="hps-chips">
          {issueOptions.map(issue => (
            <button key={issue}
              className={`hps-chip${issues.includes(issue) ? ' active' : ''}`}
              style={issues.includes(issue) && meta ? { background: meta.color, color: '#fff', borderColor: meta.color } : {}}
              onClick={() => !uninspected && toggleHoleIssue(sec, holeNum, issue)}
              disabled={uninspected}>
              {issue}
            </button>
          ))}
        </div>
      </div>

      {/* 메모 + 사진 */}
      <div className="hps-bottom-row">
        <textarea className="hps-memo" placeholder="메모 (선택)" value={memo}
          disabled={uninspected} rows={2}
          onChange={e => setHoleMemo(sec, holeNum, e.target.value)} />

        <div className="hps-photos">
          {photos.map((p, i) => (
            <div key={i} className="hps-photo-wrap">
              <img src={p.dataUrl} alt="" className="hps-photo"
                onClick={() => showLightbox(photos, i)} />
              <button className="hps-photo-del"
                onClick={() => removeHolePhoto(sec, holeNum, i)}>✕</button>
            </div>
          ))}

          {/* 업로드 중 스피너 */}
          {uploading && (
            <div className="hps-photo-uploading">⏳</div>
          )}

          {photos.length < 3 && !uninspected && !uploading && (
            <button className="hps-photo-add" onClick={() => fileRef.current?.click()}>
              📷
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
            style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      {!uninspected && (
        <button className="hps-uninspected-btn" onClick={handleUninspected}>
          미점검으로 되돌리기
        </button>
      )}
    </div>
  )
}
