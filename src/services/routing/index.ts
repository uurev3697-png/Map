import type { LngLat, Route, TravelMode } from '../types'
import { OrsProvider } from './ors'
import { OsrmProvider } from './osrm'
import type { RoutingProvider } from './types'

export type { RoutingProvider }

const orsKey = import.meta.env.VITE_ORS_API_KEY?.trim()

/**
 * Активный провайдер маршрутов. ORS — если задан ключ, иначе публичный OSRM.
 * Сюда же можно добавить GraphHopper / Google Routes.
 */
export const routingProvider: RoutingProvider = orsKey ? new OrsProvider(orsKey) : new OsrmProvider()

export function buildRoute(mode: TravelMode, from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route> {
  return routingProvider.route(mode, from, to, signal)
}
