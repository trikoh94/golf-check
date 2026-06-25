import { useRef } from 'react'
import { SCORE_META, SECTION_ISSUES } from '../../constants'
import { useApp } from '../../context/AppContext'

export default function HolePanel({ sec, holeNum, holeData, onClose }) {
  const { setHoleScore, setHoleUninspected, toggleHoleIssue, setHoleMemo, addHolePhotos, removeHolePhoto, showLightbox } = useApp()
  const fileRef = useRef()

  const { score, issues, memo, photos } = holeData
  const uninspected = score === null
  const meta = uninspected ? null : SCORE_META[score]
  const issueOptions = SECTION_ISSUES[sec]

  function handleFileChange(e) {
    const files = Array.from(e.target.files).slice(0, 2 - photos.length)
    if (files.length) addHolePhotos(sec, holeNum, files)
    e.target.value = ''
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

      {/* 점수 슬라이더 */}
      <div className="hps-score-section">
        <div className="hps-score-row">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              className={`hps-score-btn${score === n ? ' active' : ''}`}
              style={score === n ? { background: SCORE_META[n].color, borderColor: SCORE_META[n].color } : {}}
              onClick={() => setHoleScore(sec, holeNum, n)}
            >
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
            <button
              key={issue}
              className={`hps-chip${issues.includes(issue) ? ' active' : ''}`}
              style={issues.includes(issue) && meta ? { background: meta.color, color: '#fff', borderColor: meta.color } : {}}
              onClick={() => !uninspected && toggleHoleIssue(sec, holeNum, issue)}
              disabled={uninspected}
            >
              {issue}
            </button>
          ))}
        </div>
      </div>

      {/* 메모 + 사진 가로 배치 */}
      <div className="hps-bottom-row">
        <textarea
          className="hps-memo"
          placeholder="메모 (선택)"
          value={memo}
          disabled={uninspected}
          onChange={e => setHoleMemo(sec, holeNum, e.target.value)}
          rows={2}
        />
        <div className="hps-photos">
          {photos.map((p, i) => (
            <div key={i} className="hps-photo-wrap">
              <img src={p.dataUrl} alt="" className="hps-photo" onClick={() => showLightbox(photos, i)} />
              <button className="hps-photo-del" onClick={() => removeHolePhoto(sec, holeNum, i)}>✕</button>
            </div>
          ))}
          {photos.length < 2 && !uninspected && (
            <button className="hps-photo-add" onClick={() => fileRef.current?.click()}>
              📷
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      {/* 미점검 버튼 */}
      {!uninspected && (
        <button className="hps-uninspected-btn" onClick={handleUninspected}>
          미점검으로 되돌리기
        </button>
      )}
    </div>
  )
}
