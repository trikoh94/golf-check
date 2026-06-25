import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import HoleCell from './HoleCell'
import HolePanel from './HolePanel'

export default function HoleGrid({ sec }) {
  const { formData, holeState, activateHole } = useApp()
  const { holeCount } = formData
  const sectionData = holeState[sec]
  const [openHole, setOpenHole] = useState(null)

  function handleCellClick(holeNum) {
    activateHole(sec, holeNum)
    setOpenHole(holeNum)
  }

  const blocks = []
  for (let start = 1; start <= holeCount; start += 9) {
    blocks.push({
      label: `${start}~${Math.min(start + 8, holeCount)}홀`,
      holes: Array.from({ length: Math.min(9, holeCount - start + 1) }, (_, i) => start + i)
    })
  }

  return (
    <>
      <div className="hole-grid-container">
        {blocks.map(({ label, holes }) => (
          <div key={label} className="hole-block">
            <div className="hole-block-label">{label}</div>
            <div className="hole-grid">
              {holes.map(n => (
                <HoleCell
                  key={n}
                  holeNum={n}
                  holeData={sectionData[n]}
                  isOpen={openHole === n}
                  onClick={() => handleCellClick(n)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 바텀 시트 */}
      {openHole !== null && (
        <>
          <div className="bottom-sheet-backdrop" onClick={() => setOpenHole(null)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <HolePanel
              sec={sec}
              holeNum={openHole}
              holeData={sectionData[openHole]}
              onClose={() => setOpenHole(null)}
            />
          </div>
        </>
      )}
    </>
  )
}
