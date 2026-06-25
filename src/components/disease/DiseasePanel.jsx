import { calcDiseaseRisk } from '../../lib/diseaseRisk'

const LEVEL_COLOR = { '위험': '#dc2626', '주의': '#d97706', '관찰': '#2563eb' }
const LEVEL_BG    = { '위험': '#fef2f2', '주의': '#fffbeb', '관찰': '#eff6ff' }

export default function DiseasePanel({ weatherRaw }) {
  if (!weatherRaw) return null
  const risks = calcDiseaseRisk(weatherRaw)
  if (!risks.length) return (
    <div className="disease-panel safe">
      <div className="dp-title">🛡️ 병해 위험도</div>
      <div className="dp-safe">현재 병해 발생 위험 낮음</div>
    </div>
  )

  return (
    <div className="disease-panel">
      <div className="dp-title">⚠️ 병해 위험도 분석</div>
      <div className="dp-list">
        {risks.map(r => (
          <div key={r.name} className="dp-card" style={{ borderLeft: `4px solid ${r.color}`, background: LEVEL_BG[r.level] }}>
            <div className="dp-card-header">
              <div>
                <span className="dp-name">{r.name}</span>
                <span className="dp-pathogen">{r.pathogen}</span>
              </div>
              <div className="dp-right">
                <span className="dp-level" style={{ background: r.color, color: '#fff' }}>{r.level}</span>
                <span className="dp-score" style={{ color: r.color }}>{r.score}점</span>
              </div>
            </div>

            {/* 점수 바 */}
            <div className="dp-bar-wrap">
              <div className="dp-bar" style={{ width: `${r.score}%`, background: r.color }} />
            </div>

            {/* 영향 구역 */}
            <div className="dp-sections">
              주요 발생: {r.section.map(s => ({tee:'티잉',fw:'페어웨이',green:'그린'}[s])).join(' · ')}
            </div>

            {/* 위험 근거 */}
            <div className="dp-reasons">
              {r.reasons.map((reason, i) => (
                <div key={i} className="dp-reason">• {reason}</div>
              ))}
            </div>

            <div className="dp-desc">{r.description}</div>

            {r.urgent && (
              <div className="dp-urgent">🚨 즉각 대응 필요 — 약제 처리 검토</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
