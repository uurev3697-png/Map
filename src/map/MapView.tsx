import * as maplibregl from 'maplibre-gl'
import type { Map as MlMap, MapMouseEvent, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre v6 ищет воркер относительно своего модуля, а после бандлинга Vite
// этот путь ломается — явно отдаём URL воркера как ассет.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import type { LngLat } from '../services/types'
import { flyAlongRoute } from './flyAlong'
import { createMarkerElement, createMeElement, replayMarker, updateMarkerElement } from './markers'
import { animateActive, ensureRouteLayers, L_ALT_HIT, paintActive, setRouteData } from './routeLayers'
import { styleFor, type LayerId } from './styles'
import type { MapViewProps } from './types'

maplibregl.setWorkerUrl(workerUrl)

const START_CENTER: LngLat = [37.6176, 55.7558] // Москва
const START_ZOOM = 11

type Props = MapViewProps & { layer: Exclude<LayerId, 'google'>; winter: boolean }

// Пустой стиль на время загрузки настоящего (он собирается асинхронно)
const BLANK = { version: 8 as const, sources: {}, layers: [] }

export default function MapView(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const meRef = useRef<Marker | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const cancelAnimRef = useRef<() => void>(() => {})
  const [styleReady, setStyleReady] = useState(0)
  const [fading, setFading] = useState(false)

  // Инициализация карты
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: BLANK,
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
    map.on('click', (e: MapMouseEvent) => {
      // Клик по альтернативному маршруту — выбираем его, а не ставим точку
      const alt = map.getLayer(L_ALT_HIT) ? map.queryRenderedFeatures(e.point, { layers: [L_ALT_HIT] })[0] : undefined
      if (alt) {
        propsRef.current.onSelectAlternative(Number(alt.properties?.idx ?? 0))
        return
      }
      propsRef.current.onMapClick([e.lngLat.lng, e.lngLat.lat])
    })
    map.on('mousemove', (e: MapMouseEvent) => {
      const over = map.getLayer(L_ALT_HIT) && map.queryRenderedFeatures(e.point, { layers: [L_ALT_HIT] }).length > 0
      map.getCanvas().style.cursor = over ? 'pointer' : 'crosshair'
    })
    map.on('moveend', () => {
      const c = map.getCenter()
      propsRef.current.onCenterChange?.([c.lng, c.lat])
    })
    map.getCanvas().style.cursor = 'crosshair'

    propsRef.current.onReady?.({
      zoomIn: () => map.zoomIn({ duration: 300 }),
      zoomOut: () => map.zoomOut({ duration: 300 }),
      flyTo: (coord, zoom = 15) => map.flyTo({ center: coord, zoom, speed: 1.4, curve: 1.5, essential: true }),
      flyAlong: (route, onEnd) => flyAlongRoute(map, route, onEnd),
    })

    return () => {
      cancelAnimRef.current()
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      meRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Стиль карты: слой + зимний режим. Первый раз — сразу, дальше — с мягким затуханием
  const firstStyle = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    const first = firstStyle.current
    firstStyle.current = false
    if (!first) setFading(true)
    const started = performance.now()
    styleFor(props.layer, props.winter)
      .then((style) => {
        if (cancelled) return
        const wait = first ? 0 : Math.max(0, 160 - (performance.now() - started))
        setTimeout(() => !cancelled && map.setStyle(style, { diff: false }), wait)
      })
      .catch(() => {
        if (cancelled) return
        setFading(false)
        propsRef.current.onStyleError?.()
      })
    return () => {
      cancelled = true
    }
  }, [props.layer, props.winter])

  // Данные маршрутов + анимация активной линии
  const activeRoute = props.routes[props.activeMode]
  const darkCasing = props.layer !== 'osm'
  const lastAnimated = useRef<unknown>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady || !map.getSource('routes-all')) return
    setRouteData(map, props.routes, props.activeMode, props.alternatives)
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
  }, [props.routes, props.alternatives, props.activeMode, activeRoute, styleReady, darkCasing])

  // Маркеры точек маршрута (А, остановки, Б)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<string>()
    for (const wp of props.waypoints) {
      seen.add(wp.id)
      const m = markersRef.current.get(wp.id)
      if (!m) {
        const el = createMarkerElement(wp.kind, wp.label)
        el.addEventListener('click', (e) => e.stopPropagation())
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true }).setLngLat(wp.coord).addTo(map)
        marker.on('dragstart', () => el.classList.add('is-dragging'))
        marker.on('dragend', () => {
          el.classList.remove('is-dragging')
          const ll = marker.getLngLat()
          propsRef.current.onMarkerDrag(wp.id, [ll.lng, ll.lat])
        })
        markersRef.current.set(wp.id, marker)
        replayMarker(el)
      } else {
        updateMarkerElement(m.getElement(), wp.kind, wp.label)
        const cur = m.getLngLat()
        if (cur.lng !== wp.coord[0] || cur.lat !== wp.coord[1]) {
          m.setLngLat(wp.coord)
          replayMarker(m.getElement())
        }
      }
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.remove()
        markersRef.current.delete(id)
      }
    }
  }, [props.waypoints])

  // «Я здесь»
  const me = props.me
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!me) {
      meRef.current?.remove()
      meRef.current = null
      return
    }
    if (!meRef.current) {
      meRef.current = new maplibregl.Marker({ element: createMeElement(), rotationAlignment: 'map', pitchAlignment: 'map' })
        .setLngLat(me.coord)
        .addTo(map)
    }
    meRef.current.setLngLat(me.coord)
    meRef.current.setRotation(me.heading ?? 0)
    meRef.current.getElement().classList.toggle('has-heading', me.heading !== null)
  }, [me])

  // 3D: наклон карты (здания в стиле уже объёмные)
  const firstTilt = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (firstTilt.current) {
      firstTilt.current = false
      if (!props.tilt3d) return
    }
    map.easeTo({
      pitch: props.tilt3d ? 60 : 0,
      bearing: props.tilt3d ? -17 : 0,
      zoom: props.tilt3d ? Math.max(map.getZoom(), 15.5) : map.getZoom(),
      duration: 1000,
    })
  }, [props.tilt3d])

  // Вписать маршрут / точки в экран
  useEffect(() => {
    const map = mapRef.current
    if (!map || !props.fitKey) return
    const { routes, waypoints } = propsRef.current
    // В область включаем и сами маркеры: маршрут «прилипает» к дороге и может их не покрывать
    const boxes = Object.values(routes).map((r) => r!.bbox)
    if (boxes.length) for (const w of waypoints) boxes.push([w.coord[0], w.coord[1], w.coord[0], w.coord[1]])
    const pts = waypoints.map((w) => w.coord)
    if (boxes.length) {
      const b: [number, number, number, number] = [
        Math.min(...boxes.map((x) => x[0])),
        Math.min(...boxes.map((x) => x[1])),
        Math.max(...boxes.map((x) => x[2])),
        Math.max(...boxes.map((x) => x[3])),
      ]
      map.fitBounds(b, { padding: 60, duration: 1400, maxZoom: 17, essential: true })
    } else if (pts.length > 1) {
      map.fitBounds(pts.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(pts[0], pts[0])), {
        padding: 80,
        duration: 1200,
        maxZoom: 16,
      })
    } else if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: Math.max(map.getZoom(), 14), speed: 1.4, essential: true })
    }
  }, [props.fitKey])

  // Перелёт к шагу маршрута
  useEffect(() => {
    const map = mapRef.current
    if (!map || !props.focus) return
    map.flyTo({ center: props.focus.coord, zoom: 17, speed: 1.6, essential: true })
  }, [props.focus])

  // Отступы камеры под панели интерфейса. Задаём один раз на карте:
  // MapLibre складывает padding карты с padding в fitBounds/flyTo.
  const { top, right, bottom, left } = props.padding
  useEffect(() => {
    mapRef.current?.setPadding({ top, right, bottom, left })
  }, [top, right, bottom, left])

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
