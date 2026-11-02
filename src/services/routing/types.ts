import type { LngLat, Route, TravelMode } from '../types'

export interface RouteOptions {
  signal?: AbortSignal
  /** Запросить альтернативные варианты (если провайдер умеет; обычно только для 2 точек) */
  alternatives?: boolean
}

/**
 * Общий интерфейс провайдера маршрутов.
 * Чтобы подключить GraphHopper, Google Routes и т.п. — реализуйте его
 * и зарегистрируйте в ./index.ts.
 *
 * points — от 2 точек: старт, промежуточные остановки, финиш.
 * Возвращает варианты маршрута, основной — первым.
 */
export interface RoutingProvider {
  readonly id: string
  readonly name: string
  route(mode: TravelMode, points: LngLat[], opts?: RouteOptions): Promise<Route[]>
}
