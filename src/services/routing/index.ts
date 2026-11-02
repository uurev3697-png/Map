import type { LngLat, Route, TravelMode } from '../types'
import { OrsProvider } from './ors'
import { OsrmProvider } from './osrm'
import type { RouteOptions, RoutingProvider } from './types'

export type { RouteOptions, RoutingProvider }

const orsKey = import.meta.env.VITE_ORS_API_KEY?.trim()

/**
 * Активный провайдер маршрутов. ORS — если задан ключ, иначе публичный OSRM.
 * Сюда же можно добавить GraphHopper / Google Routes.
 */
export const routingProvider: RoutingProvider = orsKey ? new OrsProvider(orsKey) : new OsrmProvider()

/** Варианты маршрута через все точки (основной — первым). */
export function buildRoutes(mode: TravelMode, points: LngLat[], opts?: RouteOptions): Promise<Route[]> {
  return routingProvider.route(mode, points, opts)
}
