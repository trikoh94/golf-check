export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const LAT = 34.57, LON = 126.60

  // past_days=14 + forecast_days=16 = 30일치
  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${LAT}&longitude=${LON}`
    + `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,dew_point_2m_max,precipitation_sum,et0_fao_evapotranspiration`
    + `&timezone=Asia%2FSeoul&past_days=14&forecast_days=16`

  try {
    const resp = await fetch(url)
    const data = await resp.json()
    const daily = data.daily

    const today = new Date().toISOString().slice(0, 10)

    const days = (daily.time ?? []).map((date, i) => ({
      date,
      is_past:    date < today,
      is_today:   date === today,
      is_forecast: date > today,
      t_max:     daily.temperature_2m_max?.[i]       ?? null,
      t_min:     daily.temperature_2m_min?.[i]       ?? null,
      humidity:  daily.relative_humidity_2m_max?.[i] ?? null,
      dew_point: daily.dew_point_2m_max?.[i]         ?? null,
      rain:      daily.precipitation_sum?.[i]        ?? null,
      et:        daily.et0_fao_evapotranspiration?.[i] ?? null,
    }))

    res.status(200).json({ days })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
