import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { SUBTABS, SUBTAB_LABEL, SEC_KEYS } from '../../constants'
import BasicInfo from './BasicInfo'
import SectionPage from './SectionPage'
import SummaryPage from './SummaryPage'

export default function NewRecord({ onSaved }) {
  const [subtab, setSubtab] = useState('basic')
  const { holeState } = useApp()

  function getBadge(tab) {
    if (!SEC_KEYS.includes(tab)) return 0
    return Object.values(holeState[tab]).filter(
      h => h.score !== null && (h.score !== 5 || h.issues.length > 0)
    ).length
  }

  function renderContent() {
    if (subtab === 'basic') return <BasicInfo />
    if (subtab === 'summary') return <SummaryPage onSaved={onSaved} />
    return <SectionPage sec={subtab} />
  }

  return (
    <div className="new-record">
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
