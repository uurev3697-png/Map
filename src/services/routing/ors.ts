import { request, ServiceError, statusToKind } from '../errors'
import { computeBBox, type LngLat, type ManeuverKind, type Route, type RouteStep, type TravelMode } from '../types'
import type { RouteOptions, RoutingProvider } from './types'

const PROFILES: Record<TravelMode, string> = {
  foot: 'foot-walking',
  bike: 'cycling-regular',
  car: 'driving-car',
}

// https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/instruction-types
const ORS_TYPES: Record<number, ManeuverKind> = {
  0: 'left', 1: 'right', 2: 'sharp-left', 3: 'sharp-right', 4: 'slight-left',
  5: 'slight-right', 6: 'straight', 7: 'roundabout', 8: 'roundabout', 9: 'uturn',
  10: 'arrive', 11: 'depart', 12: 'slight-left', 13: 'slight-right',
}

interface OrsStep {
  distance: number
  duration: number
  type: number
  instruction: string
  name: string
  way_points: [number, number]
}

interface OrsResponse {
  features: Array<{
    geometry: { coordinates: LngLat[] }
    properties: {
      summary: { distance?: number; duration?: number }
      segments: Array<{ steps: OrsStep[] }>
    }
  }>
}

export class OrsProvider implements RoutingProvider {
  readonly id = 'ors'
  readonly name = 'OpenRouteService'
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async route(mode: TravelMode, points: LngLat[], opts: RouteOptions = {}): Promise<Route[]> {
    const body: Record<string, unknown> = { coordinates: points, language: 'ru', instructions: true, units: 'm' }
    // ORS умеет альтернативы только для 2 точек
    if (opts.alternatives && points.length === 2) {
      body.alternative_routes = { target_count: 3, weight_factor: 1.5, share_factor: 0.6 }
    }
    const send = (b: Record<string, unknown>) =>
      request<OrsResponse>(
        `https://api.openrouteservice.org/v2/directions/${PROFILES[mode]}/geojson`,
        {
          method: 'POST',
          signal: opts.signal,
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/geo+json, application/json',
          },
          body: JSON.stringify(b),
        },
        (status, err) => {
          const code = (err as { error?: { code?: number } } | null)?.error?.code
          if (code === 2004) return new ServiceError('too-far')
          if (code === 2009 || code === 2010) return new ServiceError('not-found')
          return new ServiceError(statusToKind(status))
        },
      )

    let data: OrsResponse
    try {
      data = await send(body)
    } catch (e) {
      // Альтернативы ограничены по расстоянию (~100 км) — повторяем без них
      if (body.alternative_routes && e instanceof ServiceError && e.kind === 'too-far') {
        delete body.alternative_routes
        data = await send(body)
      } else throw e
    }

    if (!data.features?.length) throw new ServiceError('not-found')
    return data.features.map((f) => {
      const geometry = f.geometry.coordinates.map(([x, y]) => [x, y] as LngLat)
      const segs = f.properties.segments
      const steps: RouteStep[] = segs.flatMap((s, si) =>
        s.steps.map((st) => {
          const intermediate = st.type === 10 && si < segs.length - 1
          return {
            instruction: intermediate ? `Промежуточная точка ${si + 1}` : st.instruction,
            distance: st.distance,
            duration: st.duration,
            kind: intermediate ? 'waypoint' : (ORS_TYPES[st.type] ?? 'other'),
            name: st.name && st.name !== '-' ? st.name : undefined,
            location: geometry[st.way_points?.[0] ?? 0],
          }
        }),
      )
      return {
        mode,
        provider: this.name,
        distance: f.properties.summary.distance ?? 0,
        duration: f.properties.summary.duration ?? 0,
        geometry,
        steps,
        bbox: computeBBox(geometry),
      }
    })
  }
}
