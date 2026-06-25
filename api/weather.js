export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // KST
  const pad = n => String(n).padStart(2, '0')

  let baseDate = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}`
  let baseHour = now.getUTCHours()
  const min = now.getUTCMinutes()

  // 40분 이전이면 한 시간 전 데이터 사용
  if (min < 40) {
    if (baseHour === 0) {
      baseHour = 23
      const yesterday = new Date(now - 24 * 60 * 60 * 1000)
      baseDate = `${yesterday.getUTCFullYear()}${pad(yesterday.getUTCMonth()+1)}${pad(yesterday.getUTCDate())}`
    } else {
      baseHour -= 1
    }
  }
  const baseTime = pad(baseHour) + '00'

  const params = new URLSearchParams({
    serviceKey: 'YX_4QuEtSFm_-ELhLRhZqQ',
    pageNo: '1',
    numOfRows: '10',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: '51',
    ny: '56',
  })

  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${params}`

  try {
    const response = await fetch(url)
    const text = await response.text()

    let data
    try { data = JSON.parse(text) } catch {
      return res.status(200).json({ error: '응답 파싱 실패', raw: text.slice(0, 200) })
    }

    const items = data?.response?.body?.items?.item || []
    const get = cat => items.find(i => i.category === cat)?.obsrValue

    const pty = Number(get('PTY') ?? 0)
    const wsd = Number(get('WSD') ?? 0)
    const t1h = get('T1H')
    const reh = get('REH')
    const rn1 = get('RN1')

    let weatherText = '맑음'
    let emoji = '☀️'
    if (pty === 1) { weatherText = '비'; emoji = '🌧️' }
    else if (pty === 2) { weatherText = '비/눈'; emoji = '🌧️' }
    else if (pty === 3) { weatherText = '눈'; emoji = '❄️' }
    else if (pty === 5) { weatherText = '빗방울'; emoji = '🌦️' }
    else if (wsd >= 7) emoji = '💨'

    res.status(200).json({
      label: `${emoji} ${weatherText}`,
      temp: t1h ? `${t1h}°C` : null,
      humidity: reh ? `${reh}%` : null,
      wind: wsd ? `${wsd}m/s` : null,
      rain: rn1 && Number(rn1) > 0 ? `${rn1}mm` : null,
      baseDate,
      baseTime,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
