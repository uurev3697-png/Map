import type { LngLat, Place } from '../types'

/** Общий интерфейс геокодера (прямой поиск + обратный). */
export interface GeocodingProvider {
  readonly id: string
  readonly name: string
  search(query: string, opts?: { near?: LngLat; signal?: AbortSignal; limit?: number }): Promise<Place[]>
  reverse(coord: LngLat, signal?: AbortSignal): Promise<Place | null>
}
