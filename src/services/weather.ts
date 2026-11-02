import { request } from './errors'
import type { LngLat } from './types'

/** Текущая погода в точке — Open-Meteo Forecast API (бесплатно, без ключа). */
export interface Weather {
  temp: number
  code: number
  isDay: boolean
  icon: string
  text: string
}

// Коды погоды WMO → иконка и подпись
function describe(code: number, day: boolean): { icon: string; text: string } {
  if (code === 0) return { icon: day ? '☀️' : '🌙', text: 'Ясно' }
  if (code <= 2) return { icon: day ? '🌤️' : '☁️', text: 'Переменная облачность' }
  if (code === 3) return { icon: '☁️', text: 'Пасмурно' }
  if (code === 45 || code === 48) return { icon: '🌫️', text: 'Туман' }
  if (code >= 51 && code <= 57) return { icon: '🌦️', text: 'Морось' }
  if (code >= 61 && code <= 67) return { icon: '🌧️', text: 'Дождь' }
  if (code >= 71 && code <= 77) return { icon: '🌨️', text: 'Снег' }
  if (code >= 80 && code <= 82) return { icon: '🌦️', text: 'Ливень' }
  if (code === 85 || code === 86) return { icon: '🌨️', text: 'Снегопад' }
  if (code >= 95) return { icon: '⛈️', text: 'Гроза' }
  return { icon: '🌡️', text: '' }
}

const cache = new Map<string, { at: number; w: Weather }>()

export async function getWeather(c: LngLat, signal?: AbortSignal): Promise<Weather> {
  const key = `${c[0].toFixed(2)},${c[1].toFixed(2)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.w
  const params = new URLSearchParams({
    latitude: c[1].toFixed(4),
    longitude: c[0].toFixed(4),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'auto',
  })
  const data = await request<{ current: { temperature_2m: number; weather_code: number; is_day: number } }>(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { signal },
  )
  const isDay = data.current.is_day === 1
  const w: Weather = {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    isDay,
    ...describe(data.current.weather_code, isDay),
  }
  cache.set(key, { at: Date.now(), w })
  return w
}
