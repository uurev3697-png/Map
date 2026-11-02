/** [долгота, широта] — порядок как в GeoJSON / MapLibre */
export type LngLat = [number, number]

export type TravelMode = 'foot' | 'bike' | 'car'

export const TRAVEL_MODES: TravelMode[] = ['foot', 'bike', 'car']

export type ManeuverKind =
  | 'depart'
  | 'arrive'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'straight'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'fork'
  | 'waypoint'
  | 'other'

export interface RouteStep {
  instruction: string
  /** метры */
  distance: number
  /** секунды */
  duration: number
  kind: ManeuverKind
  name?: string
  /** Точка манёвра — для перелёта камеры к шагу */
  location?: LngLat
}

export interface Route {
  mode: TravelMode
  /** метры */
  distance: number
  /** секунды */
  duration: number
  geometry: LngLat[]
  steps: RouteStep[]
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number]
  provider: string
}

export interface Place {
  id: string
  name: string
  /** Вторая строка: город, регион, страна */
  description: string
  coord: LngLat
}

export function computeBBox(coords: LngLat[]): Route['bbox'] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of coords) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return [minX, minY, maxX, maxY]
}
