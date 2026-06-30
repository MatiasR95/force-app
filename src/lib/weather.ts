// Weather for La Plata, Buenos Aires (Open-Meteo — free, no API key, CORS-enabled).
// ONE request fetches the current conditions AND the multi-day forecast together,
// so "today" is always consistent (the old split fetch showed a different current
// temp on Inicio vs Hoy). Cached 30 min.

const LAT = -34.9215
const LON = -57.9545
const CACHE_KEY = 'force.weather.v2'
const TTL = 30 * 60 * 1000

export interface WeatherNow {
  tempC: number
  feelsC: number
  code: number
  label: string
  emoji: string
}

export interface ForecastDay {
  date: string   // YYYY-MM-DD
  max: number
  min: number
  code: number
  label: string
  emoji: string
  rainProb: number // % chance of precipitation (max for the day)
}

export interface WeatherBundle {
  now: WeatherNow
  days: ForecastDay[] // today + next 3
}

// WMO weather codes → Spanish label + emoji (condensed).
function describe(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Despejado', emoji: '☀️' }
  if (code <= 2) return { label: 'Parcialmente nublado', emoji: '🌤️' }
  if (code === 3) return { label: 'Nublado', emoji: '☁️' }
  if (code <= 48) return { label: 'Niebla', emoji: '🌫️' }
  if (code <= 57) return { label: 'Llovizna', emoji: '🌦️' }
  if (code <= 67) return { label: 'Lluvia', emoji: '🌧️' }
  if (code <= 77) return { label: 'Nieve', emoji: '🌨️' }
  if (code <= 82) return { label: 'Chaparrones', emoji: '🌧️' }
  if (code <= 99) return { label: 'Tormenta', emoji: '⛈️' }
  return { label: 'La Plata', emoji: '📍' }
}

/** Current conditions + today/next-3-day forecast, from a single request. */
export async function getWeather(): Promise<WeatherBundle | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as
      | { at: number; b: WeatherBundle } | null
    if (cached && Date.now() - cached.at < TTL) return cached.b
  } catch { /* ignore */ }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
      + `&current=temperature_2m,apparent_temperature,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&timezone=auto&forecast_days=4`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const code = j.current?.weather_code ?? 0
    const now: WeatherNow = {
      tempC: Math.round(j.current?.temperature_2m ?? 0),
      feelsC: Math.round(j.current?.apparent_temperature ?? j.current?.temperature_2m ?? 0),
      code,
      ...describe(code),
    }
    const d = j.daily
    const days: ForecastDay[] = (d?.time ?? []).map((date: string, i: number) => {
      const c = d.weather_code?.[i] ?? 0
      return {
        date,
        max: Math.round(d.temperature_2m_max?.[i] ?? 0),
        min: Math.round(d.temperature_2m_min?.[i] ?? 0),
        rainProb: Math.round(d.precipitation_probability_max?.[i] ?? 0),
        code: c,
        ...describe(c),
      }
    })
    const b: WeatherBundle = { now, days }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), b })) } catch { /* quota */ }
    return b
  } catch {
    return null
  }
}
