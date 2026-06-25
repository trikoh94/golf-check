import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const WORK_TYPES = {
  fungicide:   '🧪 살균제 살포',
  insecticide: '🐛 살충제 살포',
  fertilizer:  '🌱 시비',
  mowing:      '✂️ 예초',
  watering:    '💧 관개',
  observation: '👁 관찰만',
  other:       '📝 기타',
}
const SECTIONS = {
  green: '그린',
  fw:    '페어웨이',
  tee:   '티잉그라운드',
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function WorkCheck() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(TODAY)
  const [secFilter, setSecFilter] = useState('all')

  useEffect(() => { fetchLogs() }, [dateFilter, secFilter])

  async function fetchLogs() {
    setLoading(true)
    let q = supabase.from('work_logs').select('*').eq('date', dateFilter).order('created_at', { ascending: false })
    if (secFilter !== 'all') q = q.eq('section', secFilter)
    const { data } = await q
    setLogs(data ?? [])
    setLoading(false)
  }

  // 섹션별 / 작업유형별 요약
  const summary = logs.reduce((acc, l) => {
    const k = l.work_type
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="page-section">
      <h2 className="section-title">✅ 작업 확인</h2>

      {/* 필터 */}
      <div className="wc-filters">
        <input type="date" className="form-input" value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ maxWidth: '160px' }} />
        <div className="btn-group">
          {[['all','전체'], ['green','그린'], ['fw','페어웨이'], ['tee','티']].map(([k, l]) => (
            <button key={k}
              className={'btn-option' + (secFilter === k ? ' active' : '')}
              onClick={() => setSecFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* 요약 칩 */}
      {logs.length > 0 && (
        <div className="wc-summary">
          <span className="wc-total">총 {logs.length}건</span>
          {Object.entries(summary).map(([k, cnt]) => (
            <span key={k} className="wc-chip">{WORK_TYPES[k] ?? k} {cnt}건</span>
          ))}
        </div>
      )}

      {/* 로그 목록 */}
      {loading ? (
        <div className="wc-empty">불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div className="wc-empty">해당 날짜 기록 없음</div>
      ) : (
        <div className="wc-log-list">
          {logs.map((log, i) => {
            const risks = log.detail?.risks_at_time ?? []
            return (
              <div key={log.id ?? i} className="wc-log-item">
                <div className="wcl-top">
                  <span className="wcl-hole">{log.detail?.hole_num ?? '?'}번홀</span>
                  <span className="wcl-sec">{SECTIONS[log.section] ?? log.section}</span>
                  <span className="wcl-type">{WORK_TYPES[log.work_type] ?? log.work_type}</span>
                  {log.inspector && <span className="wcl-who">👤 {log.inspector}</span>}
                  <span className="wcl-time">
                    {new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {log.detail?.disease_context && (
                  <div className="wcl-disease">🦠 {log.detail.disease_context} 맥락에서 작업</div>
                )}
                {risks.length > 0 && (
                  <div className="wcl-risks">
                    당시 위험도: {risks.map(r => `${r.name} ${r.score}점`).join(' · ')}
                  </div>
                )}
                {log.memo && <div className="wcl-memo">"{log.memo}"</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
