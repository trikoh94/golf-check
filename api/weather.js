export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // KST
  const pad = n => String(n).padStart(2, '0')
  const tm = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`

  const KEY = 'YX_4QuEtSFm_-ELhLRhZqQ'
  const url = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php?tm=${tm}&stn=257&help=0&authKey=${KEY}`

  try {
    const response = await fetch(url)
    const text = await response.text()

    // 전체 raw 응답 확인용 (디버그)
    let parsed = null
    try { parsed = JSON.parse(text) } catch { /* 텍스트 형식 */ }

    // JSON 형식인 경우
    if (parsed) {
      // 구조 파악을 위해 raw 전체 반환
      return res.status(200).json({ debug: true, structure: parsed })
    }

    // 텍스트 형식인 경우 - 헤더 라인 찾아서 파싱
    const lines = text.split('\n')
    const headerLine = lines.find(l => l.startsWith('#STN') || l.startsWith('# STN'))
    const dataLines = lines.filter(l => l.trim() && !l.startsWith('#') && !l.startsWith(' #'))

    if (!dataLines.length) {
      return res.status(200).json({ error: 'no_data', raw: text.slice(0, 500) })
    }

    const cols = dataLines[0].trim().split(/\s+/)

    // KMA ASOS 컬럼 매핑 (help=1로 보면 헤더 확인 가능)
    // 0:STN 1:TM 2:WD 3:WS 4:GST(지면온도) 5:GSN 6:PA 7:PS 8:PT 9:PR
    // 10:TA(기온) 11:TD(이슬점) 12:TS(초상온도) 13:TE(지중5cm) 14:WC 15:WP 16:WA
    // 17:WX 18:CA 19:CL 20:CM 21:CH 22:VS 23:VF 24:TH 25:UI 26:VI
    // 27:ST0(지면온도0cm?) 28:ST5 29:ST10 30:ST20 31:ST30 32:HM(습도) 33:RE(강수) 34:WT(날씨코드)
    const get = (idx) => { const v = parseFloat(cols[idx]); return isNaN(v) ? null : v }

    const TA  = get(10)  // 기온
    const TD  = get(11)  // 이슬점온도
    const GST = get(4)   // 지면온도
    const TS  = get(12)  // 초상온도 (지표면)
    const TE  = get(13)  // 지중 5cm 온도
    const WS  = get(3)   // 풍속
    const HM  = get(32)  // 습도
    const RE  = get(33)  // 강수량
    const WTP = parseInt(cols[34] ?? '-1') // 날씨코드

    let weatherText = '맑음', emoji = '☀️'
    if (!isNaN(WTP) && WTP > 0) {
      if ([61,63,65,80,81,82].includes(WTP)) { weatherText = '비'; emoji = '🌧️' }
      else if ([71,73,75,85,86].includes(WTP)) { weatherText = '눈'; emoji = '❄️' }
      else if ([51,53,55].includes(WTP)) { weatherText = '이슬비'; emoji = '🌦️' }
      else if ([10,11,12,13,14,19].includes(WTP)) { weatherText = '안개'; emoji = '🌫️' }
    }
    if (weatherText === '맑음' && WS !== null && WS >= 7) emoji = '💨'

    // 잔디 관리 관련 위험도 평가
    const warnings = []
    if (HM !== null && HM >= 85) warnings.push('⚠️ 고습도 — 병해 주의')
    if (TA !== null && TA >= 32) warnings.push('⚠️ 고온 — 열 스트레스 주의')
    if (TA !== null && TD !== null && (TA - TD) <= 3) warnings.push('⚠️ 이슬점 근접 — 결로/곰팡이 주의')
    if (RE !== null && RE > 0) warnings.push('🌧️ 강수 발생 — 배수 확인')

    res.status(200).json({
      label: `${emoji} ${weatherText}`,
      temp: TA !== null ? `${TA}°C` : null,
      humidity: HM !== null ? `${HM}%` : null,
      wind: WS !== null ? `${WS}m/s` : null,
      rain: RE !== null && RE > 0 ? `${RE}mm` : null,
      dewPoint: TD !== null ? `${TD}°C` : null,
      groundTemp: GST !== null ? `${GST}°C` : null,
      soilTemp5: TE !== null ? `${TE}°C` : null,
      surfaceTemp: TS !== null ? `${TS}°C` : null,
      warnings,
      raw: dataLines[0]?.slice(0, 100),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
