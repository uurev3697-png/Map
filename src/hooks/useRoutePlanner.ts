import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { isAbort, ServiceError } from '../services/errors'
import { geocoder } from '../services/geocoding'
import { buildRoute } from '../services/routing'
import { formatCoord } from '../lib/format'
import type { LngLat, Route, TravelMode } from '../services/types'

export type Which = 'from' | 'to'

export interface Waypoint {
  coord: LngLat
  label: string
  sublabel?: string
  resolving?: boolean
}

export interface RouteState {
  status: 'idle' | 'loading' | 'ok' | 'error'
  route?: Route
  error?: string
}

const MODES: TravelMode[] = ['foot', 'car']
const MODE_LABEL: Record<TravelMode, string> = { foot: 'Пешком', car: 'На машине' }
const IDLE: Record<TravelMode, RouteState> = { foot: { status: 'idle' }, car: { status: 'idle' } }

const same = (a?: LngLat | null, b?: LngLat | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1]

export function useRoutePlanner() {
  const toast = useToast()
  const [points, setPoints] = useState<Record<Which, Waypoint | null>>({ from: null, to: null })
  const [routes, setRoutes] = useState<Record<TravelMode, RouteState>>(IDLE)
  const [activeMode, setActiveMode] = useState<TravelMode>('car')
  const [fitKey, setFitKey] = useState('')
  const reverseCtl = useRef<Record<Which, AbortController | null>>({ from: null, to: null })
  const activeRef = useRef(activeMode)
  activeRef.current = activeMode

  const setPoint = useCallback((which: Which, wp: Waypoint | null) => {
    reverseCtl.current[which]?.abort()
    setPoints((p) => ({ ...p, [which]: wp }))
  }, [])

  /** Точка по координате (клик по карте / перетаскивание / геолокация) + обратный геокодинг. */
  const setPointFromCoord = useCallback((which: Which, coord: LngLat, label?: string) => {
    reverseCtl.current[which]?.abort()
    const ctl = new AbortController()
    reverseCtl.current[which] = ctl
    setPoints((p) => ({
      ...p,
      [which]: { coord, label: label ?? 'Точка на карте', sublabel: 'Определяем адрес…', resolving: true },
    }))
    geocoder
      .reverse(coord, ctl.signal)
      .then((place) => {
        setPoints((p) => {
          const cur = p[which]
          if (!cur || !same(cur.coord, coord)) return p
          return {
            ...p,
            [which]: {
              coord,
              label: label ?? place?.name ?? 'Точка на карте',
              sublabel: place ? (label ? place.name : place.description) || formatCoord(coord) : formatCoord(coord),
            },
          }
        })
      })
      .catch((e) => {
        if (isAbort(e)) return
        setPoints((p) => {
          const cur = p[which]
          if (!cur || !same(cur.coord, coord)) return p
          return { ...p, [which]: { coord, label: label ?? 'Точка на карте', sublabel: formatCoord(coord) } }
        })
      })
  }, [])

  const swap = useCallback(() => {
    reverseCtl.current.from?.abort()
    reverseCtl.current.to?.abort()
    setPoints((p) => ({ from: p.to && { ...p.to, resolving: false }, to: p.from && { ...p.from, resolving: false } }))
  }, [])

  const clearAll = useCallback(() => {
    setPoints({ from: null, to: null })
    setRoutes(IDLE)
  }, [])

  // Построение маршрутов при изменении координат А и Б
  const fromC = points.from?.coord
  const toC = points.to?.coord
  const key = fromC && toC ? `${fromC.join(',')}|${toC.join(',')}` : ''

  const single = !key && (fromC || toC) ? (fromC ?? toC)!.join(',') : ''

  // Одна точка — подлетаем к ней
  useEffect(() => {
    if (single) setFitKey(`pt:${single}`)
  }, [single])

  useEffect(() => {
    if (!fromC || !toC) {
      setRoutes(IDLE)
      return
    }
    if (same(fromC, toC)) {
      setRoutes(IDLE)
      toast.show({ kind: 'info', title: 'Точки совпадают', message: 'Выберите разные точки А и Б.' })
      return
    }
    const ctl = new AbortController()
    setRoutes((r) => ({
      foot: { status: 'loading', route: r.foot.route },
      car: { status: 'loading', route: r.car.route },
    }))

    Promise.allSettled(MODES.map((m) => buildRoute(m, fromC, toC, ctl.signal))).then((results) => {
      if (ctl.signal.aborted) return
      const next = { ...IDLE }
      const errors: { mode: TravelMode; err: ServiceError }[] = []
      results.forEach((res, i) => {
        const mode = MODES[i]
        if (res.status === 'fulfilled') next[mode] = { status: 'ok', route: res.value }
        else {
          if (isAbort(res.reason)) return
          const err = res.reason instanceof ServiceError ? res.reason : new ServiceError('unknown')
          errors.push({ mode, err })
          next[mode] = { status: 'error', error: err.message }
        }
      })
      setRoutes(next)

      if (errors.length === 2) {
        const sameKind = errors[0].err.kind === errors[1].err.kind
        toast.show({
          kind: 'error',
          title: errors[0].err.kind === 'network' ? 'Нет сети' : 'Не удалось построить маршрут',
          message: sameKind ? errors[0].err.message : errors.map((e) => `${MODE_LABEL[e.mode]}: ${e.err.message}`).join(' '),
        })
      } else if (errors.length === 1) {
        const { mode, err } = errors[0]
        toast.show({ kind: 'error', title: `${MODE_LABEL[mode]}: маршрут недоступен`, message: err.message })
        if (activeRef.current === mode) setActiveMode(mode === 'car' ? 'foot' : 'car')
      }
      if (errors.length < 2) setFitKey(`route:${key}`)
    })
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refit = useCallback(() => setFitKey((k) => (k ? k.replace(/#\d+$/, '') + '#' + Date.now() : k)), [])

  return {
    points,
    routes,
    activeMode,
    setActiveMode,
    fitKey,
    refit,
    setPoint,
    setPointFromCoord,
    swap,
    clearAll,
  }
}
