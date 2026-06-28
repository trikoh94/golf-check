/**
 * 골프장 잔디 병해 위험도 계산
 *
 * 잔디종:
 *   bentgrass  → 크리핑 벤트그래스 (그린) — 한지형, 여름 스트레스 취약
 *   zoysia     → 한국잔디/고려지 (티/페어웨이) — 난지형
 *
 * 참고 모델:
 *   Brown Patch  : Smith-Kerns (1981), Fidanza et al. (1996)
 *   Dollar Spot  : Danneberger & Vargas (1984), Karsten (1994)
 *   Pythium      : Nutter et al. (1983)
 *   Large Patch  : 농촌진흥청, 한국잔디학회
 *   Gray Leaf Spot: Braverman & Dernoeden (2007)
 */

export const DISEASES = {
  brownPatch: {
    name: '브라운패치',
    nameEn: 'Brown Patch',
    pathogen: 'Rhizoctonia solani AG1-1B',
    grass_type: 'bentgrass',
    section: ['green'],
    color: '#dc2626',
    description: '여름 고온다습 시 벤트그래스 그린에서 급격히 확산. 원형 갈변 패치 형성. 야간기온 21°C 이상이 핵심 조건.',
  },
  pythium: {
    name: '피시움 블라이트',
    nameEn: 'Pythium Blight',
    pathogen: 'Pythium aphanidermatum',
    grass_type: 'bentgrass',
    section: ['green', 'fw'],
    color: '#7c3aed',
    description: '가장 파괴적. 야간 고온+고습 시 수 시간 내 급속 확산. 즉각 대응 필요.',
    urgent: true,
  },
  dollarSpot: {
    name: '달러스팟',
    nameEn: 'Dollar Spot',
    pathogen: 'Clarireedia jacksonii',
    grass_type: 'all',
    section: ['green', 'fw', 'tee'],
    color: '#d97706',
    description: '봄~가을 온난다습 시 발생. 은화 크기 원형 반점. 저질소 조건에서 악화.',
  },
  largePatch: {
    name: '라지패치',
    nameEn: 'Large Patch',
    pathogen: 'Rhizoctonia solani AG2-2',
    grass_type: 'zoysia',
    section: ['fw', 'tee'],
    color: '#ea580c',
    description: '봄·가을 토양온도 10~18°C 구간에서 고려지(난지형)에 발생. 직경 수 미터 원형 적갈색 패치.',
  },
  grayLeafSpot: {
    name: '잿빛곰팡이(회엽고병)',
    nameEn: 'Gray Leaf Spot',
    pathogen: 'Pyricularia grisea',
    grass_type: 'zoysia',
    section: ['fw', 'tee'],
    color: '#6b7280',
    description: '고온다습 시 고려지 페어웨이/티에서 발생. 회색~갈색 엽신 병반. 7~8월 집중 발생.',
  },
}

// 이슬점 추정 (Magnus 공식)
function estimateDewPoint(t, rh) {
  if (t == null || rh == null) return null
  const a = 17.27, b = 237.7
  const alpha = (a * t) / (b + t) + Math.log(rh / 100)
  return (b * alpha) / (a - alpha)
}

/**
 * 현재 기상 데이터 → 병해 위험도 배열
 */
export function calcDiseaseRisk(w) {
  if (!w) return []
  const {
    temperature: ta, humidity: hm, dew_point: dp,
    night_min: tn, soil_temp_0: ts, et_day: et,
    precipitation: rain,
  } = w

  const risks = []

  // 1. 브라운패치 (벤트그래스 그린)
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []
    if (ta >= 21 && ta <= 35) { score += 20; reasons.push(`기온 ${ta}°C (21~35°C 위험구간)`) }
    if (ta >= 26)              { score += 15; reasons.push('기온 26°C 초과') }
    if (tn != null && tn >= 21){ score += 30; reasons.push(`야간최저 ${tn}°C ≥ 21°C ★`) }
    else if (tn == null)       { score += 10; reasons.push('야간최저기온 미확인 (주의)') }
    if (dp != null && dp >= 16){ score += 20; reasons.push(`이슬점 ${dp}°C ≥ 16°C`) }
    if (hm >= 90)              { score += 10; reasons.push(`습도 ${hm}% ≥ 90%`) }
    if (hm >= 95)              { score +=  5; reasons.push('습도 95% 초과') }
    if (rain > 0)              { score +=  5; reasons.push('강수 발생') }
    if (score >= 30) {
      risks.push({ ...DISEASES.brownPatch, score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰', reasons })
    }
  }

  // 2. 피시움 블라이트 (벤트그래스)
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []
    if (ta >= 29)              { score += 30; reasons.push(`기온 ${ta}°C ≥ 29°C`) }
    if (ta >= 32)              { score += 15; reasons.push('기온 32°C 초과') }
    if (tn != null && tn >= 20){ score += 35; reasons.push(`야간최저 ${tn}°C ≥ 20°C ★`) }
    if (hm >= 90)              { score += 15; reasons.push(`습도 ${hm}% ≥ 90%`) }
    if (dp != null && dp >= 20){ score += 10; reasons.push(`이슬점 ${dp}°C ≥ 20°C`) }
    if (rain > 0)              { score +=  5; reasons.push('강수로 잎면 습윤') }
    if (score >= 35) {
      risks.push({ ...DISEASES.pythium, score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰', reasons })
    }
  }

  // 3. 달러스팟 (전체)
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []
    if (ta >= 15 && ta <= 32)  { score += 20; reasons.push(`기온 ${ta}°C (15~32°C 발생 구간)`) }
    if (ta >= 18 && ta <= 28)  { score += 10; reasons.push('최적 발생 온도 구간') }
    if (dp != null && dp >= 10){ score += 25; reasons.push(`이슬점 ${dp}°C ≥ 10°C`) }
    if (dp != null && dp >= 15){ score += 10; reasons.push('이슬점 15°C 초과') }
    if (hm >= 80)              { score += 15; reasons.push(`습도 ${hm}% ≥ 80%`) }
    if (et != null && et < 3)  { score += 15; reasons.push(`ET ${et?.toFixed(1)}mm — 잎면 장기 습윤`) }
    if (rain > 0)              { score +=  5; reasons.push('강수 발생') }
    if (score >= 35) {
      risks.push({ ...DISEASES.dollarSpot, score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰', reasons })
    }
  }

  // 4. 라지패치 (고려지 — 봄/가을, 토양온도 10~18°C)
  if (ta != null) {
    let score = 0
    const reasons = []
    const soilT = ts ?? (ta - 3)
    if (soilT >= 10 && soilT <= 18) { score += 40; reasons.push(`토양온도 ${soilT.toFixed(1)}°C (10~18°C 위험구간)`) }
    if (soilT >= 13 && soilT <= 16) { score += 20; reasons.push('최적 발생 토양온도 13~16°C') }
    if (ta <= 22)                   { score += 15; reasons.push(`기온 ${ta}°C ≤ 22°C`) }
    if (hm != null && hm >= 80)     { score += 15; reasons.push(`습도 ${hm}% ≥ 80%`) }
    if (rain > 0)                   { score += 10; reasons.push('강수 발생') }
    if (score >= 35) {
      risks.push({ ...DISEASES.largePatch, score: Math.min(score, 100),
        level: score >= 65 ? '위험' : score >= 45 ? '주의' : '관찰', reasons })
    }
  }

  // 5. 잿빛곰팡이 (고려지)
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []
    if (ta >= 28)              { score += 25; reasons.push(`기온 ${ta}°C ≥ 28°C`) }
    if (ta >= 32)              { score += 15; reasons.push('기온 32°C 초과') }
    if (hm >= 85)              { score += 25; reasons.push(`습도 ${hm}% ≥ 85%`) }
    if (hm >= 92)              { score += 15; reasons.push('습도 92% 초과') }
    if (ts != null && ts >= 30){ score += 15; reasons.push(`지면온도 ${ts}°C ≥ 30°C`) }
    if (rain > 0)              { score +=  5; reasons.push('강수 발생') }
    if (score >= 40) {
      risks.push({ ...DISEASES.grayLeafSpot, score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰', reasons })
    }
  }

  return risks.sort((a, b) => b.score - a.score)
}

/**
 * 7일 예보 → 날짜별 병해 위험도 요약
 * @param {Array} forecast7d  [{date, t_max, t_min, humidity, dew_point, rain}]
 * @returns {Array} [{date, t_max, t_min, bentgrassRisk, zoysiaRisk, level, topDisease, rain}]
 */
export function calcForecastRisk(forecast7d) {
  if (!Array.isArray(forecast7d)) return []

  return forecast7d.map(day => {
    const w = {
      temperature:   day.t_max,
      humidity:      day.humidity,
      dew_point:     day.dew_point ?? estimateDewPoint(day.t_max, day.humidity),
      night_min:     day.t_min,
      soil_temp_0:   null,
      et_day:        null,
      precipitation: day.rain ?? 0,
    }

    const risks = calcDiseaseRisk(w)

    const bentgrass = risks
      .filter(r => r.grass_type === 'bentgrass' || r.grass_type === 'all')
      .reduce((max, r) => Math.max(max, r.score), 0)

    const zoysia = risks
      .filter(r => r.grass_type === 'zoysia' || r.grass_type === 'all')
      .reduce((max, r) => Math.max(max, r.score), 0)

    const top = risks[0] ?? null
    const combined = Math.max(bentgrass, zoysia)

    return {
      date: day.date,
      t_max: day.t_max,
      t_min: day.t_min,
      bentgrassRisk: bentgrass,
      zoysiaRisk:    zoysia,
      level: combined >= 70 ? '위험' : combined >= 50 ? '주의' : combined >= 30 ? '관찰' : '낮음',
      topDisease: top?.name ?? null,
      rain: day.rain ?? 0,
    }
  })
}

/**
 * 홀별 점수 + 병해 위험도 → 직원 알림 생성
 */
export function generateWorkerAlerts(holeState, risks) {
  if (!risks.length || !holeState) return []

  const SEC_MAP = { tee: '티잉그라운드', fw: '페어웨이', green: '그린' }
  const alerts = []

  risks.forEach(risk => {
    risk.section.forEach(sec => {
      const holes = holeState[sec] ?? {}
      Object.entries(holes).forEach(([holeNum, h]) => {
        if (h.score === null) return
        const priority = (10 - h.score) * 0.4 + risk.score * 0.6
        if (risk.score >= 50 || (risk.score >= 30 && h.score <= 4)) {
          alerts.push({
            hole: Number(holeNum),
            section: sec,
            sectionName: SEC_MAP[sec],
            disease: risk.name,
            diseaseScore: risk.score,
            holeScore: h.score,
            level: risk.level,
            urgent: risk.urgent && risk.score >= 60,
            priority,
            message: `${holeNum}번홀 ${SEC_MAP[sec]} — ${risk.name} ${risk.level}`,
          })
        }
      })
    })
  })

  return alerts.sort((a, b) => b.priority - a.priority).slice(0, 10)
}
