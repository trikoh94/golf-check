import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { SUBTABS, SUBTAB_LABEL, SEC_KEYS } from '../../constants'
import BasicInfo from './BasicInfo'
import SectionPage from './SectionPage'
import SummaryPage from './SummaryPage'

export default function NewRecord({ onSaved }) {
  const [subtab, setSubtab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const { holeState, saveDraft, showToast } = useApp()

  function getBadge(tab) {
    if (!SEC_KEYS.includes(tab)) return 0
    return Object.values(holeState[tab]).filter(
      h => h.score !== null && (h.score !== 5 || (h.issues?.length ?? 0) > 0)
    ).length
  }

  async function handleDraftSave() {
    setSaving(true)
    try {
      const result = await saveDraft()
      if (result?.error) {
        showToast('임시저장 실패: ' + result.error.message, 'error')
      } else {
        showToast('임시저장 완료 ✓', 'success')
      }
    } catch (e) {
      showToast('임시저장 실패', 'error')
    } finally {
      setSaving(false)
    }
  }

  function renderContent() {
    if (subtab === 'basic') return <BasicInfo />
    if (subtab === 'summary') return <SummaryPage onSaved={onSaved} />
    return <SectionPage sec={subtab} />
  }

  return (
    <div className="new-record">
      {/* 임시저장 바 - 탭보다 위 */}
      <div className="draft-save-bar">
        <span className="draft-save-bar-label">작성 중인 점검</span>
        <button
          className={'btn-draft-save' + (saving ? ' loading' : '')}
          onClick={handleDraftSave}
          disabled={saving}
        >
          {saving ? '⏳ 저장 중...' : '💾 임시저장'}
        </button>
      </div>
      {/* 탭 네비게이션 */}
      <nav className="subtab-nav">
        {SUBTABS.map(tab => {
          const badge = getBadge(tab)
          return (
            <button
              key={tab}
              className={'subtab' + (subtab === tab ? ' active' : '')}
              onClick={() => setSubtab(tab)}
            >
              {SUBTAB_LABEL[tab]}
              {badge > 0 && <span className="subtab-badge">{badge}</span>}
            </button>
          )
        })}
      </nav>
      <div className="subtab-content">
        {renderContent()}
      </div>
    </div>
  )
}
