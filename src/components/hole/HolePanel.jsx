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

  function handleSlider(e) {
    setHoleScore(sec, holeNum, Number(e.target.value))
  }

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
    <div className="hole-panel" style={meta ? { borderTop: `3px solid ${meta.color}` } : {}}>
      <div className="panel-header">
        <span className="panel-title">{holeNum}번 홀</span>
        {meta && (
          <span className="panel-score-badge" style={{ background: meta.color }}>
            {score}점 {meta.label}
          </span>
        )}
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Slider */}
      <div className="slider-wrap">
        <input
          type="range"
          min={1}
          max={9}
          step={1}
          value={uninspected ? 5 : score}
          disabled={uninspected}
          onChange={handleSlider}
          style={meta ? { accentColor: meta.color } : {}}
        />
        <div className="slider-labels">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <span key={n} style={{ color: SCORE_META[n].color, fontWeight: score === n ? 700 : 400 }}>
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Issue chips */}
      <div className="issue-chips">
        {issueOptions.map(issue => (
          <button
            key={issue}
            className={`chip${issues.includes(issue) ? ' active' : ''}`}
            onClick={() => {
              if (uninspected) return
              toggleHoleIssue(sec, holeNum, issue)
            }}
            disabled={uninspected}
            style={issues.includes(issue) && meta ? { background: meta.color, color: '#fff', borderColor: meta.color } : {}}
          >
            {issue}
          </button>
        ))}
      </div>

      {/* Memo */}
      <textarea
        className="hole-memo"
        placeholder="홀 메모 (선택)"
        value={memo}
        disabled={uninspected}
        onChange={e => setHoleMemo(sec, holeNum, e.target.value)}
        rows={2}
      />

      {/* Photos */}
      <div className="photo-row">
        {photos.map((p, i) => (
          <div key={i} className="photo-thumb-wrap">
            <img
              src={p.dataUrl}
              alt={p.name}
              className="photo-thumb"
              onClick={() => showLightbox(photos, i)}
            />
            <button className="photo-remove" onClick={() => removeHolePhoto(sec, holeNum, i)}>✕</button>
          </div>
        ))}
        {photos.length < 2 && !uninspected && (
          <button className="photo-add-btn" onClick={() => fileRef.current?.click()}>
            📷 사진 추가
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Bottom actions */}
      <div className="panel-actions">
        <button className="btn-uninspected" onClick={handleUninspected}>
          미점검으로 되돌리기
        </button>
      </div>
    </div>
  )
}
