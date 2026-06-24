// Current weather for La Plata, Buenos Aires (Open-Meteo — free, no API key,
// CORS-enabled). Cached for 30 min so we don't re-fetch on every focus.

const LAT = -34.9215
const LON = -57.9545
const CACHE_KEY = 'force.weather'
const FCAST_KEY = 'force.forecast'
const TTL = 30 * 60 * 1000

export interface Weather {
  tempC: number
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
}

// WMO weather codes → Spanish label + emoji (condensed).
function describe(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Despejado', emoji: '☀️' }
  if (code <= 2) return { label: 'Parcial nublado', emoji: '🌤️' }
  if (code === 3) return { label: 'Nublado', emoji: '☁️' }
  if (code <= 48) return { label: 'Niebla', emoji: '🌫️' }
  if (code <= 57) return { label: 'Llovizna', emoji: '🌦️' }
  if (code <= 67) return { label: 'Lluvia', emoji: '🌧️' }
  if (code <= 77) return { label: 'Nieve', emoji: '🌨️' }
  if (code <= 82) return { label: 'Chaparrones', emoji: '🌧️' }
  if (code <= 99) return { label: 'Tormenta', emoji: '⛈️' }
  return { label: 'La Plata', emoji: '📍' }
}

export async function getWeather(): Promise<Weather | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as
      | { at: number; w: Weather } | null
    if (cached && Date.now() - cached.at < TTL) return cached.w
  } catch { /* ignore */ }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const code = j.current?.weather_code ?? 0
    const w: Weather = {
      tempC: Math.round(j.current?.temperature_2m ?? 0),
      code,
      ...describe(code),
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), w })) } catch { /* quota */ }
    return w
  } catch {
    return null
  }
}

/** Today + next 3 days for La Plata (4 entries). Cached 30 min. */
export async function getForecast(): Promise<ForecastDay[] | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(FCAST_KEY) || 'null') as
      | { at: number; f: ForecastDay[] } | null
    if (cached && Date.now() - cached.at < TTL) return cached.f
  } catch { /* ignore */ }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const d = j.daily
    if (!d?.time) return null
    const f: ForecastDay[] = d.time.map((date: string, i: number) => {
      const code = d.weather_code?.[i] ?? 0
      return {
        date,
        max: Math.round(d.temperature_2m_max?.[i] ?? 0),
        min: Math.round(d.temperature_2m_min?.[i] ?? 0),
        code,
        ...describe(code),
      }
    })
    try { localStorage.setItem(FCAST_KEY, JSON.stringify({ at: Date.now(), f })) } catch { /* quota */ }
    return f
  } catch {
    return null
  }
}
