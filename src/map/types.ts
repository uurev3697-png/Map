import type { LngLat, Route, TravelMode } from '../services/types'
import type { MarkerKind } from './markers'

export interface MapPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface MapWaypoint {
  id: string
  coord: LngLat
  kind: MarkerKind
  /** Буква/номер на маркере: А, 1, 2, Б */
  label: string
}

export interface MyLocation {
  coord: LngLat
  /** направление взгляда/движения, градусы от севера */
  heading: number | null
}

export interface MapViewProps {
  waypoints: MapWaypoint[]
  /** Выбранный вариант маршрута для каждого способа передвижения */
  routes: Partial<Record<TravelMode, Route>>
  /** Другие варианты активного способа (idx — номер варианта) */
  alternatives: { idx: number; route: Route }[]
  activeMode: TravelMode
  padding: MapPadding
  dark: boolean
  /** Меняется, когда нужно заново вписать маршрут в экран */
  fitKey: string
  /** Точка, к которой нужно подлететь (например, шаг маршрута) */
  focus: { coord: LngLat; key: number } | null
  me: MyLocation | null
  /** Наклон карты с 3D-зданиями */
  tilt3d: boolean
  /** Линейка: режим измерения и её точки */
  ruler: { active: boolean; points: LngLat[] }
  /** Режим навигации «В путь»: камера ведёт за позицией, пройденное — серым */
  nav: { pos: LngLat; heading: number; progress: number; follow: boolean } | null
  /** Пользователь сдвинул карту рукой (в навигации — перестаём следовать) */
  onUserPan?: () => void
  onRulerAdd: (coord: LngLat) => void
  onRulerMove: (index: number, coord: LngLat) => void
  onMapClick: (coord: LngLat) => void
  onMarkerDrag: (id: string, coord: LngLat) => void
  onSelectAlternative: (idx: number) => void
  onCenterChange?: (center: LngLat) => void
  onReady?: (api: MapApi) => void
  /** Не удалось загрузить стиль карты (нет сети) */
  onStyleError?: () => void
}

export interface MapApi {
  zoomIn(): void
  zoomOut(): void
  flyTo(coord: LngLat, zoom?: number): void
  /** Пролёт камеры вдоль маршрута. Возвращает функцию остановки. */
  flyAlong?(route: Route, onEnd: () => void): () => void
}
