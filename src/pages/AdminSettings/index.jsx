import { useState } from 'react'
import { SCORE_METRICS, DEFAULT_WEIGHTS } from '../../lib/scoreCalc'
import { SEC_NAME, SEC_EMOJI } from '../../constants'
import { useApp } from '../../context/AppContext'

const SECS = ['green', 'fw', 'tee']

export default function AdminSettings() {
  const { weights, updateWeights, showToast } = useApp()
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(weights)))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setWeight(sec, key, val) {
    const num = Math.max(0, Math.min(100, Number(val) || 0))
    setLocal(w => ({ ...w, [sec]: { ...w[sec], [key]: num } }))
    setSaved(false)
  }

  function getTotal(sec) {
    return Object.values(local[sec]).reduce((s, v) => s + (Number(v) || 0), 0)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateWeights(local)
      setSaved(true)
      showToast('가중치 저장 완료 ✅', 'success')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      showToast('저장 실패', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setLocal(JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)))
    setSaved(false)
  }

  const sectionMetrics = (sec) => SCORE_METRICS.filter(m => m.sections.includes(sec))

  return (
    <div className="page-section">
      <h2 className="section-title">⚙️ 점수 가중치 설정</h2>
      <p className="settings-desc">각 항목의 가중치를 조정하세요. 섹션별 합계는 정확히 100%이어야 합니다.</p>

      {SECS.map(sec => {
        const total = getTotal(sec)
        const isValid = total === 100
        return (
          <div key={sec} className="settings-sec-block">
            <div className="settings-sec-header">
              <span>{SEC_EMOJI[sec]} {SEC_NAME[sec]}</span>
              <span className={'settings-total' + (isValid ? ' valid' : ' invalid')}>
                합계 {total}% {isValid ? '✅' : '⚠️ 100%이 되어야 함'}
              </span>
            </div>

            <div className="settings-metric-list">
              {sectionMetrics(sec).map(m => (
                <div key={m.key} className="settings-metric-row">
                  <span className="settings-metric-label">{m.emoji} {m.label}</span>
                  <span className="settings-dir-badge">{m.dir === 'good' ? '↑좋음' : '↓나쁨'}</span>
                  <div className="settings-input-wrap">
                    <input type="number" min="0" max="100"
                      className="settings-input"
                      value={local[sec][m.key] ?? 0}
                      onChange={e => setWeight(sec, m.key, e.target.value)} />
                    <span className="settings-pct">%</span>
                  </div>
                  <div className="settings-bar-wrap">
                    <div className="settings-bar"
                      style={{ width: `${local[sec][m.key] ?? 0}%`, background: m.dir === 'good' ? '#16a34a' : '#dc2626' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="settings-actions">
        <button className="btn-save" onClick={handleSave}
          disabled={saving || SECS.some(s => getTotal(s) !== 100)}>
          {saving ? '저장 중...' : saved ? '✅ 저장됨' : '💾 가중치 저장'}
        </button>
        <button className="settings-btn-reset" onClick={handleReset}>
          기본값으로 초기화
        </button>
      </div>

      <div className="settings-note">
        ※ 가중치는 Supabase에 저장되어 모든 기기에서 동일하게 적용됩니다.
      </div>
    </div>
  )
}
