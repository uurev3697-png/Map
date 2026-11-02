import * as maplibregl from 'maplibre-gl'
import type { Map as MlMap, MapMouseEvent, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre v6 ищет воркер относительно своего модуля, а после бандлинга Vite
// этот путь ломается — явно отдаём URL воркера как ассет.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import type { LngLat } from '../services/types'
import { createMarkerElement, replayMarker } from './markers'
import { animateActive, ensureRouteLayers, paintActive, setRouteData } from './routeLayers'
import { styleFor, type LayerId } from './styles'
import type { MapViewProps } from './types'

maplibregl.setWorkerUrl(workerUrl)

const START_CENTER: LngLat = [37.6176, 55.7558] // Москва
const START_ZOOM = 11

type Props = MapViewProps & { layer: Exclude<LayerId, 'google'> }

export default function MapView(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef<{ from?: Marker; to?: Marker }>({})
  const propsRef = useRef(props)
  propsRef.current = props
  const cancelAnimRef = useRef<() => void>(() => {})
  const [styleReady, setStyleReady] = useState(0)
  const [fading, setFading] = useState(false)
  const layerRef = useRef(props.layer)

  // Инициализация карты
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: styleFor(props.layer),
      center: START_CENTER,
      zoom: START_ZOOM,
      attributionControl: { compact: true },
      fadeDuration: 200,
    })
    mapRef.current = map
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.on('style.load', () => {
      localizeLabels(map)
      ensureRouteLayers(map)
      setStyleReady((n) => n + 1)
      setFading(false)
    })
    map.on('click', (e: MapMouseEvent) => propsRef.current.onMapClick([e.lngLat.lng, e.lngLat.lat]))
    map.on('moveend', () => {
      const c = map.getCenter()
      propsRef.current.onCenterChange?.([c.lng, c.lat])
    })
    map.getCanvas().style.cursor = 'crosshair'

    propsRef.current.onReady?.({
      zoomIn: () => map.zoomIn({ duration: 300 }),
      zoomOut: () => map.zoomOut({ duration: 300 }),
      flyTo: (coord, zoom = 15) => {
        const p = propsRef.current.padding
        map.flyTo({ center: coord, zoom, padding: p, speed: 1.4, curve: 1.5, essential: true })
      },
    })

    return () => {
      cancelAnimRef.current()
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Смена слоя карты с мягким затуханием
  useEffect(() => {
    const map = mapRef.current
    if (!map || layerRef.current === props.layer) return
    layerRef.current = props.layer
    setFading(true)
    const t = setTimeout(() => map.setStyle(styleFor(props.layer)), 160)
    return () => clearTimeout(t)
  }, [props.layer])

  // Данные маршрутов + анимация активной линии
  const activeRoute = props.routes[props.activeMode]
  const darkCasing = props.layer === 'dark'
  const lastAnimated = useRef<unknown>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady || !map.getSource('routes-all')) return
    setRouteData(map, props.routes, props.activeMode)
    if (!activeRoute) return
    if (lastAnimated.current === activeRoute) {
      // Тот же маршрут (например, после смены стиля) — рисуем сразу целиком
      paintActive(map, props.activeMode, 1, darkCasing)
      return
    }
    lastAnimated.current = activeRoute
    cancelAnimRef.current()
    cancelAnimRef.current = animateActive(map, props.activeMode, darkCasing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.routes, props.activeMode, activeRoute, styleReady, darkCasing])

  // Маркеры А и Б
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const which of ['from', 'to'] as const) {
      const coord = props[which]
      let m = markersRef.current[which]
      if (!coord) {
        m?.remove()
        markersRef.current[which] = undefined
        continue
      }
      if (!m) {
        const el = createMarkerElement(which)
        el.addEventListener('click', (e) => e.stopPropagation())
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
          .setLngLat(coord)
          .addTo(map)
        m = marker
        marker.on('dragstart', () => el.classList.add('is-dragging'))
        marker.on('dragend', () => {
          el.classList.remove('is-dragging')
          const ll = marker.getLngLat()
          propsRef.current.onMarkerDrag(which, [ll.lng, ll.lat])
        })
        markersRef.current[which] = m
        replayMarker(el)
      } else {
        const cur = m.getLngLat()
        if (cur.lng !== coord[0] || cur.lat !== coord[1]) {
          m.setLngLat(coord)
          replayMarker(m.getElement())
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.from, props.to])

  // Вписать маршрут / точки в экран
  useEffect(() => {
    const map = mapRef.current
    if (!map || !props.fitKey) return
    const { routes, from, to, padding } = propsRef.current
    const boxes = Object.values(routes).map((r) => r!.bbox)
    if (boxes.length) {
      const b: [number, number, number, number] = [
        Math.min(...boxes.map((x) => x[0])),
        Math.min(...boxes.map((x) => x[1])),
        Math.max(...boxes.map((x) => x[2])),
        Math.max(...boxes.map((x) => x[3])),
      ]
      map.fitBounds(b, { padding: pad(padding, 60), duration: 1400, maxZoom: 17, essential: true })
    } else if (from && to) {
      map.fitBounds([from, to].reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(from, from)), {
        padding: pad(padding, 80),
        duration: 1200,
        maxZoom: 16,
      })
    } else if (from || to) {
      map.flyTo({ center: (from ?? to)!, zoom: Math.max(map.getZoom(), 14), padding, speed: 1.4, essential: true })
    }
  }, [props.fitKey])

  // Перелёт к шагу маршрута
  useEffect(() => {
    const map = mapRef.current
    if (!map || !props.focus) return
    map.flyTo({ center: props.focus.coord, zoom: 17, padding: props.padding, speed: 1.6, essential: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focus])

  return (
    <div className="absolute inset-0">
      {/* inline-стиль: CSS MapLibre (.maplibregl-map { position: relative }) перебил бы класс Tailwind */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div
        className="pointer-events-none absolute inset-0 bg-[var(--bg)] transition-opacity duration-300"
        style={{ opacity: fading ? 0.55 : 0 }}
      />
    </div>
  )
}

/** Подписи на русском: name:ru → name (вместо двуязычных «Moscow Москва»). */
function localizeLabels(map: MlMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue
    const tf = map.getLayoutProperty(layer.id, 'text-field')
    if (!tf || !JSON.stringify(tf).includes('name')) continue
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:ru'], ['get', 'name']])
  }
}

function pad(p: MapViewProps['padding'], extra: number) {
  return { top: p.top + extra, right: p.right + extra, bottom: p.bottom + extra, left: p.left + extra }
}
