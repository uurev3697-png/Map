import type { LngLat, Route, TravelMode } from '../types'

/**
 * Общий интерфейс провайдера маршрутов.
 * Чтобы подключить GraphHopper, Google Routes и т.п. — реализуйте его
 * и зарегистрируйте в ./index.ts.
 */
export interface RoutingProvider {
  readonly id: string
  readonly name: string
  route(mode: TravelMode, from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route>
}
