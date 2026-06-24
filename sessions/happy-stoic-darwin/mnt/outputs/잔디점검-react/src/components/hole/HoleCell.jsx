import { SCORE_META } from '../../constants'

export default function HoleCell({ holeNum, holeData, isOpen, onClick }) {
  const { score, issues, photos } = holeData
  const uninspected = score === null
  const meta = uninspected ? null : SCORE_META[score]
  const hasBadge = !uninspected && (score !== 5 || issues.length > 0)

  const style = uninspected
    ? { background: '#f3f4f6', border: '2px dashed #d1d5db', color: '#9ca3af' }
    : {
        background: meta.bg,
        border: `2px solid ${isOpen ? meta.color : meta.track}`,
        color: meta.color,
      }

  return (
    <button
      onClick={onClick}
      style={style}
      className={`hole-cell${isOpen ? ' open' : ''}${uninspected ? ' uninspected' : ''}`}
    >
      <span className="hole-num">{holeNum}</span>
      <span className="hole-score">{uninspected ? '—' : score}</span>
      {!uninspected && <span className="hole-label">{meta.label}</span>}
      {hasBadge && (
        <span className="hole-badge">
          {issues.length > 0 ? `⚠${issues.length}` : ''}
        </span>
      )}
      {photos.length > 0 && <span className="hole-photo-dot">📷</span>}
    </button>
  )
}
