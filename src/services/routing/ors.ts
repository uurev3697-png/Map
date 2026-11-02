import { request, ServiceError, statusToKind } from '../errors'
import { computeBBox, type LngLat, type ManeuverKind, type Route, type TravelMode } from '../types'
import type { RoutingProvider } from './types'

const PROFILES: Record<TravelMode, string> = {
  foot: 'foot-walking',
  car: 'driving-car',
}

// https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/instruction-types
const ORS_TYPES: Record<number, ManeuverKind> = {
  0: 'left', 1: 'right', 2: 'sharp-left', 3: 'sharp-right', 4: 'slight-left',
  5: 'slight-right', 6: 'straight', 7: 'roundabout', 8: 'roundabout', 9: 'uturn',
  10: 'arrive', 11: 'depart', 12: 'slight-left', 13: 'slight-right',
}

interface OrsResponse {
  features: Array<{
    geometry: { coordinates: LngLat[] }
    properties: {
      summary: { distance?: number; duration?: number }
      segments: Array<{
        steps: Array<{ distance: number; duration: number; type: number; instruction: string; name: string; way_points: [number, number] }>
      }>
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

  async route(mode: TravelMode, from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route> {
    const data = await request<OrsResponse>(
      `https://api.openrouteservice.org/v2/directions/${PROFILES[mode]}/geojson`,
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/geo+json, application/json',
        },
        body: JSON.stringify({ coordinates: [from, to], language: 'ru', instructions: true, units: 'm' }),
      },
      (status, body) => {
        const code = (body as { error?: { code?: number } } | null)?.error?.code
        if (code === 2004) return new ServiceError('too-far')
        if (code === 2009 || code === 2010) return new ServiceError('not-found')
        return new ServiceError(statusToKind(status))
      },
    )

    const f = data.features?.[0]
    if (!f) throw new ServiceError('not-found')
    const geometry = f.geometry.coordinates.map(([x, y]) => [x, y] as LngLat)
    const steps = f.properties.segments.flatMap((s) =>
      s.steps.map((st) => ({
        instruction: st.instruction,
        distance: st.distance,
        duration: st.duration,
        kind: ORS_TYPES[st.type] ?? 'other',
        name: st.name && st.name !== '-' ? st.name : undefined,
        location: geometry[st.way_points?.[0] ?? 0],
      })),
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
  }
}
