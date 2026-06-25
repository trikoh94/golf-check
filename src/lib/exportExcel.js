import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { SCORE_META } from '../constants'

const METRIC_LABELS = {
  colorDensity: '색상밀도',
  weedGrass:    '이종잔디',
  disease:      '병해',
  compaction:   '답압피해',
  repairArea:   '보식지',
  edgeMgmt:     '선관리',
  renovation:   '갱신관리',
  rootLength:   '뿌리길이',
}

const SCORE_METRICS_KEYS = ['colorDensity','weedGrass','disease','compaction','repairArea','edgeMgmt','renovation','rootLength']

function secToRows(secData, includeGreenSpeed = false) {
  if (!secData) return []
  return Object.entries(secData)
    .map(([num, h]) => {
      const detail = h.detail || {}
      const wt = h.weedTypes || {}
      const weedStr = Object.entries(wt).filter(([,v]) => v)
        .map(([k]) => k === 'kentucky' ? '켄터키' : k === 'bermuda' ? '버뮤다' : '포아')
        .join(', ')
      const photos = h.photos || []
      const row = {
        '홀': Number(num),
        '종합점수': h.score ?? '',
        '등급': h.score != null ? (SCORE_META[h.score]?.label ?? '') : '',
      }
      SCORE_METRICS_KEYS.forEach(k => { row[METRIC_LABELS[k]] = detail[k] ?? '' })
      row['수분(%)'] = detail.moisture ?? ''
      if (includeGreenSpeed) row['그린스피드(ft)'] = detail.greenSpeed ?? ''
      row['이종잔디 종류'] = weedStr
      row['메모'] = h.memo || ''
      // 사진 URL 컬럼
      photos.forEach((p, i) => {
        const url = typeof p === 'string' ? p : p.dataUrl
        row[`사진${i + 1} URL`] = url || ''
      })
      return row
    })
    .sort((a, b) => a['홀'] - b['홀'])
}

function secAvg(secData) {
  if (!secData) return null
  const vals = Object.values(secData).filter(h => h.score != null).map(h => h.score)
  if (!vals.length) return null
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

export function exportInspectionExcel(rec) {
  const wb = XLSX.utils.book_new()

  // 기본정보
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['항목', '내용'],
    ['점검일', rec.date], ['골프장', rec.club], ['코스', rec.course || '—'],
    ['점검자', rec.inspector], ['날씨', rec.weather || '—'],
    ['기온(°C)', rec.temperature ?? ''], ['습도(%)', rec.humidity ?? ''],
    ['이슬점(°C)', rec.dew_point ?? ''],
    ['토양온도 0cm(°C)', rec.soil_temp_0 ?? ''], ['토양온도 6cm(°C)', rec.soil_temp_6 ?? ''],
    ['증발산량(mm)', rec.et_day ?? ''], ['일사량(MJ/m²)', rec.radiation_day ?? ''],
    ['다음 점검일', rec.next_visit || ''], ['종합 메모', rec.memo || ''],
    ['홀 수', rec.hole_count],
  ])
  ws1['!cols'] = [{ wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, ws1, '기본정보')

  // 구역별
  [
    { name: '티잉그라운드', data: rec.tee, green: false },
    { name: '페어웨이',     data: rec.fairway, green: false },
    { name: '그린',        data: rec.green, green: true },
  ].forEach(({ name, data, green }) => {
    const rows = secToRows(data, green)
    if (!rows.length) return
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name)
  })

  // 종합
  const ws5 = XLSX.utils.aoa_to_sheet([
    ['구역', '평균점수', '등급', '점검홀수', '미점검홀수'],
    ...(['티잉그라운드','페어웨이','그린'].map((label, i) => {
      const sd = [rec.tee, rec.fairway, rec.green][i]
      const avg = secAvg(sd)
      const inspected = sd ? Object.values(sd).filter(h => h.score != null).length : 0
      const total = sd ? Object.keys(sd).length : 0
      return [label, avg ?? '미점검', avg ? SCORE_META[Math.round(Number(avg))]?.label : '', inspected, total - inspected]
    }))
  ])
  ws5['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws5, '종합')

  XLSX.writeFile(wb, `잔디점검_${rec.date}_${rec.inspector}.xlsx`)
}

// 사진 전체를 ZIP으로 다운로드
export async function exportPhotosZip(rec) {
  const zip = new JSZip()

  const secMap = [
    { label: '티잉', data: rec.tee },
    { label: '페어웨이', data: rec.fairway },
    { label: '그린', data: rec.green },
  ]

  let total = 0
  for (const { label, data } of secMap) {
    if (!data) continue
    for (const [num, h] of Object.entries(data)) {
      const photos = h.photos || []
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]
        const url = typeof p === 'string' ? p : p.dataUrl
        if (!url) continue
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          const ext = blob.type.includes('png') ? 'png' : 'jpg'
          zip.file(`${label}_${num}번홀_사진${i + 1}.${ext}`, blob)
          total++
        } catch (e) {
          console.warn('사진 다운로드 실패:', url)
        }
      }
    }
  }

  if (!total) return 0

  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `잔디점검_사진_${rec.date}_${rec.inspector}.zip`
  a.click()
  URL.revokeObjectURL(a.href)
  return total
}
