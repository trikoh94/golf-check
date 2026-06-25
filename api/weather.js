export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // KST
  const pad = n => String(n).padStart(2, '0')
  const tm = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`

  // 해남 ASOS 관측소 번호: 257
  const KEY = 'YX_4QuEtSFm_-ELhLRhZqQ'
  const url = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php?tm=${tm}&stn=257&help=0&authKey=${KEY}`

  try {
    const response = await fetch(url)
    const text = await response.text()

    // KMA Hub 응답은 고정폭 텍스트 형식
    // #STN  TM               WD   WS   ...  TA  ...  HM  ...
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'))

    if (!lines.length) {
      return res.status(200).json({ error: 'no_data', raw: text.slice(0, 300) })
    }

    const cols = lines[0].trim().split(/\s+/)
    // 컬럼 순서: STN TM WD WS GST GSN PA PS PT PR TA TD TS TE WC WP WA WX CA CL CM CH VS VF TH UI VI ... HM RE WT
    // TA = 기온(index 10), HM = 습도(index ~27), WS = 풍속(index 2), WD = 풍향(index 1)
    const TA = parseFloat(cols[10]) // 기온
    const HM = parseFloat(cols[27]) // 습도
    const WS = parseFloat(cols[2])  // 풍속
    const WD = parseFloat(cols[1])  // 풍향
    const RE = parseFloat(cols[28]) // 강수량
    const WTP = parseInt(cols[29])  // 현재날씨(WT)

    // 날씨 코드 → 텍스트
    let weatherText = '맑음', emoji = '☀️'
    if (!isNaN(WTP)) {
      if ([61,63,65,80,81,82].includes(WTP)) { weatherText = '비'; emoji = '🌧️' }
      else if ([71,73,75,85,86].includes(WTP)) { weatherText = '눈'; emoji = '❄️' }
      else if ([51,53,55].includes(WTP)) { weatherText = '이슬비'; emoji = '🌦️' }
      else if ([10,11,12,13,14,19].includes(WTP)) { weatherText = '안개'; emoji = '🌫️' }
    }
    if (weatherText === '맑음' && WS >= 7) emoji = '💨'

    res.status(200).json({
      label: `${emoji} ${weatherText}`,
      temp: !isNaN(TA) ? `${TA}°C` : null,
      humidity: !isNaN(HM) ? `${HM}%` : null,
      wind: !isNaN(WS) ? `${WS}m/s` : null,
      rain: !isNaN(RE) && RE > 0 ? `${RE}mm` : null,
      raw: lines[0], // 디버그용
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
