/**
 * 골프장 잔디 병해 위험도 계산
 * 
 * 참고 모델:
 * - Brown Patch: Smith-Kerns (1981), Fidanza et al. (1996)
 * - Dollar Spot: Danneberger & Vargas (1984), Karsten (1994)
 * - Pythium Blight: Nutter et al. (1983)
 * - 한국 기준: 한국잔디학회, 농촌진흥청 병해충 기준
 */

export const DISEASES = {
  brownPatch: {
    name: '브라운패치',
    nameEn: 'Brown Patch',
    pathogen: 'Rhizoctonia solani',
    section: ['green'],        // 주로 한지형 그린
    color: '#dc2626',
    description: '여름 고온다습 시 한지형 잔디(그린)에서 급격히 확산. 원형 갈변 패치 형성.',
  },
  pythium: {
    name: '피시움 블라이트',
    nameEn: 'Pythium Blight',
    pathogen: 'Pythium aphanidermatum',
    section: ['green', 'fw'],
    color: '#7c3aed',
    description: '가장 파괴적. 야간 고온+고습 시 수 시간 내 급속 확산. 즉각 대응 필요.',
    urgent: true,
  },
  dollarSpot: {
    name: '달러스팟',
    nameEn: 'Dollar Spot',
    pathogen: 'Sclerotinia homoeocarpa',
    section: ['green', 'fw', 'tee'],
    color: '#d97706',
    description: '봄~가을 온난다습 시 발생. 은화 크기 원형 반점. 저질소 상태에서 악화.',
  },
  grayLeafSpot: {
    name: '잿빛곰팡이',
    nameEn: 'Gray Leaf Spot',
    pathogen: 'Pyricularia grisea',
    section: ['fw', 'tee'],
    color: '#6b7280',
    description: '고온다습 시 난지형 잔디(페어웨이/티)에서 발생. 엽신에 회색 병반.',
  },
}

/**
 * @param {object} w - 날씨 raw 데이터
 * @param {number} w.temperature   - 현재 기온 (°C)
 * @param {number} w.humidity      - 상대습도 (%)
 * @param {number} w.dew_point     - 이슬점 (°C)
 * @param {number} w.night_min     - 야간 최저기온 (°C)
 * @param {number} w.soil_temp_0   - 지면온도 (°C)
 * @param {number} w.et_day        - 일일 증발산량 (mm)
 * @param {number} w.precipitation - 강수량 (mm)
 * @returns {Array} risks - 위험도 배열
 */
export function calcDiseaseRisk(w) {
  if (!w) return []
  const { temperature: ta, humidity: hm, dew_point: dp,
          night_min: tn, soil_temp_0: ts, et_day: et, precipitation: rain } = w

  const risks = []

  // ── 1. 브라운패치 (Smith-Kerns 기반)
  // 핵심 조건: 기온 21-32°C + 야간최저 ≥21°C + 이슬점 ≥16°C + 습도 ≥90%
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []

    if (ta >= 21 && ta <= 35) { score += 20; reasons.push(`기온 ${ta}°C (21~35°C 위험구간)`) }
    if (ta >= 26)              { score += 15; reasons.push('기온 26°C 초과') }
    if (tn != null && tn >= 21){ score += 30; reasons.push(`야간최저 ${tn}°C ≥ 21°C (핵심 조건)`) }
    if (dp != null && dp >= 16){ score += 20; reasons.push(`이슬점 ${dp}°C ≥ 16°C`) }
    if (hm >= 90)              { score += 10; reasons.push(`습도 ${hm}% ≥ 90%`) }
    if (hm >= 95)              { score += 5;  reasons.push('습도 95% 초과') }
    if (rain > 0)              { score += 5;  reasons.push('강수 발생') }

    if (score >= 30) {
      risks.push({
        ...DISEASES.brownPatch,
        score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰',
        reasons,
      })
    }
  }

  // ── 2. 피시움 블라이트 (Nutter 기반)
  // 핵심 조건: 야간최저 ≥20°C + 낮 기온 ≥30°C + 습도 ≥90%
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []

    if (ta >= 29)              { score += 30; reasons.push(`기온 ${ta}°C ≥ 29°C (임계값)`) }
    if (ta >= 32)              { score += 15; reasons.push('기온 32°C 초과') }
    if (tn != null && tn >= 20){ score += 35; reasons.push(`야간최저 ${tn}°C ≥ 20°C (핵심 조건)`) }
    if (hm >= 90)              { score += 15; reasons.push(`습도 ${hm}% ≥ 90%`) }
    if (dp != null && dp >= 20){ score += 10; reasons.push(`이슬점 ${dp}°C ≥ 20°C`) }
    if (rain > 0)              { score += 5;  reasons.push('강수로 잎면 습윤') }

    if (score >= 35) {
      risks.push({
        ...DISEASES.pythium,
        score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰',
        reasons,
      })
    }
  }

  // ── 3. 달러스팟 (Danneberger & Karsten 기반)
  // 핵심 조건: 기온 15-32°C + 이슬점 ≥10°C + 저ET (잎면 습윤 지속)
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []

    if (ta >= 15 && ta <= 32)  { score += 20; reasons.push(`기온 ${ta}°C (15~32°C 발생 구간)`) }
    if (ta >= 18 && ta <= 28)  { score += 10; reasons.push('최적 발생 온도 구간') }
    if (dp != null && dp >= 10){ score += 25; reasons.push(`이슬점 ${dp}°C ≥ 10°C`) }
    if (dp != null && dp >= 15){ score += 10; reasons.push('이슬점 15°C 초과') }
    if (hm >= 80)              { score += 15; reasons.push(`습도 ${hm}% ≥ 80%`) }
    if (et != null && et < 3)  { score += 15; reasons.push(`ET ${et?.toFixed(1)}mm — 낮은 증발산 (잎면 장기 습윤)`) }
    if (rain > 0)              { score += 5;  reasons.push('강수 발생') }

    if (score >= 35) {
      risks.push({
        ...DISEASES.dollarSpot,
        score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰',
        reasons,
      })
    }
  }

  // ── 4. 잿빛곰팡이 (난지형 잔디)
  // 핵심 조건: 기온 ≥28°C + 습도 ≥85% + 고온다습 지속
  if (ta != null && hm != null) {
    let score = 0
    const reasons = []

    if (ta >= 28)              { score += 25; reasons.push(`기온 ${ta}°C ≥ 28°C`) }
    if (ta >= 32)              { score += 15; reasons.push('기온 32°C 초과') }
    if (hm >= 85)              { score += 25; reasons.push(`습도 ${hm}% ≥ 85%`) }
    if (hm >= 92)              { score += 15; reasons.push('습도 92% 초과') }
    if (ts != null && ts >= 30){ score += 15; reasons.push(`지면온도 ${ts}°C ≥ 30°C`) }
    if (rain > 0)              { score += 5;  reasons.push('강수 발생') }

    if (score >= 40) {
      risks.push({
        ...DISEASES.grayLeafSpot,
        score: Math.min(score, 100),
        level: score >= 70 ? '위험' : score >= 50 ? '주의' : '관찰',
        reasons,
      })
    }
  }

  return risks.sort((a, b) => b.score - a.score)
}

/**
 * 홀별 점수 + 병해 위험도 → 직원 알림 생성
 * @param {object} holeState - { tee, fw, green } 각 홀 상태
 * @param {Array} risks - calcDiseaseRisk 결과
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

        // 낮은 점수 + 높은 위험 = 우선 알림
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

  return alerts
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10) // 상위 10개
}
