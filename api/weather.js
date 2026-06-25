export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const LAT = 34.57, LON = 126.60

  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${LAT}&longitude=${LON}`
    + `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,dew_point_2m,surface_temperature,shortwave_radiation`
    + `&hourly=soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,et0_fao_evapotranspiration,temperature_2m,relative_humidity_2m`
    + `&daily=et0_fao_evapotranspiration,precipitation_sum,shortwave_radiation_sum,temperature_2m_min,temperature_2m_max`
    + `&timezone=Asia%2FSeoul&forecast_days=1&past_days=1`

  try {
    const resp = await fetch(url)
    const data = await resp.json()
    const c = data.current
    const hourly = data.hourly
    const daily = data.daily

    // 현재 시각 인덱스
    const hourIdx = Math.max(0, hourly.time?.findIndex(t => t === c.time) ?? 0)

    // 어제 야간 최저기온 (오후 8시 ~ 오전 6시)
    const nightHours = hourly.time
      ?.map((t, i) => ({ t, i, temp: hourly.temperature_2m[i] }))
      .filter(({ t }) => {
        const h = new Date(t).getHours()
        return h >= 20 || h <= 6
      })
    const nightMinTemp = nightHours?.length
      ? Math.min(...nightHours.map(x => x.temp))
      : null

    const soil0  = hourly.soil_temperature_0cm?.[hourIdx]
    const soil6  = hourly.soil_temperature_6cm?.[hourIdx]
    const soil18 = hourly.soil_temperature_18cm?.[hourIdx]
    const etDay  = daily.et0_fao_evapotranspiration?.[1] // 오늘
    const radDay = daily.shortwave_radiation_sum?.[1]
    const tMin   = daily.temperature_2m_min?.[1]
    const tMax   = daily.temperature_2m_max?.[1]

    const code = c.weather_code
    let weatherText = '맑음', emoji = '☀️'
    if (code <= 0)        { weatherText = '맑음';   emoji = '☀️' }
    else if (code <= 3)   { weatherText = '구름';   emoji = '⛅' }
    else if (code <= 48)  { weatherText = '안개';   emoji = '🌫️' }
    else if (code <= 57)  { weatherText = '이슬비'; emoji = '🌦️' }
    else if (code <= 67)  { weatherText = '비';     emoji = '🌧️' }
    else if (code <= 77)  { weatherText = '눈';     emoji = '❄️' }
    else if (code <= 82)  { weatherText = '소나기'; emoji = '🌧️' }
    else if (code >= 95)  { weatherText = '뇌우';   emoji = '⛈️' }

    res.status(200).json({
      label: `${emoji} ${weatherText}`,
      temp:         c.temperature_2m != null ? `${c.temperature_2m}°C` : null,
      humidity:     c.relative_humidity_2m != null ? `${c.relative_humidity_2m}%` : null,
      wind:         c.wind_speed_10m != null ? `${c.wind_speed_10m}m/s` : null,
      rain:         c.precipitation > 0 ? `${c.precipitation}mm` : null,
      dewPoint:     c.dew_point_2m != null ? `${c.dew_point_2m}°C` : null,
      surfaceTemp:  c.surface_temperature != null ? `${c.surface_temperature}°C` : null,
      soilTemp0:    soil0  != null ? `${soil0}°C`  : null,
      soilTemp6:    soil6  != null ? `${soil6}°C`  : null,
      soilTemp18:   soil18 != null ? `${soil18}°C` : null,
      etDay:        etDay  != null ? `${etDay.toFixed(1)}mm/일` : null,
      radiationDay: radDay != null ? `${radDay.toFixed(1)}MJ/m²` : null,
      tMin:         tMin   != null ? `${tMin}°C` : null,
      tMax:         tMax   != null ? `${tMax}°C` : null,
      nightMinTemp: nightMinTemp != null ? `${nightMinTemp.toFixed(1)}°C` : null,
      _raw: {
        temperature:   c.temperature_2m,
        humidity:      c.relative_humidity_2m,
        wind_speed:    c.wind_speed_10m,
        dew_point:     c.dew_point_2m,
        surface_temp:  c.surface_temperature,
        soil_temp_0:   soil0,
        soil_temp_6:   soil6,
        et_day:        etDay,
        radiation_day: radDay,
        t_min:         tMin,
        t_max:         tMax,
        night_min:     nightMinTemp,
        precipitation: c.precipitation,
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
