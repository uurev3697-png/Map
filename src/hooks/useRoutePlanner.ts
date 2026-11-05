import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { formatCoord } from '../lib/format'
import { isAbort, ServiceError } from '../services/errors'
import { geocoder } from '../services/geocoding'
import { buildRoutes } from '../services/routing'
import { TRAVEL_MODES, type LngLat, type Route, type TravelMode } from '../services/types'

/** Идентификатор поля-точки: старт, финиш или промежуточная остановка */
export type Which = string

export interface Waypoint {
  coord: LngLat
  label: string
  sublabel?: string
  resolving?: boolean
}

export interface Slot {
  id: Which
  wp: Waypoint | null
}

export interface RouteState {
  status: 'idle' | 'loading' | 'ok' | 'error'
  /** Варианты маршрута (основной первым) */
  routes?: Route[]
  /** Выбранный вариант */
  selected: number
  error?: string
}

/** Выбранный вариант маршрута для режима */
export const pick = (s: RouteState): Route | undefined => s.routes?.[s.selected] ?? s.routes?.[0]

export type TimeMode = { kind: 'now' } | { kind: 'depart' | 'arrive'; time: string }

export const MAX_SLOTS = 5
export const MODE_LABEL: Record<TravelMode, string> = { foot: 'Пешком', bike: 'Велосипед', car: 'На машине' }

const idle = (): Record<TravelMode, RouteState> => ({
  foot: { status: 'idle', selected: 0 },
  bike: { status: 'idle', selected: 0 },
  car: { status: 'idle', selected: 0 },
})

const same = (a?: LngLat | null, b?: LngLat | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1]
let seq = 0
const newId = () => `s${++seq}`

export function useRoutePlanner() {
  const toast = useToast()
  const [slots, setSlots] = useState<Slot[]>(() => [
    { id: newId(), wp: null },
    { id: newId(), wp: null },
  ])
  const [routes, setRoutes] = useState(idle)
  const [activeMode, setActiveMode] = useState<TravelMode>('car')
  const [fitKey, setFitKey] = useState('')
  const [time, setTime] = useState<TimeMode>({ kind: 'now' })
  const reverseCtl = useRef(new Map<Which, AbortController>())
  const activeRef = useRef(activeMode)
  activeRef.current = activeMode

  const patchSlot = useCallback((id: Which, fn: (wp: Waypoint | null) => Waypoint | null) => {
    setSlots((ss) => ss.map((s) => (s.id === id ? { ...s, wp: fn(s.wp) } : s)))
  }, [])

  const setPoint = useCallback(
    (id: Which, wp: Waypoint | null) => {
      reverseCtl.current.get(id)?.abort()
      patchSlot(id, () => wp)
    },
    [patchSlot],
  )

  /** Точка по координате (клик по карте / перетаскивание / геолокация / ссылка) + обратный геокодинг. */
  const setPointFromCoord = useCallback(
    (id: Which, coord: LngLat, label?: string) => {
      reverseCtl.current.get(id)?.abort()
      const ctl = new AbortController()
      reverseCtl.current.set(id, ctl)
      patchSlot(id, () => ({ coord, label: label ?? 'Точка на карте', sublabel: 'Определяем адрес…', resolving: true }))
      const finish = (wp: Waypoint) => patchSlot(id, (cur) => (cur && same(cur.coord, coord) ? wp : cur))
      geocoder
        .reverse(coord, ctl.signal)
        .then((place) =>
          finish({
            coord,
            label: label ?? place?.name ?? 'Точка на карте',
            sublabel: place ? (label ? place.name : place.description) || formatCoord(coord) : formatCoord(coord),
          }),
        )
        .catch((e) => {
          if (!isAbort(e)) finish({ coord, label: label ?? 'Точка на карте', sublabel: formatCoord(coord) })
        })
    },
    [patchSlot],
  )

  /** Клик по карте: заполняем первое пустое поле, иначе меняем финиш */
  const setNextFromCoord = useCallback(
    (coord: LngLat) => {
      const empty = slots.find((s) => !s.wp)
      setPointFromCoord(empty ? empty.id : slots[slots.length - 1].id, coord)
    },
    [slots, setPointFromCoord],
  )

  const addStop = useCallback((): Which | null => {
    if (slots.length >= MAX_SLOTS) return null
    const id = newId()
    setSlots((ss) => [...ss.slice(0, -1), { id, wp: null }, ss[ss.length - 1]])
    return id
  }, [slots.length])

  const removeStop = useCallback((id: Which) => {
    reverseCtl.current.get(id)?.abort()
    setSlots((ss) => (ss.length > 2 ? ss.filter((s) => s.id !== id) : ss))
  }, [])

  /** Новый порядок полей (перетаскивание). Старт — первое поле, финиш — последнее. */
  const reorder = useCallback((ids: Which[]) => {
    setSlots((ss) => {
      const byId = new Map(ss.map((s) => [s.id, s]))
      return ids.map((id) => byId.get(id)!).filter(Boolean)
    })
  }, [])

  const swap = useCallback(() => {
    reverseCtl.current.forEach((c) => c.abort())
    setSlots((ss) => {
      const wps = ss.map((s) => s.wp && { ...s.wp, resolving: false }).reverse()
      return ss.map((s, i) => ({ ...s, wp: wps[i] }))
    })
  }, [])

  const clearAll = useCallback(() => {
    reverseCtl.current.forEach((c) => c.abort())
    setSlots([
      { id: newId(), wp: null },
      { id: newId(), wp: null },
    ])
    setRoutes(idle())
  }, [])

  /** Восстановить маршрут из ссылки */
  const loadPoints = useCallback(
    (pts: LngLat[], mode?: TravelMode) => {
      const ids = Array.from({ length: Math.max(2, pts.length) }, newId)
      setSlots(ids.map((id) => ({ id, wp: null })))
      pts.forEach((p, i) => setPointFromCoord(ids[i], p))
      if (mode) setActiveMode(mode)
    },
    [setPointFromCoord],
  )

  /** Навигация: старт — текущее место; пройденные остановки убираем (перестроение маршрута) */
  const startFrom = useCallback((coord: LngLat, dropIds: Which[] = []) => {
    reverseCtl.current.forEach((c) => c.abort())
    setSlots((ss) => {
      const rest = ss.filter((s, i) => i === 0 || i === ss.length - 1 || !dropIds.includes(s.id))
      return rest.map((s, i) => (i === 0 ? { ...s, wp: { coord, label: 'Моё местоположение', sublabel: 'Навигация' } } : s))
    })
  }, [])

  /** Открыть сохранённый маршрут: точки с готовыми подписями, без повторного геокодинга */
  const loadSaved = useCallback((pts: Waypoint[], mode?: TravelMode) => {
    reverseCtl.current.forEach((c) => c.abort())
    const list = pts.length >= 2 ? pts : [...pts, null]
    setSlots(list.map((wp) => ({ id: newId(), wp: wp && { ...wp, resolving: false } })))
    if (mode) setActiveMode(mode)
  }, [])

  const setAlternative = useCallback((mode: TravelMode, idx: number) => {
    setRoutes((r) => ({ ...r, [mode]: { ...r[mode], selected: idx } }))
  }, [])

  // ===== Построение маршрутов =====
  const filled = slots.filter((s) => s.wp).map((s) => s.wp!.coord)
  const complete = slots.every((s) => s.wp) || (filled.length >= 2 && !!slots[0].wp && !!slots[slots.length - 1].wp)
  const coords = complete ? filled : []
  const key = coords.length >= 2 ? coords.map((c) => c.join(',')).join('|') : ''
  const single = !key && filled.length === 1 ? filled[0].join(',') : ''

  useEffect(() => {
    if (single) setFitKey(`pt:${single}`)
  }, [single])

  useEffect(() => {
    if (!key) {
      setRoutes(idle())
      return
    }
    if (coords.every((c) => same(c, coords[0]))) {
      setRoutes(idle())
      toast.show({ kind: 'info', title: 'Точки совпадают', message: 'Выберите разные точки маршрута.' })
      return
    }
    const ctl = new AbortController()
    setRoutes((r) => {
      const next = idle()
      for (const m of TRAVEL_MODES) next[m] = { status: 'loading', routes: r[m].routes, selected: 0 }
      return next
    })

    Promise.allSettled(
      TRAVEL_MODES.map((m) => buildRoutes(m, coords, { signal: ctl.signal, alternatives: true })),
    ).then((results) => {
      if (ctl.signal.aborted) return
      const next = idle()
      const errors: { mode: TravelMode; err: ServiceError }[] = []
      results.forEach((res, i) => {
        const mode = TRAVEL_MODES[i]
        if (res.status === 'fulfilled') next[mode] = { status: 'ok', routes: res.value, selected: 0 }
        else {
          if (isAbort(res.reason)) return
          const err = res.reason instanceof ServiceError ? res.reason : new ServiceError('unknown')
          errors.push({ mode, err })
          next[mode] = { status: 'error', error: err.message, selected: 0 }
        }
      })
      setRoutes(next)

      if (errors.length === TRAVEL_MODES.length) {
        const kinds = new Set(errors.map((e) => e.err.kind))
        toast.show({
          kind: 'error',
          title: errors[0].err.kind === 'network' ? 'Нет сети' : 'Не удалось построить маршрут',
          message:
            kinds.size === 1
              ? errors[0].err.message
              : errors.map((e) => `${MODE_LABEL[e.mode]}: ${e.err.message}`).join(' '),
        })
        return
      }
      for (const { mode, err } of errors) {
        toast.show({ kind: 'error', title: `${MODE_LABEL[mode]}: маршрут недоступен`, message: err.message })
      }
      if (errors.some((e) => e.mode === activeRef.current)) {
        const ok = TRAVEL_MODES.find((m) => next[m].status === 'ok')
        if (ok) setActiveMode(ok)
      }
      setFitKey(`route:${key}`)
    })
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refit = useCallback(() => setFitKey((k) => (k ? k.replace(/#\d+$/, '') + '#' + Date.now() : k)), [])

  const points = useMemo(() => slots.filter((s) => s.wp).map((s) => s.wp!.coord), [slots])

  return {
    slots,
    points,
    routes,
    activeMode,
    setActiveMode,
    setAlternative,
    time,
    setTime,
    fitKey,
    refit,
    setPoint,
    setPointFromCoord,
    setNextFromCoord,
    addStop,
    removeStop,
    reorder,
    swap,
    clearAll,
    loadPoints,
    loadSaved,
    startFrom,
  }
}

export type Planner = ReturnType<typeof useRoutePlanner>
