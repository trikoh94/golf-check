import { useRef, useState, useEffect } from 'react'
import { SCORE_META } from '../../constants'
import { useApp } from '../../context/AppContext'
import { METRICS, SCORE_METRICS, calcHoleScore, loadWeights } from '../../lib/scoreCalc'
import { uploadPhoto } from '../../lib/uploadPhoto'

const WEED_TYPES = [
  { key: 'kentucky', label: '켄터키블루그래스' },
  { key: 'bermuda',  label: '버뮤다그래스' },
  { key: 'poa',      label: '포아(Poa)' },
]

export default function HolePanel({ sec, holeNum, holeData, onClose }) {
  const { setHoleDetail, setHoleUninspected, setHoleMemo, addHolePhotos, removeHolePhoto, showLightbox, showToast } = useApp()

  const { score, detail = {}, weedTypes = {}, memo, photos } = holeData
  const weights = loadWeights()

  const [localDetail, setLocalDetail] = useState({ ...detail })
  const [localWeed, setLocalWeed] = useState({ ...weedTypes })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  // 자동 계산 점수
  const calcScore = calcHoleScore(localDetail, sec, weights)
  const hasAnyInput = Object.keys(localDetail).some(k => localDetail[k] != null && localDetail[k] !== '')
  const displayScore = hasAnyInput ? calcScore : score
  const meta = displayScore ? SCORE_META[displayScore] : null

  // 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    if (!hasAnyInput) return
    const t = setTimeout(() => {
      setHoleDetail(sec, holeNum, localDetail, calcScore, localWeed)
    }, 400)
    return () => clearTimeout(t)
  }, [localDetail, localWeed])

  function setMetric(key, val) {
    setLocalDetail(d => ({ ...d, [key]: val }))
  }

  function toggleWeed(key) {
    setLocalWeed(w => ({ ...w, [key]: !w[key] }))
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files)
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

  const sectionMetrics = SCORE_METRICS.filter(m => m.sections.includes(sec))
  const extraMetrics = METRICS.filter(m => m.dir === 'range' || m.dir === 'info').filter(m => m.sections.includes(sec))

  return (
    <div className="hole-panel-sheet">
      {/* 헤더 */}
      <div className="hps-header">
        <div className="hps-hole-info">
          <span className="hps-num">{holeNum}번 홀</span>
          {meta && (
            <span className="hps-badge" style={{ background: meta.color }}>
              {displayScore}점 · {meta.label}
            </span>
          )}
          {!hasAnyInput && <span className="hps-hint">항목 입력 시 자동 계산</span>}
        </div>
        <button className="hps-close" onClick={onClose}>✕</button>
      </div>

      {/* 종합점수 바 */}
      {meta && (
        <div className="hps-score-bar-wrap">
          <div className="hps-score-bar" style={{ width: `${(displayScore/9)*100}%`, background: meta.color }} />
        </div>
      )}

      {/* 세부 항목 */}
      <div className="hps-metrics">

        {/* 품질 지표 */}
        <div className="hps-metric-group">
          <div className="hps-metric-group-title">📊 품질 지표 <span>(높을수록 좋음)</span></div>
          {sectionMetrics.filter(m => m.dir === 'good').map(m => (
            <MetricRow key={m.key} metric={m} value={localDetail[m.key]} onChange={v => setMetric(m.key, v)} />
          ))}
        </div>

        {/* 문제 지표 */}
        <div className="hps-metric-group">
          <div className="hps-metric-group-title">⚠️ 문제 지표 <span>(높을수록 심각)</span></div>
          {sectionMetrics.filter(m => m.dir === 'bad').map(m => (
            <div key={m.key}>
              <MetricRow metric={m} value={localDetail[m.key]} onChange={v => setMetric(m.key, v)} />
              {/* 이종잔디 선택 시 잡초 종류 표시 */}
              {m.key === 'weedGrass' && localDetail.weedGrass != null && localDetail.weedGrass >= 2 && (
                <div className="hps-weed-types">
                  {WEED_TYPES.map(w => (
                    <button key={w.key}
                      className={'hps-weed-btn' + (localWeed[w.key] ? ' active' : '')}
                      onClick={() => toggleWeed(w.key)}>
                      {w.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 측정값 (수분, 그린스피드) */}
        {extraMetrics.length > 0 && (
          <div className="hps-metric-group">
            <div className="hps-metric-group-title">📏 측정값</div>
            {extraMetrics.map(m => (
              <div key={m.key} className="hps-metric-row">
                <span className="hps-metric-label">{m.emoji} {m.label}</span>
                <div className="hps-number-input-wrap">
                  <input type="number" className="hps-number-input"
                    placeholder="—" value={localDetail[m.key] ?? ''}
                    onChange={e => setMetric(m.key, e.target.value === '' ? null : Number(e.target.value))} />
                  <span className="hps-unit">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 메모 + 사진 */}
      <div className="hps-bottom-row">
        <textarea className="hps-memo" placeholder="메모 (선택)" value={memo} rows={2}
          onChange={e => setHoleMemo(sec, holeNum, e.target.value)} />
        <div className="hps-photos">
          {photos.map((p, i) => (
            <div key={i} className="hps-photo-wrap">
              <img src={p.dataUrl} alt="" className="hps-photo" onClick={() => showLightbox(photos, i)} />
              <button className="hps-photo-del" onClick={() => removeHolePhoto(sec, holeNum, i)}>✕</button>
            </div>
          ))}
          {uploading && <div className="hps-photo-uploading">⏳</div>}
          {!uploading && (
            <button className="hps-photo-add" onClick={() => fileRef.current?.click()}>📷</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
            style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      {/* 미점검 버튼 */}
      {hasAnyInput && (
        <button className="hps-uninspected-btn" onClick={handleUninspected}>
          미점검으로 되돌리기
        </button>
      )}
    </div>
  )
}

function MetricRow({ metric, value, onChange }) {
  return (
    <div className="hps-metric-row">
      <span className="hps-metric-label">{metric.emoji} {metric.label}</span>
      <div className="hps-metric-btns">
        {[1,2,3,4,5].map(n => (
          <button key={n}
            className={'hps-m-btn' + (value === n ? ' active' : '')}
            style={value === n ? {
              background: metric.dir === 'good'
                ? ['#dc2626','#f97316','#eab308','#16a34a','#0284c7'][n-1]
                : ['#0284c7','#16a34a','#eab308','#f97316','#dc2626'][n-1],
              borderColor: 'transparent', color: '#fff'
            } : {}}
            onClick={() => onChange(value === n ? null : n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
