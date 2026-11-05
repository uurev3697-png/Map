import { useEffect, useMemo, useRef, useState } from 'react'
import { bearing, projectOnLine } from '../lib/geo'
import { cumulative, haversine, pointAt } from '../services/elevation'
import type { LngLat, Route, RouteStep, TravelMode } from '../services/types'

export interface NavState {
  /** позиция для отображения (привязана к линии, если мы на маршруте) */
  pos: LngLat
  /** направление движения, градусы от севера */
  heading: number
  along: number
  total: number
  /** доля пройденного пути 0..1 */
  progress: number
  remaining: number
  remainingTime: number
  stepIndex: number
  step?: RouteStep
  nextStep?: RouteStep
  distToStep: number
  offRoute: boolean
  arrived: boolean
}

/** Порог схода с маршрута, м */
const OFF_ROUTE: Record<TravelMode, number> = { foot: 35, bike: 45, car: 60 }
/** Скорость демо-поездки, м/с (ускорено, чтобы было интересно смотреть) */
const SIM_SPEED: Record<TravelMode, number> = { foot: 12, bike: 22, car: 45 }

interface Options {
  route: Route | undefined
  /** сырая позиция GPS */
  gps: LngLat | null
  active: boolean
  simulate: boolean
  /** Сошли с маршрута — перестроить от текущей точки */
  onReroute(from: LngLat, along: number): void
}

/**
 * Навигация по маршруту: где мы на линии, какой следующий манёвр,
 * сколько осталось; сход с маршрута; демо-поездка без GPS.
 */
export function useNavigation({ route, gps, active, simulate, onReroute }: Options): NavState | null {
  const geo = useMemo(() => {
    if (!route) return null
    const line = route.geometry
    const cum = cumulative(line)
    // Положение каждого манёвра вдоль линии (монотонно)
    let prev = 0
    const stepAlong = route.steps.map((s) => {
      if (!s.location) return prev
      const pr = projectOnLine(line, cum, s.location, Math.max(0, prev - 1))
      prev = pr.along
      return pr.along
    })
    return { line, cum, total: cum[cum.length - 1], stepAlong }
  }, [route])

  // Демо-поездка: «виртуальная» позиция едет вдоль линии
  const [simAlong, setSimAlong] = useState(0)
  useEffect(() => {
    setSimAlong(0)
  }, [route, simulate, active])
  useEffect(() => {
    if (!active || !simulate || !geo || !route) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      // Любая демо-поездка укладывается примерно в 45 секунд
      const speed = Math.max(SIM_SPEED[route.mode], geo.total / 45)
      setSimAlong((a) => Math.min(geo.total, a + speed * dt))
    }, 250)
    return () => clearInterval(id)
  }, [active, simulate, geo, route])

  const lastAlong = useRef(0)
  const offCount = useRef(0)
  const lastReroute = useRef(0)
  const onRerouteRef = useRef(onReroute)
  onRerouteRef.current = onReroute
  useEffect(() => {
    lastAlong.current = 0
    offCount.current = 0
  }, [route])

  const raw: LngLat | null = !active || !geo ? null : simulate ? pointAt(geo.line, geo.cum, simAlong) : gps
  const state = useMemo<NavState | null>(() => {
    if (!raw || !geo || !route) return null
    const { line, cum, total, stepAlong } = geo
    // Ищем в окне вокруг прошлой позиции, чтобы не «перепрыгнуть» на соседний участок петли
    const first = lastAlong.current === 0
    const pr = first
      ? projectOnLine(line, cum, raw)
      : projectOnLine(line, cum, raw, lastAlong.current - 150, lastAlong.current + 800)
    const offRoute = !simulate && pr.offset > OFF_ROUTE[route.mode]
    // GPS дрожит — не даём позиции сильно откатываться назад
    const along = offRoute ? lastAlong.current : Math.max(pr.along, lastAlong.current - 15)
    const pos = offRoute ? raw : pointAt(line, cum, along)
    const ahead = pointAt(line, cum, Math.min(total, along + 25))
    const heading = haversine(pos, ahead) > 1 ? bearing(pos, ahead) : bearing(line[Math.max(0, line.length - 2)], line[line.length - 1])
    let stepIndex = stepAlong.findIndex((a, i) => i > 0 && a > along + 3)
    if (stepIndex < 0) stepIndex = route.steps.length - 1
    const remaining = Math.max(0, total - along)
    const destination = line[line.length - 1]
    return {
      pos,
      heading,
      along,
      total,
      progress: total ? along / total : 0,
      remaining,
      remainingTime: total ? (route.duration * remaining) / total : 0,
      stepIndex,
      step: route.steps[stepIndex],
      nextStep: route.steps[stepIndex + 1],
      distToStep: Math.max(0, stepAlong[stepIndex] - along),
      offRoute,
      arrived: remaining < 20 || (!offRoute && haversine(raw, destination) < 20),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.[0], raw?.[1], geo, route, simulate])

  // Побочные эффекты: запоминаем прогресс и проверяем сход с маршрута
  useEffect(() => {
    if (!state) return
    if (!state.offRoute) {
      lastAlong.current = state.along
      offCount.current = 0
      return
    }
    offCount.current++
    const now = Date.now()
    if (offCount.current >= 2 && now - lastReroute.current > 10_000 && raw) {
      lastReroute.current = now
      offCount.current = 0
      onRerouteRef.current(raw, lastAlong.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return state
}

// ===== Голосовые подсказки =====

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function spokenDistance(m: number, mode: TravelMode): string {
  if (m >= 1000) {
    const km = Math.round(m / 100) / 10
    const s = String(km).replace('.', ',')
    return Number.isInteger(km) ? `${km} ${plural(km, 'километр', 'километра', 'километров')}` : `${s} километра`
  }
  const step = mode === 'car' ? 50 : 10
  const r = Math.max(step, Math.round(m / step) * step)
  return `${r} ${plural(r, 'метр', 'метра', 'метров')}`
}

function phrase(step: RouteStep): string {
  if (step.kind === 'arrive') return 'пункт назначения'
  if (step.kind === 'waypoint') return 'промежуточная точка'
  return step.instruction.charAt(0).toLowerCase() + step.instruction.slice(1)
}

/** Пороги объявлений (м): заранее, ближе, «сейчас» */
const THRESHOLDS: Record<TravelMode, [number, number, number]> = {
  foot: [150, 40, 12],
  bike: [300, 90, 25],
  car: [800, 300, 70],
}

let ruVoice: SpeechSynthesisVoice | null | undefined
function speak(text: string) {
  const synth = window.speechSynthesis
  if (!synth) return
  if (ruVoice === undefined) ruVoice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('ru')) ?? null
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ru-RU'
  if (ruVoice) u.voice = ruVoice
  u.rate = 1.02
  synth.cancel()
  synth.speak(u)
}

/** Голосовые подсказки по-русски (Web Speech API) */
export function useVoiceGuidance(nav: NavState | null, mode: TravelMode, enabled: boolean, active: boolean) {
  const said = useRef(new Set<string>())
  const started = useRef(false)

  useEffect(() => {
    if (!active) {
      said.current.clear()
      started.current = false
      window.speechSynthesis?.cancel()
    }
  }, [active])

  useEffect(() => {
    if (!active || !enabled || !nav) return
    if (!started.current) {
      started.current = true
      speak(nav.step ? `Поехали! Через ${spokenDistance(nav.distToStep, mode)} ${phrase(nav.step)}` : 'Поехали!')
      said.current.add(`${nav.stepIndex}:0`)
      return
    }
    if (nav.arrived) {
      if (!said.current.has('arrived')) {
        said.current.add('arrived')
        speak('Вы прибыли')
      }
      return
    }
    if (!nav.step) return
    const [far, near, now] = THRESHOLDS[mode]
    const d = nav.distToStep
    const key = (k: number) => `${nav.stepIndex}:${k}`
    if (d <= now && !said.current.has(key(2))) {
      said.current.add(key(2)).add(key(1)).add(key(0))
      speak(`Сейчас ${phrase(nav.step)}`)
    } else if (d <= near && d > now && !said.current.has(key(1))) {
      said.current.add(key(1)).add(key(0))
      speak(`Через ${spokenDistance(d, mode)} ${phrase(nav.step)}`)
    } else if (d <= far && d > near && !said.current.has(key(0))) {
      said.current.add(key(0))
      speak(`Через ${spokenDistance(d, mode)} ${phrase(nav.step)}`)
    }
  }, [nav, mode, enabled, active])
}

export const announce = speak

/** Экран не гаснет, пока идёт навигация (Screen Wake Lock API) */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release()
          else lock = l
        })
        .catch(() => {})
    acquire()
    const onVis = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [active])
}
