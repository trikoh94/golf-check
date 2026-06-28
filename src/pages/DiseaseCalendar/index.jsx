import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { calcDiseaseRisk } from '../../lib/diseaseRisk'

const LEVEL_COLOR = { '위험': '#dc2626', '주의': '#d97706', '관찰': '#2563eb', '낮음': '#16a34a', '—': '#e5e7eb' }
const LEVEL_BG    = { '위험': '#fef2f2', '주의': '#fff7ed', '관찰': '#eff6ff', '낮음': '#f0fdf4', '—': '#f9fafb' }
const WEEK_DAYS   = ['일','월','화','수','목','금','토']
const DISEASE_NAMES = ['탄저병','피시움 블라이트','브라운패치','달러스팟','잿빛곰팡이(회엽고병)','라지패치']

function getRisk(day) {
  if (!day.t_max) return { level: '—', score: 0, risks: [], topDisease: null }
  const w = {
    temperature:   day.t_max,
    humidity:      day.humidity,
    dew_point:     day.dew_point,
    night_min:     day.t_min,
    soil_temp_0:   null,
    et_day:        day.et,
    precipitation: day.rain ?? 0,
  }
  const risks = calcDiseaseRisk(w)
  const top   = risks[0]
  const score = top?.score ?? 0
  const level = score >= 70 ? '위험' : score >= 50 ? '주의' : score >= 30 ? '관찰' : score > 0 ? '낮음' : '—'
  return { level, score, risks, topDisease: top?.name ?? null }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth()+1}/${d.getDate()}(${WEEK_DAYS[d.getDay()]})`
}

function DayDetail({ day }) {
  const { risks } = day
  return (
    <div className="dc-detail">
      <div className="dc-detail-header">
        <span className="dc-detail-date">{formatDate(day.date)}</span>
        {day.is_forecast && <span className="dc-detail-tag dc-tag-forecast">예보</span>}
        {day.is_past     && <span className="dc-detail-tag dc-tag-past">실측</span>}
        {day.is_today    && <span className="dc-detail-tag dc-tag-today">오늘</span>}
      </div>
      <div className="dc-detail-weather">
        <span>🌡️ {day.t_max != null ? `최고 ${day.t_max}°C` : '—'}</span>
        <span>🌙 {day.t_min != null ? `최저 ${day.t_min}°C` : '—'}</span>
        <span>💧 {day.humidity != null ? `${day.humidity}%` : '—'}</span>
        {(day.rain ?? 0) > 0 && <span>🌧️ {day.rain.toFixed(1)}mm</span>}
      </div>
      {(!risks || risks.length === 0) ? (
        <div className="dc-detail-safe">✅ 병해 발생 위험 낮음</div>
      ) : (
        <div className="dc-detail-risks">
          {risks.map(r => (
            <div key={r.name} className="dc-drr" style={{ borderLeft: `3px solid ${r.color}` }}>
              <div className="dc-drr-top">
                <span className="dc-drr-name">{r.name}</span>
                <span className="dc-drr-badge" style={{ background: r.color }}>{r.level}</span>
                <span className="dc-drr-score" style={{ color: r.color }}>{r.score}점</span>
              </div>
              <div className="dc-drr-reasons">
                {r.reasons.slice(0,3).map((rs,i) => <span key={i}>• {rs}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DiseaseCalendar() {
  const [days, setDays]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(() => {
    fetch('/api/weather-monthly')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        const enriched = d.days.map(day => ({ ...day, ...getRisk(day) }))
        setDays(enriched)
        setSelected(enriched.find(d => d.is_today) ?? enriched[enriched.length - 1] ?? null)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const [y, m] = viewMonth.split('-').map(Number)

  const calendarCells = (() => {
    const firstDow = new Date(y, m-1, 1).getDay()
    const lastDate  = new Date(y, m, 0).getDate()
    const cells = Array(firstDow).fill(null)
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      cells.push(days.find(x => x.date === dateStr) ?? { date: dateStr, noData: true })
    }
    return cells
  })()

  function changeMonth(delta) {
    const nd = new Date(y, m-1+delta, 1)
    setViewMonth(`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`)
  }

  function handleExcelDownload() {
    const rows = days.map(day => {
      const dm = {}
      DISEASE_NAMES.forEach(name => {
        const f = day.risks?.find(r => r.name === name)
        dm[name] = f ? `${f.level}(${f.score}점)` : '—'
      })
      return {
        '날짜':       day.date,
        '구분':       day.is_today ? '오늘' : day.is_past ? '실측' : '예보',
        '최고기온':   day.t_max   ?? '',
        '최저기온':   day.t_min   ?? '',
        '최대습도(%)': day.humidity ?? '',
        '강수량(mm)': day.rain    ?? 0,
        '종합위험':   day.level   ?? '—',
        '탄저병':     dm['탄저병'],
        '피시움':     dm['피시움 블라이트'],
        '브라운패치': dm['브라운패치'],
        '달러스팟':   dm['달러스팟'],
        '잿빛곰팡이': dm['잿빛곰팡이(회엽고병)'],
        '라지패치':   dm['라지패치'],
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12,6,8,8,10,9,8,10,8,10,8,10,8].map(wch => ({ wch }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '병해위험도')
    XLSX.writeFile(wb, `병해위험도_${y}년${m}월_솔라시도.xlsx`)
  }

  if (loading) return <div className="loading">날씨 데이터 불러오는 중...</div>
  if (error)   return <div className="empty">데이터 오류: {error}</div>

  return (
    <div className="dc-page">
      <div className="dc-header">
        <div className="dc-title-row">
          <span className="dc-title">🦠 병해 위험도 캘린더</span>
          <button className="dc-excel-btn" onClick={handleExcelDownload}>📥 엑셀 다운</button>
        </div>
        <div className="dc-legend">
          {[['위험','#dc2626'],['주의','#d97706'],['관찰','#2563eb'],['낮음','#16a34a']].map(([lv, c]) => (
            <span key={lv} className="dc-legend-item">
              <span className="dc-legend-dot" style={{ background: c }} />{lv}
            </span>
          ))}
          <span className="dc-legend-item">
            <span className="dc-legend-dot" style={{ border: '2px dashed #94a3b8', background: 'transparent' }} />예보
          </span>
        </div>
      </div>

      <div className="dc-calendar-wrap">
        <div className="dc-month-nav">
          <button className="dc-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
          <span className="dc-month-label">{y}년 {m}월</span>
          <button className="dc-nav-btn" onClick={() => changeMonth(1)}>›</button>
        </div>
        <div className="dc-weekdays">
          {WEEK_DAYS.map((w,i) => (
            <span key={w} className="dc-weekday" style={{ color: i===0?'#ef4444':i===6?'#3b82f6':'#374151' }}>{w}</span>
          ))}
        </div>
        <div className="dc-grid">
          {calendarCells.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} className="dc-cell dc-cell--empty" />
            if (cell.noData) return (
              <div key={cell.date} className="dc-cell dc-cell--nodata">
                <span className="dc-cell-dn">{new Date(cell.date).getDate()}</span>
              </div>
            )
            const isSel = selected?.date === cell.date
            return (
              <div key={cell.date}
                className={['dc-cell', cell.is_forecast?'dc-cell--forecast':'', cell.is_today?'dc-cell--today':'', isSel?'dc-cell--sel':''].join(' ')}
                style={{ background: LEVEL_BG[cell.level] ?? '#f9fafb' }}
                onClick={() => setSelected(cell)}>
                <span className="dc-cell-dn">
                  {new Date(cell.date).getDate()}
                  {cell.is_today && <span className="dc-today-dot" />}
                </span>
                {cell.level && cell.level !== '—' && (
                  <span className="dc-cell-lv" style={{ color: LEVEL_COLOR[cell.level] }}>{cell.level}</span>
                )}
                {cell.topDisease && (
                  <span className="dc-cell-dis">{cell.topDisease}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selected && <DayDetail day={selected} />}
    </div>
  )
}
