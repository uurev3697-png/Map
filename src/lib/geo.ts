import type { LngLat } from '../services/types'

const R = 6371000
const RAD = Math.PI / 180

export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin((b[0] - a[0]) * RAD) * Math.cos(b[1] * RAD)
  const x =
    Math.cos(a[1] * RAD) * Math.sin(b[1] * RAD) - Math.sin(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.cos((b[0] - a[0]) * RAD)
  return ((Math.atan2(y, x) / RAD) + 360) % 360
}

export interface Projection {
  /** расстояние от начала линии до проекции, м */
  along: number
  /** расстояние от точки до линии, м */
  offset: number
  /** точка на линии */
  point: LngLat
  /** индекс сегмента */
  seg: number
}

/**
 * Проекция точки на ломаную (локальная равнопромежуточная проекция — точности
 * хватает на масштабах городских маршрутов).
 * from/to — окно поиска по расстоянию вдоль линии (ускоряет и не даёт «перескочить» на петлю).
 */
export function projectOnLine(line: LngLat[], cum: number[], p: LngLat, from = 0, to = Infinity): Projection {
  const kx = Math.cos(p[1] * RAD) * R * RAD
  const ky = R * RAD
  let best: Projection = { along: 0, offset: Infinity, point: line[0], seg: 0 }
  for (let i = 0; i < line.length - 1; i++) {
    if (cum[i + 1] < from) continue
    if (cum[i] > to) break
    const a = line[i]
    const b = line[i + 1]
    const ax = (a[0] - p[0]) * kx
    const ay = (a[1] - p[1]) * ky
    const bx = (b[0] - p[0]) * kx
    const by = (b[1] - p[1]) * ky
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0
    const cx = ax + dx * t
    const cy = ay + dy * t
    const d = Math.hypot(cx, cy)
    if (d < best.offset) {
      best = {
        offset: d,
        along: cum[i] + (cum[i + 1] - cum[i]) * t,
        point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        seg: i,
      }
    }
  }
  return best
}
