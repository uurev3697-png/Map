import type { LngLat, TravelMode } from '../services/types'

/** Состояние, которое кладём в адрес страницы: ?pts=lng,lat;lng,lat&mode=car */
export interface SharedState {
  points: LngLat[]
  mode?: TravelMode
}

const r5 = (n: number) => Math.round(n * 1e5) / 1e5

export function encodeState(points: LngLat[], mode: TravelMode): string {
  const params = new URLSearchParams()
  if (points.length) params.set('pts', points.map((p) => `${r5(p[0])},${r5(p[1])}`).join(';'))
  params.set('mode', mode)
  return params.toString()
}

export function decodeState(search: string): SharedState | null {
  const params = new URLSearchParams(search)
  const raw = params.get('pts')
  if (!raw) return null
  const points = raw
    .split(';')
    .map((s) => s.split(',').map(Number) as LngLat)
    .filter((p) => p.length === 2 && p.every(Number.isFinite) && Math.abs(p[1]) <= 90 && Math.abs(p[0]) <= 180)
  if (!points.length) return null
  const m = params.get('mode')
  return { points: points.slice(0, 5), mode: m === 'foot' || m === 'bike' || m === 'car' ? m : undefined }
}

export function shareUrl(points: LngLat[], mode: TravelMode): string {
  const u = new URL(window.location.href)
  u.search = encodeState(points, mode)
  u.hash = ''
  return u.toString()
}

/** Ссылки «Открыть в…» для внешних карт */
export function externalLinks(points: LngLat[], mode: TravelMode) {
  const ll = (p: LngLat) => `${r5(p[1])},${r5(p[0])}`
  const yandexMode = { car: 'auto', foot: 'pd', bike: 'bc' }[mode]
  const googleMode = { car: 'driving', foot: 'walking', bike: 'bicycling' }[mode]
  const twoGisMode = { car: 'car', foot: 'pedestrian', bike: 'bicycle' }[mode]
  const origin = points[0]
  const dest = points[points.length - 1]
  const mid = points.slice(1, -1)
  const google = new URL('https://www.google.com/maps/dir/')
  google.searchParams.set('api', '1')
  google.searchParams.set('origin', ll(origin))
  google.searchParams.set('destination', ll(dest))
  google.searchParams.set('travelmode', googleMode)
  if (mid.length) google.searchParams.set('waypoints', mid.map(ll).join('|'))
  return {
    yandex: `https://yandex.ru/maps/?rtext=${points.map(ll).join('~')}&rtt=${yandexMode}`,
    twoGis: `https://2gis.ru/directions/tab/${twoGisMode}/points/${points
      .map((p) => `${r5(p[0])},${r5(p[1])}`)
      .join('|')}`,
    google: google.toString(),
  }
}
