import { request, ServiceError } from '../errors'
import { computeBBox, type LngLat, type Route, type TravelMode } from '../types'
import { osrmInstruction, osrmKind, type OsrmManeuver } from './osrmInstructions'
import type { RoutingProvider } from './types'

/**
 * Публичные серверы OSRM от FOSSGIS: https://routing.openstreetmap.de
 * Предназначены для некоммерческого использования с небольшой нагрузкой.
 */
const ENDPOINTS: Record<TravelMode, string> = {
  car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
}

interface OsrmResponse {
  code: string
  message?: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: { coordinates: LngLat[] }
    legs: Array<{
      steps: Array<{ distance: number; duration: number; name: string; ref?: string; maneuver: OsrmManeuver }>
    }>
  }>
}

export class OsrmProvider implements RoutingProvider {
  readonly id = 'osrm'
  readonly name = 'OSRM (FOSSGIS)'

  async route(mode: TravelMode, from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route> {
    const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`
    const url = `${ENDPOINTS[mode]}/${coords}?overview=full&geometries=geojson&steps=true`
    const data = await request<OsrmResponse>(url, { signal }, (status, body) => {
      const code = (body as OsrmResponse | null)?.code
      if (code === 'NoRoute' || code === 'NoSegment') return new ServiceError('not-found')
      if (status === 429) return new ServiceError('rate-limit')
      return undefined
    })

    if (data.code !== 'Ok' || !data.routes?.length) throw new ServiceError('not-found')
    const r = data.routes[0]
    const geometry = r.geometry.coordinates.map(([x, y]) => [x, y] as LngLat)
    const steps = r.legs.flatMap((leg) =>
      leg.steps
        .filter((s, i, arr) => s.distance > 0 || i === 0 || i === arr.length - 1)
        .map((s) => {
          const name = s.name || s.ref || ''
          return {
            instruction: osrmInstruction(s.maneuver, name),
            distance: s.distance,
            duration: s.duration,
            kind: osrmKind(s.maneuver),
            name: name || undefined,
            location: s.maneuver.location,
          }
        }),
    )
    return {
      mode,
      provider: this.name,
      distance: r.distance,
      duration: r.duration,
      geometry,
      steps,
      bbox: computeBBox(geometry),
    }
  }
}
