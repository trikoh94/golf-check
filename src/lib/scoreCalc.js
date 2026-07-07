import { supabase } from './supabase'

/**
 * 홀별 세부 항목 점수 → 종합점수 계산
 * dir: 'good' = 높을수록 좋음 / 'bad' = 높을수록 나쁨
 */
export const METRICS = [
  { key: 'colorDensity', label: '색상밀도',         emoji: '🟢',  dir: 'good',  sections: ['tee','fw','green'] },
  { key: 'renovation',   label: '갱신관리',         emoji: '🔄',  dir: 'good',  sections: ['tee','fw','green'] },
  { key: 'edgeMgmt',     label: '선관리',           emoji: '✂️',  dir: 'good',  sections: ['tee','green'] },
  { key: 'teeSurrounds', label: '티주변 관리상태',   emoji: '🏌️', dir: 'good',  sections: ['tee'] },
  { key: 'growthMgmt',   label: '생육관리',         emoji: '🌾',  dir: 'good',  sections: ['fw'] },
  { key: 'collarGrass',  label: '그린칼라 잔디상태', emoji: '🌿',  dir: 'good',  sections: ['green'] },
  { key: 'collarEdge',   label: '그린칼라 선관리',   emoji: '✂️',  dir: 'good',  sections: ['green'] },
  { key: 'weedGrass',    label: '이종잔디',         emoji: '🌿',  dir: 'bad',   sections: ['tee','fw','green'] },
  { key: 'disease',      label: '병해',             emoji: '🦠',  dir: 'bad',   sections: ['tee','fw','green'] },
  { key: 'compaction',   label: '답압피해',         emoji: '👣',  dir: 'bad',   sections: ['tee','fw','green'] },
  { key: 'repairArea',   label: '보식지',           emoji: '🩹',  dir: 'bad',   sections: ['tee','fw','green'] },
  { key: 'rootLength',   label: '뿌리길이',         emoji: '🌱',  dir: 'range', sections: ['tee','fw'], unit: 'cm' },
  { key: 'moisture',     label: '수분',             emoji: '💧',  dir: 'range', sections: ['tee','fw','green'], unit: '%' },
  { key: 'greenSpeed',   label: '그린스피드',       emoji: '⚡',  dir: 'info',  sections: ['green'], unit: 'ft' },
]

export const SCORE_METRICS = METRICS.filter(m => m.dir === 'good' || m.dir === 'bad')

export const DEFAULT_WEIGHTS = {
  green: { colorDensity:25, weedGrass:15, disease:20, compaction:5,  repairArea:10, edgeMgmt:0,  renovation:5,  collarGrass:10, collarEdge:10 },
  fw:    { colorDensity:25, weedGrass:15, disease:15, compaction:20, repairArea:10, edgeMgmt:0,  renovation:5,  growthMgmt:10 },
  tee:   { colorDensity:25, weedGrass:15, disease:15, compaction:20, repairArea:5,  edgeMgmt:5,  renovation:5,  teeSurrounds:10 },
}

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

export function loadWeights() {
  return DEFAULT_WEIGHTS
}

export function calcHoleScore(detail, sec, weights) {
  if (!detail || Object.keys(detail).length === 0) return null
  const w = (weights ?? DEFAULT_WEIGHTS)[sec] ?? DEFAULT_WEIGHTS[sec]

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
  return Math.round((total / totalW) * 8 + 1)
}
