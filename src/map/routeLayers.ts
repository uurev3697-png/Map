import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import type { Route, TravelMode } from '../services/types'
import { ROUTE_COLORS } from './styles'

const SRC_ALL = 'routes-all'
const SRC_ACTIVE = 'routes-active'
const L_INACTIVE_CAR = 'route-inactive-car'
const L_INACTIVE_FOOT = 'route-inactive-foot'
const L_GLOW = 'route-active-glow'
const L_CASING = 'route-active-casing'
const L_LINE = 'route-active-line'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const CLEAR = 'rgba(0,0,0,0)'

function hexToRgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Градиент вдоль линии, «проявленный» до доли t (0..1) — так рисуется анимация. */
function gradient(c1: string, c2: string, t: number): ExpressionSpecification {
  if (t >= 1) return ['interpolate', ['linear'], ['line-progress'], 0, c1, 1, c2]
  const p = Math.max(0.0001, t)
  return ['interpolate', ['linear'], ['line-progress'], 0, c1, p, c2, Math.min(1, p + 0.0001), CLEAR, 1, CLEAR]
}

function firstSymbolLayer(map: MlMap): string | undefined {
  return map.getStyle().layers?.find((l) => l.type === 'symbol')?.id
}

/** Добавляет источники и слои маршрута (повторно — после смены стиля). */
export function ensureRouteLayers(map: MlMap) {
  if (map.getSource(SRC_ALL)) return
  const before = firstSymbolLayer(map)
  map.addSource(SRC_ALL, { type: 'geojson', data: EMPTY })
  map.addSource(SRC_ACTIVE, { type: 'geojson', data: EMPTY, lineMetrics: true })

  const inactiveBase = {
    type: 'line' as const,
    source: SRC_ALL,
    layout: { 'line-join': 'round' as const, 'line-cap': 'round' as const },
  }
  map.addLayer(
    {
      ...inactiveBase,
      id: L_INACTIVE_CAR,
      filter: ['all', ['==', ['get', 'mode'], 'car'], ['!', ['get', 'active']]],
      paint: { 'line-color': ROUTE_COLORS.car.from, 'line-width': 6, 'line-opacity': 0.35 },
    },
    before,
  )
  map.addLayer(
    {
      ...inactiveBase,
      id: L_INACTIVE_FOOT,
      filter: ['all', ['==', ['get', 'mode'], 'foot'], ['!', ['get', 'active']]],
      paint: {
        'line-color': ROUTE_COLORS.foot.from,
        'line-width': 5,
        'line-opacity': 0.45,
        'line-dasharray': [0.1, 2],
      },
    },
    before,
  )
  const lineLayout = { 'line-join': 'round' as const, 'line-cap': 'round' as const }
  map.addLayer(
    {
      id: L_GLOW,
      type: 'line',
      source: SRC_ACTIVE,
      layout: lineLayout,
      paint: { 'line-width': 18, 'line-blur': 10, 'line-gradient': gradient(CLEAR, CLEAR, 1) },
    },
    before,
  )
  map.addLayer(
    {
      id: L_CASING,
      type: 'line',
      source: SRC_ACTIVE,
      layout: lineLayout,
      paint: { 'line-width': 10, 'line-gradient': gradient(CLEAR, CLEAR, 1) },
    },
    before,
  )
  map.addLayer(
    {
      id: L_LINE,
      type: 'line',
      source: SRC_ACTIVE,
      layout: lineLayout,
      paint: { 'line-width': 6, 'line-gradient': gradient(CLEAR, CLEAR, 1) },
    },
    before,
  )
}

export function setRouteData(map: MlMap, routes: Partial<Record<TravelMode, Route>>, active: TravelMode) {
  const all = map.getSource(SRC_ALL) as GeoJSONSource | undefined
  const act = map.getSource(SRC_ACTIVE) as GeoJSONSource | undefined
  if (!all || !act) return
  const features = (Object.values(routes) as Route[]).map((r) => ({
    type: 'Feature' as const,
    properties: { mode: r.mode, active: r.mode === active },
    geometry: { type: 'LineString' as const, coordinates: r.geometry },
  }))
  all.setData({ type: 'FeatureCollection', features })
  const a = routes[active]
  act.setData(
    a
      ? {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: a.geometry } }],
        }
      : EMPTY,
  )
}

export function paintActive(map: MlMap, mode: TravelMode, t: number, darkCasing: boolean) {
  if (!map.getLayer(L_LINE)) return
  const c = ROUTE_COLORS[mode]
  const casing = darkCasing ? 'rgba(11,13,18,0.9)' : 'rgba(255,255,255,0.95)'
  map.setPaintProperty(L_GLOW, 'line-gradient', gradient(hexToRgba(c.from, 0.35), hexToRgba(c.to, 0.35), t))
  map.setPaintProperty(L_CASING, 'line-gradient', gradient(casing, casing, t))
  map.setPaintProperty(L_LINE, 'line-gradient', gradient(c.from, c.to, t))
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3)

/** Анимирует «прорисовку» активной линии. Возвращает функцию отмены. */
export function animateActive(map: MlMap, mode: TravelMode, darkCasing: boolean, duration = 1100) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    paintActive(map, mode, 1, darkCasing)
    return () => {}
  }
  let raf = 0
  const start = performance.now()
  const frame = (now: number) => {
    const x = Math.min(1, (now - start) / duration)
    paintActive(map, mode, ease(x), darkCasing)
    if (x < 1) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
