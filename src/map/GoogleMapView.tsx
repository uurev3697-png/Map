import {
  AdvancedMarker,
  APIProvider,
  ColorScheme,
  Map,
  Polyline,
  useMap,
} from '@vis.gl/react-google-maps'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LngLat, Route, TravelMode } from '../services/types'
import { GOOGLE_KEY, GOOGLE_MAP_ID, ROUTE_COLORS } from './styles'
import type { MapViewProps } from './types'

/**
 * Карта Google — строго через официальный Maps JavaScript API.
 * Маршрут считается нашим слоем сервисов и рисуется как Polyline.
 */
export default function GoogleMapView(props: MapViewProps) {
  return (
    <APIProvider apiKey={GOOGLE_KEY} language="ru" region="RU">
      <div className="absolute inset-0">
        <Map
          mapId={GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
          defaultCenter={{ lat: 55.7558, lng: 37.6176 }}
          defaultZoom={11}
          colorScheme={props.dark ? ColorScheme.DARK : ColorScheme.LIGHT}
          disableDefaultUI
          clickableIcons={false}
          gestureHandling="greedy"
          draggableCursor="crosshair"
          onClick={(e) => {
            const ll = e.detail.latLng
            if (ll) props.onMapClick([ll.lng, ll.lat])
          }}
          onIdle={(e) => {
            const c = e.map.getCenter()
            if (c) props.onCenterChange?.([c.lng(), c.lat()])
          }}
        />
        <Overlay {...props} />
      </div>
    </APIProvider>
  )
}

const toLL = ([lng, lat]: LngLat) => ({ lat, lng })

function Overlay(props: MapViewProps) {
  const map = useMap()
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    if (!map) return
    props.onReady?.({
      zoomIn: () => map.setZoom((map.getZoom() ?? 10) + 1),
      zoomOut: () => map.setZoom((map.getZoom() ?? 10) - 1),
      flyTo: (coord, zoom = 15) => {
        map.panTo(toLL(coord))
        map.setZoom(zoom)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Вписать маршрут
  useEffect(() => {
    if (!map || !props.fitKey) return
    const { routes, waypoints, padding } = propsRef.current
    const pts: LngLat[] = Object.values(routes).flatMap((r) => [
      [r!.bbox[0], r!.bbox[1]] as LngLat,
      [r!.bbox[2], r!.bbox[3]] as LngLat,
    ])
    for (const w of waypoints) pts.push(w.coord)
    if (pts.length === 1) {
      map.panTo(toLL(pts[0]))
      map.setZoom(Math.max(map.getZoom() ?? 14, 14))
    } else if (pts.length > 1) {
      const b = new google.maps.LatLngBounds()
      pts.forEach((p) => b.extend(toLL(p)))
      map.fitBounds(b, {
        top: padding.top + 60,
        right: padding.right + 60,
        bottom: padding.bottom + 60,
        left: padding.left + 60,
      })
    }
  }, [map, props.fitKey])

  useEffect(() => {
    if (!map || !props.focus) return
    map.panTo(toLL(props.focus.coord))
    map.setZoom(17)
  }, [map, props.focus])

  const modes = Object.keys(props.routes) as TravelMode[]
  return (
    <>
      {modes
        .filter((m) => m !== props.activeMode)
        .map((m) => (
          <Polyline
            key={`inactive-${m}`}
            path={props.routes[m]!.geometry.map(toLL)}
            strokeColor={ROUTE_COLORS[m].from}
            strokeOpacity={0.35}
            strokeWeight={6}
            zIndex={1}
          />
        ))}
      {props.routes[props.activeMode] && (
        <AnimatedRoute route={props.routes[props.activeMode]!} dark={props.dark} />
      )}
      {props.alternatives.map(({ idx, route }) => (
        <Polyline
          key={`alt-${idx}`}
          path={route.geometry.map(toLL)}
          strokeColor="#8a94a6"
          strokeOpacity={0.9}
          strokeWeight={7}
          zIndex={0}
          clickable
          onClick={() => props.onSelectAlternative(idx)}
        />
      ))}
      {props.waypoints.map((wp) => (
        <AdvancedMarker
          key={`${wp.id}-${wp.coord.join(',')}`}
          position={toLL(wp.coord)}
          draggable
          anchorLeft="-50%"
          anchorTop="-100%"
          onDragEnd={(e) => {
            const ll = e.latLng
            if (ll) props.onMarkerDrag(wp.id, [ll.lng(), ll.lat()])
          }}
        >
          <div className={`route-marker route-marker--${wp.kind} is-dropping`}>
            <div className="route-marker__inner">
              <div className="route-marker__pin">
                <span>{wp.label}</span>
              </div>
              <div className="route-marker__tip" />
            </div>
            <div className="route-marker__shadow" />
          </div>
        </AdvancedMarker>
      ))}
      {props.me && (
        <AdvancedMarker position={toLL(props.me.coord)} anchorLeft="-50%" anchorTop="-50%" zIndex={5}>
          <div className={'me-marker' + (props.me.heading !== null ? ' has-heading' : '')}>
            <div className="me-marker__cone" style={{ transform: `rotate(${props.me.heading ?? 0}deg)` }} />
            <div className="me-marker__pulse" />
            <div className="me-marker__dot" />
          </div>
        </AdvancedMarker>
      )}
    </>
  )
}

/** Постепенная прорисовка маршрута: путь растёт кадр за кадром. */
function AnimatedRoute({ route, dark }: { route: Route; dark: boolean }) {
  const full = useMemo(() => route.geometry.map(toLL), [route])
  const [count, setCount] = useState(2)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const x = Math.min(1, (now - start) / 1100)
      const e = 1 - Math.pow(1 - x, 3)
      setCount(Math.max(2, Math.ceil(full.length * e)))
      if (x < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [full])
  const path = full.slice(0, count)
  const c = ROUTE_COLORS[route.mode]
  return (
    <>
      <Polyline path={path} strokeColor={dark ? '#0b0d12' : '#ffffff'} strokeOpacity={0.95} strokeWeight={10} zIndex={2} />
      <Polyline path={path} strokeColor={c.from} strokeOpacity={1} strokeWeight={6} zIndex={3} />
    </>
  )
}
