import { calcDiseaseRisk, calcForecastRisk } from '../../lib/diseaseRisk'

const LEVEL_COLOR = { '위험': '#dc2626', '주의': '#d97706', '관찰': '#2563eb', '낮음': '#16a34a' }
const LEVEL_BG    = { '위험': '#fef2f2', '주의': '#fffbeb', '관찰': '#eff6ff', '낮음': '#f0fdf4' }

const GRASS_BADGE = {
  bentgrass: { label: '벤트 그린', color: '#0369a1', bg: '#e0f2fe' },
  zoysia:    { label: '고려지 F/T', color: '#15803d', bg: '#dcfce7' },
  all:       { label: '전 구역', color: '#7c3aed', bg: '#ede9fe' },
}

const WEEK_DAYS = ['일','월','화','수','목','금','토']

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const wd = WEEK_DAYS[d.getDay()]
  return `${m}/${day}(${wd})`
}

function RiskBar({ value, color }) {
  return (
    <div className="dp-mini-bar-wrap">
      <div className="dp-mini-bar" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

// 관리 권고 로직
function getRecommendations(risks) {
  const recs = []
  const bentHighRisk = risks.find(r =>
    (r.grass_type === 'bentgrass') && (r.level === '위험' || r.level === '주의')
  )
  const pythium = risks.find(r => r.name === '피시움 블라이트')
  const brownPatch = risks.find(r => r.name === '브라운패치')
  const dollarSpot = risks.find(r => r.name === '달러스팟')
  const grayLeaf = risks.find(r => r.name?.includes('잿빛'))

  if (pythium && pythium.score >= 50) {
    recs.push({ icon: '🚨', text: '피시움 블라이트 즉각 대응 — 야간 경보 발령. mefenoxam/chloroneb 계열 약제 처리 검토', urgent: true })
  }
  if (brownPatch && brownPatch.score >= 50) {
    recs.push({ icon: '⚠️', text: '브라운패치 예방: 이른 아침 관수(이슬 제거), azoxystrobin/trifloxystrobin 예방 처리 검토' })
  }
  if (brownPatch || pythium) {
    recs.push({ icon: '💧', text: '그린 야간 수분 제거: 이른 아침 폴링/스와이핑으로 이슬·구타물 제거' })
    recs.push({ icon: '🌡️', text: '벤트그래스 스트레스 완화: 야간 팬/써큘레이터 가동, 낮 관수 억제' })
  }
  if (dollarSpot && dollarSpot.score >= 50) {
    recs.push({ icon: '🌿', text: '달러스팟 대응: 질소 시비량 확인 (저질소 조건 악화). thiophanate-methyl 예방 처리' })
  }
  if (grayLeaf && grayLeaf.score >= 50) {
    recs.push({ icon: '🌾', text: '고려지 잿빛곰팡이: 페어웨이 배수 개선, azoxystrobin 처리 검토' })
  }
  if (!recs.length && risks.length) {
    recs.push({ icon: '👁️', text: '현재 수준 모니터링 유지. 병반 초기 징후 발견 시 즉시 보고' })
  }
  return recs
}

export default function DiseasePanel({ weatherRaw }) {
  if (!weatherRaw) return null

  const risks = calcDiseaseRisk(weatherRaw)
  const forecast = calcForecastRisk(weatherRaw.forecast7d ?? [])
  const recs = getRecommendations(risks)

  return (
    <div className="disease-panel">
      <div className="dp-title">🔬 병해 위험도 분석</div>

      {/* 현재 위험도 */}
      {risks.length === 0 ? (
        <div className="dp-safe">✅ 현재 기상 조건상 병해 발생 위험 낮음</div>
      ) : (
        <div className="dp-list">
          {risks.map(r => {
            const badge = GRASS_BADGE[r.grass_type] ?? GRASS_BADGE.all
            return (
              <div key={r.name} className="dp-card"
                style={{ borderLeft: `4px solid ${r.color}`, background: LEVEL_BG[r.level] }}>
                <div className="dp-card-header">
                  <div className="dp-name-row">
                    <span className="dp-name">{r.name}</span>
                    <span className="dp-grass-badge" style={{ color: badge.color, background: badge.bg }}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="dp-right">
                    <span className="dp-level" style={{ background: r.color, color: '#fff' }}>{r.level}</span>
                    <span className="dp-score" style={{ color: r.color }}>{r.score}점</span>
                  </div>
                </div>
                <span className="dp-pathogen">{r.pathogen}</span>

                <div className="dp-bar-wrap">
                  <div className="dp-bar" style={{ width: `${r.score}%`, background: r.color }} />
                </div>

                <div className="dp-sections">
                  발생 구역: {r.section.map(s => ({tee:'티잉',fw:'페어웨이',green:'그린'}[s])).join(' · ')}
                </div>

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
            )
          })}
        </div>
      )}

      {/* 7일 예보 타임라인 */}
      {forecast.length > 0 && (
        <div className="dp-forecast">
          <div className="dp-forecast-title">📅 7일 예보 위험도</div>
          <div className="dp-forecast-legend">
            <span style={{ color: '#0369a1' }}>■ 벤트그래스(그린)</span>
            <span style={{ color: '#15803d' }}>■ 고려지(F/T)</span>
          </div>
          <div className="dp-forecast-grid">
            {forecast.map(day => (
              <div key={day.date} className="dp-forecast-day">
                <div className="dp-fd-date">{formatDate(day.date)}</div>
                <div className="dp-fd-temp">
                  <span className="dp-fd-tmax">{day.t_max != null ? `${day.t_max}°` : '—'}</span>
                  <span className="dp-fd-tmin">{day.t_min != null ? `${day.t_min}°` : '—'}</span>
                </div>
                {day.rain > 0 && <div className="dp-fd-rain">🌧 {day.rain.toFixed(1)}</div>}
                <div className="dp-fd-bars">
                  <RiskBar value={day.bentgrassRisk} color="#0369a1" />
                  <RiskBar value={day.zoysiaRisk}    color="#15803d" />
                </div>
                <div className="dp-fd-level" style={{ color: LEVEL_COLOR[day.level] ?? '#6b7280' }}>
                  {day.level}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 관리 권고사항 */}
      {recs.length > 0 && (
        <div className="dp-recs">
          <div className="dp-recs-title">📋 관리 권고사항</div>
          {recs.map((rec, i) => (
            <div key={i} className={'dp-rec' + (rec.urgent ? ' dp-rec--urgent' : '')}>
              <span>{rec.icon}</span>
              <span>{rec.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
