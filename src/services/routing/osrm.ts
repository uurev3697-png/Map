import { request, ServiceError } from '../errors'
import { computeBBox, type LngLat, type Route, type RouteStep, type TravelMode } from '../types'
import { osrmInstruction, osrmKind, type OsrmManeuver } from './osrmInstructions'
import type { RouteOptions, RoutingProvider } from './types'

/**
 * Публичные серверы OSRM от FOSSGIS: https://routing.openstreetmap.de
 * Предназначены для некоммерческого использования с небольшой нагрузкой.
 */
const ENDPOINTS: Record<TravelMode, string> = {
  car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
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

  async route(mode: TravelMode, points: LngLat[], opts: RouteOptions = {}): Promise<Route[]> {
    const coords = points.map((p) => `${p[0]},${p[1]}`).join(';')
    const params = new URLSearchParams({ overview: 'full', geometries: 'geojson', steps: 'true' })
    // OSRM отдаёт альтернативы только для маршрута из 2 точек
    if (opts.alternatives && points.length === 2) params.set('alternatives', '3')
    const data = await request<OsrmResponse>(`${ENDPOINTS[mode]}/${coords}?${params}`, { signal: opts.signal }, (status, body) => {
      const code = (body as OsrmResponse | null)?.code
      if (code === 'NoRoute' || code === 'NoSegment') return new ServiceError('not-found')
      if (status === 429) return new ServiceError('rate-limit')
      return undefined
    })

    if (data.code !== 'Ok' || !data.routes?.length) throw new ServiceError('not-found')
    return data.routes.map((r) => {
      const geometry = r.geometry.coordinates.map(([x, y]) => [x, y] as LngLat)
      const lastLeg = r.legs.length - 1
      const steps: RouteStep[] = r.legs.flatMap((leg, li) =>
        leg.steps
          .filter((s, i, arr) => s.distance > 0 || i === 0 || i === arr.length - 1)
          // У промежуточных отрезков «старт» дублирует «прибытие» предыдущего — убираем
          .filter((s) => !(li > 0 && s.maneuver.type === 'depart'))
          .map((s) => {
            const name = s.name || s.ref || ''
            const intermediate = s.maneuver.type === 'arrive' && li < lastLeg
            return {
              instruction: intermediate ? `Промежуточная точка ${li + 1}` : osrmInstruction(s.maneuver, name),
              distance: s.distance,
              duration: s.duration,
              kind: intermediate ? 'waypoint' : osrmKind(s.maneuver),
              name: intermediate ? undefined : name || undefined,
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
    })
  }
}
