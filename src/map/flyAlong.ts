import type { Map as MlMap } from 'maplibre-gl'
import { cumulative, pointAt } from '../services/elevation'
import type { LngLat, Route } from '../services/types'

function bearing(a: LngLat, b: LngLat): number {
  const toRad = Math.PI / 180
  const y = Math.sin((b[0] - a[0]) * toRad) * Math.cos(b[1] * toRad)
  const x =
    Math.cos(a[1] * toRad) * Math.sin(b[1] * toRad) -
    Math.sin(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.cos((b[0] - a[0]) * toRad)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/** Плавное приближение угла к цели по кратчайшей дуге */
function lerpAngle(from: number, to: number, k: number) {
  const d = ((((to - from) % 360) + 540) % 360) - 180
  return from + d * k
}

const easeInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/**
 * «Пролёт» камеры вдоль маршрута: наклон, поворот по направлению движения.
 * Любое действие пользователя с картой останавливает пролёт.
 */
export function flyAlongRoute(map: MlMap, route: Route, onEnd: () => void): () => void {
  const line = route.geometry
  const cum = cumulative(line)
  const total = cum[cum.length - 1]
  const duration = Math.min(26000, Math.max(9000, total * 2))
  const zoom = route.mode === 'car' ? (total > 15000 ? 14.6 : 15.6) : 16.6
  const lookAhead = Math.max(60, Math.min(400, total * 0.04))

  let raf = 0
  let stopped = false
  let cam = bearing(line[0], pointAt(line, cum, lookAhead))

  const cleanup = () => {
    cancelAnimationFrame(raf)
    map.off('mousedown', interrupt)
    map.off('touchstart', interrupt)
    map.off('wheel', interrupt)
  }
  const finish = () => {
    if (stopped) return
    stopped = true
    cleanup()
    map.easeTo({ pitch: 0, bearing: 0, duration: 900 })
    onEnd()
  }
  const interrupt = () => finish()

  map.on('mousedown', interrupt)
  map.on('touchstart', interrupt)
  map.on('wheel', interrupt)

  // Сначала — подлёт к старту
  map.flyTo({ center: line[0], zoom, pitch: 62, bearing: cam, duration: 1600, essential: true })
  map.once('moveend', () => {
    if (stopped) return
    const t0 = performance.now()
    const frame = (now: number) => {
      if (stopped) return
      const t = Math.min(1, (now - t0) / duration)
      const d = easeInOut(t) * total
      const c = pointAt(line, cum, d)
      cam = lerpAngle(cam, bearing(c, pointAt(line, cum, d + lookAhead)), 0.06)
      map.jumpTo({ center: c, bearing: cam, pitch: 62, zoom })
      if (t < 1) raf = requestAnimationFrame(frame)
      else finish()
    }
    raf = requestAnimationFrame(frame)
  })

  return finish
}
