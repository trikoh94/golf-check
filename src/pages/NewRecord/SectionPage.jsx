import { SEC_NAME, SEC_EMOJI } from '../../constants'
import HoleGrid from '../../components/hole/HoleGrid'
import { useApp } from '../../context/AppContext'

export default function SectionPage({ sec }) {
  const { holeState } = useApp()
  const holes = holeState[sec]
  const inspectedCount = Object.values(holes).filter(h => h.score !== null).length
  const issueCount = Object.values(holes).filter(h => h.score !== null && (h.score !== 5 || (h.issues?.length ?? 0) > 0)).length

  return (
    <div className="page-section">
      <div className="section-header">
        <h2 className="section-title">{SEC_EMOJI[sec]} {SEC_NAME[sec]}</h2>
        <div className="section-stats">
          <span className="stat-chip">점검 {inspectedCount}홀</span>
          {issueCount > 0 && <span className="stat-chip warn">이슈 {issueCount}홀</span>}
        </div>
      </div>
      <HoleGrid sec={sec} />
    </div>
  )
}
