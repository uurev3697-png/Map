import type { LngLat, Route, TravelMode } from '../services/types'

export interface MapPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface MapViewProps {
  from: LngLat | null
  to: LngLat | null
  routes: Partial<Record<TravelMode, Route>>
  activeMode: TravelMode
  padding: MapPadding
  dark: boolean
  /** Меняется, когда нужно заново вписать маршрут в экран */
  fitKey: string
  /** Точка, к которой нужно подлететь (например, шаг маршрута) */
  focus: { coord: LngLat; key: number } | null
  onMapClick: (coord: LngLat) => void
  onMarkerDrag: (which: 'from' | 'to', coord: LngLat) => void
  onCenterChange?: (center: LngLat) => void
  onReady?: (api: MapApi) => void
}

export interface MapApi {
  zoomIn(): void
  zoomOut(): void
  flyTo(coord: LngLat, zoom?: number): void
}
