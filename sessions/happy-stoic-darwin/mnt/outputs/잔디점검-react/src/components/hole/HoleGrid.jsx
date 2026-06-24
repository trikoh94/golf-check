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
    if (openHole === holeNum) {
      setOpenHole(null)
      return
    }
    // activate uninspected hole to score 5 on first tap
    activateHole(sec, holeNum)
    setOpenHole(holeNum)
  }

  // split into 9-hole blocks
  const blocks = []
  for (let start = 1; start <= holeCount; start += 9) {
    blocks.push({ label: `${start}~${Math.min(start + 8, holeCount)}홀`, holes: range(start, Math.min(start + 8, holeCount)) })
  }

  return (
    <div className="hole-grid-container">
      {blocks.map(({ label, holes }) => (
        <div key={label} className="hole-block">
          <div className="hole-block-label">{label}</div>
          <div className="hole-grid">
            {holes.map(n => (
              <div key={n}>
                <HoleCell
                  holeNum={n}
                  holeData={sectionData[n]}
                  isOpen={openHole === n}
                  onClick={() => handleCellClick(n)}
                />
                {openHole === n && (
                  <HolePanel
                    sec={sec}
                    holeNum={n}
                    holeData={sectionData[n]}
                    onClose={() => setOpenHole(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function range(start, end) {
  const arr = []
  for (let i = start; i <= end; i++) arr.push(i)
  return arr
}
