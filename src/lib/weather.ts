// Current weather for La Plata, Buenos Aires (Open-Meteo — free, no API key,
// CORS-enabled). Cached for 30 min so we don't re-fetch on every focus.

const LAT = -34.9215
const LON = -57.9545
const CACHE_KEY = 'force.weather'
const TTL = 30 * 60 * 1000

export interface Weather {
  tempC: number
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
