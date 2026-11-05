import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import type { Route, TravelMode } from '../services/types'
import { ROUTE_COLORS } from './styles'

const SRC_ALL = 'routes-all'
const SRC_ACTIVE = 'routes-active'
const SRC_ALT = 'routes-alt'
export const L_ALT_HIT = 'route-alt-hit'
const L_ALT_CASING = 'route-alt-casing'
const L_ALT = 'route-alt'
const L_INACTIVE_CASING = 'route-inactive-casing'
const L_INACTIVE: Record<TravelMode, string> = {
  car: 'route-inactive-car',
  bike: 'route-inactive-bike',
  foot: 'route-inactive-foot',
}
const L_GLOW = 'route-active-glow'
const L_CASING = 'route-active-casing'
const L_LINE = 'route-active-line'
const L_FOOT_DOTS = 'route-active-foot-dots'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const CLEAR = 'rgba(0,0,0,0)'

function hexToRgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Градиент вдоль линии, «проявленный» до доли t (0..1) — так рисуется анимация. */
function gradient(c1: string, c2: string, t: number): ExpressionSpecification {
  if (t >= 0.999) return ['interpolate', ['linear'], ['line-progress'], 0, c1, 1, c2]
  const p = Math.max(0.0001, t)
  // остановки должны строго возрастать: p < p + ε < 1
  return ['interpolate', ['linear'], ['line-progress'], 0, c1, p, c2, p + 0.0005, CLEAR, 1, CLEAR]
}

function firstSymbolLayer(map: MlMap): string | undefined {
  return map.getStyle().layers?.find((l) => l.type === 'symbol')?.id
}

// Ширина линий растёт с зумом: на обзорном масштабе тоньше, на улицах — заметно толще
const w = (z12: number, z16: number, z18: number): ExpressionSpecification => [
  'interpolate', ['linear'], ['zoom'], 10, z12 * 0.8, 12, z12, 16, z16, 18, z18,
]

const line = (coords: [number, number][], props: Record<string, unknown> = {}) => ({
  type: 'Feature' as const,
  properties: props,
  geometry: { type: 'LineString' as const, coordinates: coords },
})

/** Добавляет источники и слои маршрута (повторно — после смены стиля). */
export function ensureRouteLayers(map: MlMap) {
  if (map.getSource(SRC_ALL)) return
  const before = firstSymbolLayer(map)
  map.addSource(SRC_ALT, { type: 'geojson', data: EMPTY })
  map.addSource(SRC_ALL, { type: 'geojson', data: EMPTY })
  map.addSource(SRC_ACTIVE, { type: 'geojson', data: EMPTY, lineMetrics: true })

  const layout = { 'line-join': 'round' as const, 'line-cap': 'round' as const }
  const inactive: ExpressionSpecification = ['!', ['get', 'active']]

  // Альтернативные варианты активного режима: серые, кликабельные
  map.addLayer(
    { id: L_ALT_CASING, type: 'line', source: SRC_ALT, layout, paint: { 'line-color': '#ffffff', 'line-width': w(9, 12, 16) } },
    before,
  )
  map.addLayer(
    { id: L_ALT, type: 'line', source: SRC_ALT, layout, paint: { 'line-color': '#8a94a6', 'line-width': w(5, 7, 10) } },
    before,
  )
  // Широкая невидимая линия — чтобы по альтернативе было легко попасть пальцем
  map.addLayer(
    { id: L_ALT_HIT, type: 'line', source: SRC_ALT, layout, paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 24 } },
    before,
  )

  // Неактивные способы передвижения: мягкая подложка + цветная линия
  map.addLayer(
    {
      id: L_INACTIVE_CASING,
      type: 'line',
      source: SRC_ALL,
      layout,
      filter: inactive,
      paint: { 'line-color': '#ffffff', 'line-width': w(8, 11, 15), 'line-opacity': 0.6 },
    },
    before,
  )
  const dash: Record<TravelMode, number[] | undefined> = { car: undefined, bike: [1.2, 1.4], foot: [0.1, 1.8] }
  for (const m of ['car', 'bike', 'foot'] as const) {
    map.addLayer(
      {
        id: L_INACTIVE[m],
        type: 'line',
        source: SRC_ALL,
        layout: m === 'bike' ? { 'line-join': 'round', 'line-cap': 'butt' } : layout,
        filter: ['all', ['==', ['get', 'mode'], m], inactive],
        paint: {
          'line-color': ROUTE_COLORS[m].from,
          'line-width': m === 'car' ? w(4, 6, 9) : w(4.5, 6.5, 9),
          'line-opacity': m === 'car' ? 0.55 : 0.85,
          ...(dash[m] ? { 'line-dasharray': dash[m] } : {}),
        },
      },
      before,
    )
  }

  // Активный маршрут: тень/свечение → контрастная обводка → градиентная линия
  map.addLayer(
    {
      id: L_GLOW,
      type: 'line',
      source: SRC_ACTIVE,
      layout,
      paint: { 'line-width': w(16, 22, 28), 'line-blur': 8, 'line-gradient': gradient(CLEAR, CLEAR, 1) },
    },
    before,
  )
  map.addLayer(
    {
      id: L_CASING,
      type: 'line',
      source: SRC_ACTIVE,
      layout,
      paint: { 'line-width': w(10, 14, 19), 'line-gradient': gradient(CLEAR, CLEAR, 1) },
    },
    before,
  )
  map.addLayer(
    {
      id: L_LINE,
      type: 'line',
      source: SRC_ACTIVE,
      layout,
      paint: { 'line-width': w(6.5, 9, 13), 'line-gradient': gradient(CLEAR, CLEAR, 1) },
    },
    before,
  )
  // Пешеходный маршрут: белый пунктир по центру линии (появляется после прорисовки)
  map.addLayer(
    {
      id: L_FOOT_DOTS,
      type: 'line',
      source: SRC_ACTIVE,
      layout,
      paint: {
        'line-color': '#ffffff',
        'line-width': w(1.6, 2.6, 4),
        'line-dasharray': [0.1, 2.4],
        'line-opacity': 0,
        'line-opacity-transition': { duration: 400, delay: 0 },
      },
    },
    before,
  )
}

/**
 * routes — выбранный вариант для каждого способа передвижения;
 * alternatives — остальные варианты активного способа (idx — номер варианта).
 */
export function setRouteData(
  map: MlMap,
  routes: Partial<Record<TravelMode, Route>>,
  active: TravelMode,
  alternatives: { idx: number; route: Route }[],
) {
  const all = map.getSource(SRC_ALL) as GeoJSONSource | undefined
  const act = map.getSource(SRC_ACTIVE) as GeoJSONSource | undefined
  const alt = map.getSource(SRC_ALT) as GeoJSONSource | undefined
  if (!all || !act || !alt) return
  all.setData({
    type: 'FeatureCollection',
    features: (Object.values(routes) as Route[]).map((r) => line(r.geometry, { mode: r.mode, active: r.mode === active })),
  })
  const a = routes[active]
  act.setData(a ? { type: 'FeatureCollection', features: [line(a.geometry)] } : EMPTY)
  alt.setData({ type: 'FeatureCollection', features: alternatives.map((x) => line(x.route.geometry, { idx: x.idx })) })
}

/** Градиент с серой пройденной частью (0..passed) — для режима навигации */
function withPassed(grey: string, c1: string, c2: string, passed: number): ExpressionSpecification {
  const p = Math.min(0.998, Math.max(0.0001, passed))
  return ['interpolate', ['linear'], ['line-progress'], 0, grey, p, grey, p + 0.001, c1, 1, c2]
}

/**
 * Раскраска активной линии. t — доля «прорисовки» (анимация появления),
 * passed — доля уже пройденного пути в навигации (серым).
 */
export function paintActive(map: MlMap, mode: TravelMode, t: number, night: boolean, passed = 0) {
  if (!map.getLayer(L_LINE)) return
  const c = ROUTE_COLORS[mode]
  const casing = night ? 'rgba(14,17,23,0.92)' : '#ffffff'
  // Днём — тёмная мягкая тень (линия «отрывается» от карты), ночью — цветное свечение
  const glow1 = night ? hexToRgba(c.from, 0.55) : 'rgba(15,23,42,0.30)'
  const glow2 = night ? hexToRgba(c.to, 0.55) : 'rgba(15,23,42,0.30)'
  if (passed > 0 && t >= 0.999) {
    const grey = night ? '#5b6372' : '#a3acb9'
    map.setPaintProperty(L_GLOW, 'line-gradient', withPassed(CLEAR, glow1, glow2, passed))
    map.setPaintProperty(L_CASING, 'line-gradient', gradient(casing, casing, 1))
    map.setPaintProperty(L_LINE, 'line-gradient', withPassed(grey, c.from, c.to, passed))
  } else {
    map.setPaintProperty(L_GLOW, 'line-gradient', gradient(glow1, glow2, t))
    map.setPaintProperty(L_CASING, 'line-gradient', gradient(casing, casing, t))
    map.setPaintProperty(L_LINE, 'line-gradient', gradient(c.from, c.to, t))
  }
  // Пунктир — только на крупных масштабах, на обзорном он «дробит» линию
  map.setPaintProperty(
    L_FOOT_DOTS,
    'line-opacity',
    mode === 'foot' && t >= 0.999 ? ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 0.95] : 0,
  )
  const under = night ? '#0e1117' : '#ffffff'
  map.setPaintProperty(L_INACTIVE_CASING, 'line-color', under)
  map.setPaintProperty(L_ALT_CASING, 'line-color', under)
  map.setPaintProperty(L_ALT, 'line-color', night ? '#7d8799' : '#9aa3b2')
}

const ease = (x: number) => 1 - Math.pow(1 - x, 3)

/** Анимирует «прорисовку» активной линии. Возвращает функцию отмены. */
export function animateActive(map: MlMap, mode: TravelMode, night: boolean, duration = 1100) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    paintActive(map, mode, 1, night)
    return () => {}
  }
  let raf = 0
  const start = performance.now()
  const frame = (now: number) => {
    const x = Math.min(1, (now - start) / duration)
    paintActive(map, mode, ease(x), night)
    if (x < 1) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
