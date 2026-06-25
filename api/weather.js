// Vercel 서버리스 함수 - 기상청 API 프록시 (CORS 우회)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // KST
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')

  // 기상청은 매 시각 40분 이후에 이전 시각 데이터가 확정됨
  const min = now.getUTCMinutes()
  const hour = now.getUTCHours()
  const baseHour = min < 40 ? (hour === 0 ? 23 : hour - 1) : hour
  const baseTime = String(baseHour).padStart(2, '0') + '00'
  const baseDate = min < 40 && hour === 0
    ? String(Number(date) - 1) // 자정 이전이면 전날
    : date

  // 해남 파인트리 골프장 격자 좌표 (해남군)
  const nx = 51
  const ny = 56

  const KEY = 'YX_4QuEtSFm_-ELhLRhZqQ'
  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst` +
    `?serviceKey=${KEY}&pageNo=1&numOfRows=10&dataType=JSON` +
    `&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    const items = data?.response?.body?.items?.item || []

    // 필요한 값만 추출
    const getValue = (cat) => items.find(i => i.category === cat)?.obsrValue

    const t1h  = getValue('T1H')  // 기온 (°C)
    const reh  = getValue('REH')  // 습도 (%)
    const rn1  = getValue('RN1')  // 1시간 강수량
    const wsd  = getValue('WSD')  // 풍속 (m/s)
    const pty  = getValue('PTY')  // 강수형태: 0없음 1비 2비/눈 3눈 5빗방울
    const sky  = getValue('SKY')  // 하늘상태: (단기예보에만 있음, 없을 수 있음)

    // 날씨 텍스트 변환
    let weatherLabel = '맑음'
    const ptyNum = Number(pty)
    if (ptyNum === 1) weatherLabel = '비'
    else if (ptyNum === 2) weatherLabel = '비/눈'
    else if (ptyNum === 3) weatherLabel = '눈'
    else if (ptyNum === 5) weatherLabel = '빗방울'

    const emoji =
      ptyNum >= 1 ? '🌧️' :
      Number(wsd) >= 7 ? '💨' :
      '☀️'

    res.status(200).json({
      label: `${emoji} ${weatherLabel}`,
      temp: t1h ? `${t1h}°C` : null,
      humidity: reh ? `${reh}%` : null,
      wind: wsd ? `${wsd}m/s` : null,
      rain: rn1 && Number(rn1) > 0 ? `강수 ${rn1}mm` : null,
      baseDate,
      baseTime,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
