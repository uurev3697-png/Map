import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import { formatDistance } from '../lib/format'
import { haversine } from '../services/elevation'
import type { LngLat } from '../services/types'

const SRC = 'ruler'
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Слои линейки — поверх всего, повторно после смены стиля */
export function ensureRulerLayers(map: MlMap) {
  if (map.getSource(SRC)) return
  map.addSource(SRC, { type: 'geojson', data: EMPTY })
  map.addLayer({
    id: 'ruler-casing',
    type: 'line',
    source: SRC,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 },
  })
  map.addLayer({
    id: 'ruler-line',
    type: 'line',
    source: SRC,
    layout: { 'line-join': 'round', 'line-cap': 'butt' },
    paint: { 'line-color': '#0f172a', 'line-width': 2.5, 'line-dasharray': [2.5, 1.5] },
  })
}

export function setRulerData(map: MlMap, points: LngLat[]) {
  const src = map.getSource(SRC) as GeoJSONSource | undefined
  src?.setData(
    points.length > 1
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } }] }
      : EMPTY,
  )
}

/** Накопленные расстояния до каждой точки */
export function rulerDistances(points: LngLat[]): number[] {
  const out = [0]
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + haversine(points[i - 1], points[i]))
  return out
}

export function createRulerVertex(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'ruler-vertex'
  el.innerHTML = '<div class="ruler-vertex__dot"></div><div class="ruler-vertex__label"></div>'
  return el
}

export function updateRulerVertex(el: HTMLElement, index: number, dist: number, last: boolean) {
  const label = el.querySelector('.ruler-vertex__label') as HTMLElement
  label.textContent = index === 0 ? 'Старт' : formatDistance(dist)
  el.classList.toggle('is-last', last && index > 0)
}
