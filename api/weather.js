export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  // 해남 파인트리 골프장 좌표
  const LAT = 34.57
  const LON = 126.60

  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${LAT}&longitude=${LON}`
    + `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,dew_point_2m,surface_temperature`
    + `&hourly=soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm`
    + `&timezone=Asia%2FSeoul&forecast_days=1`

  try {
    const response = await fetch(url)
    const data = await response.json()

    const c = data.current
    const hourly = data.hourly

    // 현재 시각의 토양온도 인덱스 찾기
    const nowTime = c.time // "2026-06-25T14:00"
    const hourIdx = hourly.time.findIndex(t => t === nowTime)
    const soilIdx = hourIdx >= 0 ? hourIdx : 0

    const soil0  = hourly.soil_temperature_0cm?.[soilIdx]
    const soil6  = hourly.soil_temperature_6cm?.[soilIdx]
    const soil18 = hourly.soil_temperature_18cm?.[soilIdx]

    // WMO 날씨 코드 → 텍스트/이모지
    const code = c.weather_code
    let weatherText = '맑음', emoji = '☀️'
    if (code === 0)                  { weatherText = '맑음';    emoji = '☀️' }
    else if (code <= 3)              { weatherText = '구름';    emoji = '⛅' }
    else if (code <= 48)             { weatherText = '안개';    emoji = '🌫️' }
    else if (code <= 57)             { weatherText = '이슬비';  emoji = '🌦️' }
    else if (code <= 67)             { weatherText = '비';      emoji = '🌧️' }
    else if (code <= 77)             { weatherText = '눈';      emoji = '❄️' }
    else if (code <= 82)             { weatherText = '소나기';  emoji = '🌧️' }
    else if (code >= 95)             { weatherText = '뇌우';    emoji = '⛈️' }
    if (weatherText === '맑음' && c.wind_speed_10m >= 7) emoji = '💨'

    // 잔디 관리 경고
    const warnings = []
    const hm = c.relative_humidity_2m
    const ta = c.temperature_2m
    const dp = c.dew_point_2m
    if (hm >= 85)               warnings.push('⚠️ 고습도 — 병해 주의')
    if (ta >= 32)               warnings.push('⚠️ 고온 — 열 스트레스 주의')
    if (ta - dp <= 3)           warnings.push('⚠️ 이슬점 근접 — 결로/곰팡이 주의')
    if (c.precipitation > 0)    warnings.push('🌧️ 강수 발생 — 배수 확인')
    if (soil0 !== null && soil0 >= 35) warnings.push('⚠️ 지면 고온 — 뿌리 스트레스 주의')

    res.status(200).json({
      label: `${emoji} ${weatherText}`,
      temp: `${c.temperature_2m}°C`,
      humidity: `${c.relative_humidity_2m}%`,
      wind: `${c.wind_speed_10m}m/s`,
      rain: c.precipitation > 0 ? `${c.precipitation}mm` : null,
      dewPoint: dp != null ? `${dp}°C` : null,
      surfaceTemp: c.surface_temperature != null ? `${c.surface_temperature}°C` : null,
      soilTemp0: soil0 != null ? `${soil0}°C` : null,
      soilTemp6: soil6 != null ? `${soil6}°C` : null,
      soilTemp18: soil18 != null ? `${soil18}°C` : null,
      warnings,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
