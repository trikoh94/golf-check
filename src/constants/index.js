export const SCORE_META = {
  1: { label: '매우불량', color: '#dc2626', track: '#fca5a5', bg: '#fef2f2' },
  2: { label: '불량',   color: '#ea580c', track: '#fdba74', bg: '#fff7ed' },
  3: { label: '미흡',   color: '#d97706', track: '#fcd34d', bg: '#fffbeb' },
  4: { label: '보통',   color: '#65a30d', track: '#a3e635', bg: '#f7fee7' },
  5: { label: '양호',   color: '#16a34a', track: '#86efac', bg: '#f0fdf4' },
  6: { label: '우수',   color: '#0d9488', track: '#5eead4', bg: '#f0fdfa' },
  7: { label: '매우우수', color: '#0284c7', track: '#7dd3fc', bg: '#f0f9ff' },
  8: { label: '탁월',   color: '#7c3aed', track: '#c4b5fd', bg: '#faf5ff' },
  9: { label: '최우수', color: '#db2777', track: '#f9a8d4', bg: '#fdf2f8' },
}

export const SECTION_ISSUES = {
  tee: [
    '잔디 밀도 부족',
    '병해 발생',
    '충해 발생',
    '잡초 혼입',
    '표면 요철',
    '배수 불량',
    '기타',
  ],
  fw: [
    '잔디 밀도 부족',
    '병해 발생',
    '충해 발생',
    '잡초 혼입',
    '노출지/베어 스팟',
    '배수 불량',
    '기타',
  ],
  green: [
    '속도 불균일',
    '병해 발생',
    '충해 발생',
    '잡초 혼입',
    '표면 요철',
    '배수 불량',
    '기타',
  ],
}

export const SEC_KEYS = ['tee', 'fw', 'green']

export const SEC_NAME = {
  tee:   '티잉그라운드',
  fw:    '페어웨이',
  green: '그린',
}

export const SEC_EMOJI = {
  tee:   '🏌️',
  fw:    '🌿',
  green: '🎯',
}

export const SUBTABS = ['basic', 'tee', 'fw', 'green', 'summary']

export const SUBTAB_LABEL = {
  basic:   '기본정보',
  tee:     '티잉',
  fw:      '페어웨이',
  green:   '그린',
  summary: '종합',
}

export function initHoleState() {
  return { score: null, detail: {}, weedTypes: {}, memo: '', photos: [] }
}

export function initAllHoles(count) {
  const obj = {}
  for (let i = 1; i <= count; i++) {
    obj[i] = { score: null, detail: {}, weedTypes: {}, memo: '', photos: [] }
  }
  return obj
}

/** compress image dataUrl to max 700px wide, quality 0.6 */
export function compressImage(dataUrl, maxPx = 700, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}
