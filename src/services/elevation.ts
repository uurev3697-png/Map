import { request } from './errors'
import type { LngLat } from './types'

/**
 * Высоты по маршруту через Open-Meteo Elevation API (бесплатно, без ключа, данные Copernicus DEM).
 * Маршрут равномерно семплируется по расстоянию — до 90 точек за один запрос.
 */
export interface ElevationProfile {
  /** расстояние от старта, м */
  dist: number[]
  /** высота, м */
  elev: number[]
  ascent: number
  descent: number
  min: number
  max: number
}

const R = 6371000
export function haversine(a: LngLat, b: LngLat): number {
  const toRad = Math.PI / 180
  const dLat = (b[1] - a[1]) * toRad
  const dLng = (b[0] - a[0]) * toRad
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Кумулятивные расстояния вдоль линии */
export function cumulative(line: LngLat[]): number[] {
  const out = [0]
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + haversine(line[i - 1], line[i]))
  return out
}

/** Точка на линии на расстоянии d от начала */
export function pointAt(line: LngLat[], cum: number[], d: number): LngLat {
  if (d <= 0) return line[0]
  const total = cum[cum.length - 1]
  if (d >= total) return line[line.length - 1]
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] < d) lo = mid
    else hi = mid
  }
  const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1)
  return [line[lo][0] + (line[hi][0] - line[lo][0]) * t, line[lo][1] + (line[hi][1] - line[lo][1]) * t]
}

const cache = new Map<string, ElevationProfile>()

export async function getElevationProfile(line: LngLat[], signal?: AbortSignal): Promise<ElevationProfile> {
  const cum = cumulative(line)
  const total = cum[cum.length - 1]
  const n = Math.max(2, Math.min(90, Math.round(total / 25)))
  const dist = Array.from({ length: n }, (_, i) => (total * i) / (n - 1))
  const pts = dist.map((d) => pointAt(line, cum, d))
  const key = pts.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(';')
  const hit = cache.get(key)
  if (hit) return hit

  const params = new URLSearchParams({
    latitude: pts.map((p) => p[1].toFixed(5)).join(','),
    longitude: pts.map((p) => p[0].toFixed(5)).join(','),
  })
  const data = await request<{ elevation: number[] }>(`https://api.open-meteo.com/v1/elevation?${params}`, { signal })
  // Сглаживаем шум DEM скользящим средним по 3 точкам
  const raw = data.elevation
  const elev = raw.map((_, i) => {
    const a = raw[Math.max(0, i - 1)]
    const b = raw[i]
    const c = raw[Math.min(raw.length - 1, i + 1)]
    return (a + b + c) / 3
  })
  let ascent = 0
  let descent = 0
  for (let i = 1; i < elev.length; i++) {
    const d = elev[i] - elev[i - 1]
    if (d > 0) ascent += d
    else descent -= d
  }
  const profile = { dist, elev, ascent, descent, min: Math.min(...elev), max: Math.max(...elev) }
  cache.set(key, profile)
  return profile
}
