/**
 * 홀별 세부 항목 점수 → 종합점수 계산
 * dir: 'good' = 높을수록 좋음 / 'bad' = 높을수록 나쁨
 */
export const METRICS = [
  { key: 'colorDensity', label: '색상밀도', emoji: '🟢', dir: 'good', sections: ['tee','fw','green'] },
  { key: 'weedGrass',    label: '이종잔디', emoji: '🌿', dir: 'bad',  sections: ['tee','fw','green'] },
  { key: 'disease',      label: '병해',     emoji: '🦠', dir: 'bad',  sections: ['tee','fw','green'] },
  { key: 'compaction',   label: '답압피해', emoji: '👣', dir: 'bad',  sections: ['tee','fw','green'] },
  { key: 'repairArea',   label: '보식지',   emoji: '🩹', dir: 'bad',  sections: ['tee','fw','green'] },
  { key: 'edgeMgmt',     label: '선관리',   emoji: '✂️', dir: 'good', sections: ['tee','fw','green'] },
  { key: 'renovation',   label: '갱신관리', emoji: '🔄', dir: 'good', sections: ['tee','fw','green'] },
  { key: 'rootLength',   label: '뿌리길이', emoji: '🌱', dir: 'good', sections: ['tee','fw','green'] },
  { key: 'moisture',     label: '수분',     emoji: '💧', dir: 'range', sections: ['tee','fw','green'], unit: '%' },
  { key: 'greenSpeed',   label: '그린스피드', emoji: '⚡', dir: 'info', sections: ['green'], unit: 'ft' },
]

// 가중치 계산에 포함되는 항목 (moisture, greenSpeed 제외)
export const SCORE_METRICS = METRICS.filter(m => m.dir === 'good' || m.dir === 'bad')

export const DEFAULT_WEIGHTS = {
  green: { colorDensity:20, weedGrass:15, disease:25, compaction:5,  repairArea:10, edgeMgmt:0,  renovation:5,  rootLength:20 },
  fw:    { colorDensity:20, weedGrass:15, disease:15, compaction:20, repairArea:10, edgeMgmt:5,  renovation:5,  rootLength:10 },
  tee:   { colorDensity:20, weedGrass:15, disease:15, compaction:25, repairArea:5,  edgeMgmt:5,  renovation:5,  rootLength:10 },
}

// Supabase 기반 가중치 로드/저장
import { supabase } from './supabase'

export async function fetchWeights() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'score_weights')
      .single()
    if (!error && data?.value) return data.value
  } catch {}
  return DEFAULT_WEIGHTS
}

export async function saveWeights(w) {
  await supabase.from('settings').upsert(
    { key: 'score_weights', value: w, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
}

// 하위 호환성용 (동기 fallback)
export function loadWeights() {
  return DEFAULT_WEIGHTS
}

/**
 * detail 객체 + 섹션 + 가중치 → 1~9 종합점수
 */
export function calcHoleScore(detail, sec, weights) {
  if (!detail || Object.keys(detail).length === 0) return null
  const w = (weights ?? loadWeights())[sec] ?? DEFAULT_WEIGHTS[sec]

  let total = 0, totalW = 0
  SCORE_METRICS.filter(m => m.sections.includes(sec)).forEach(m => {
    const val = detail[m.key]
    if (val == null) return
    const weight = w[m.key] ?? 0
    if (!weight) return
    const norm = m.dir === 'good' ? (val - 1) / 4 : (5 - val) / 4
    total += norm * weight
    totalW += weight
  })

  if (!totalW) return null
  return Math.round((total / totalW) * 8 + 1)  // 0~1 → 1~9
}
