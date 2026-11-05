import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getCurrentPosition } from '../hooks/geolocation'
import { pick, type Planner, type Which } from '../hooks/useRoutePlanner'
import { useSuggestions } from '../hooks/useSuggestions'
import { addToHistory, setParking, type Parking, type QuickKind, type SavedRoute } from '../lib/places'
import { geocoder } from '../services/geocoding'
import { isAbort } from '../services/errors'
import type { LngLat, Place } from '../services/types'
import { getWeather, type Weather } from '../services/weather'
import { Directions } from './Directions'
import { ElevationProfile } from './ElevationProfile'
import { IconCar, IconLocate, IconPin, IconRoute, IconSearch } from './icons'
import { ParkingCard } from './ParkingCard'
import { PlaceSetupDialog } from './PlaceSetupDialog'
import { SavedRoutes } from './SavedRoutes'
import { SaveRouteDialog } from './SaveRouteDialog'
import { QuickPlaces } from './QuickPlaces'
import { RouteActions } from './RouteActions'
import { RouteCards } from './RouteCards'
import { Suggestions } from './Suggestions'
import { TimePicker } from './TimePicker'
import { useToast } from './Toast'
import { WaypointFields, type WaypointFieldsHandle } from './WaypointFields'

interface Props {
  planner: Planner
  near?: LngLat
  onStep(coord: LngLat): void
  onEditingChange?(editing: boolean): void
  /** Мобильная шторка: шапка рисуется снаружи */
  compactHeader?: boolean
  flying: boolean
  canFly: boolean
  onFly(): void
  onNavigate(simulate: boolean): void
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const },
}

/** Погода в точке назначения */
function useWeather(coord?: LngLat) {
  const [w, setW] = useState<{ key: string; w: Weather } | null>(null)
  const key = coord ? `${coord[0].toFixed(2)},${coord[1].toFixed(2)}` : ''
  useEffect(() => {
    if (!coord) return
    const ctl = new AbortController()
    getWeather(coord, ctl.signal)
      .then((weather) => setW({ key, w: weather }))
      .catch((e) => !isAbort(e) && setW(null))
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return w && w.key === key ? w.w : null
}

export function RoutePanel({ planner, near, onStep, onEditingChange, compactHeader, flying, canFly, onFly, onNavigate }: Props) {
  const toast = useToast()
  const { slots, routes, activeMode } = planner
  const [texts, setTexts] = useState<Record<Which, string>>({})
  const [editing, setEditing] = useState<Which | null>(null)
  const [highlight, setHighlight] = useState(-1)
  const [locating, setLocating] = useState<Which | null>(null)
  const fieldsRef = useRef<WaypointFieldsHandle>(null)
  // Окно «Указать адрес Дома/Работы» и откуда его открыли (поле или пустая панель)
  const [setup, setSetup] = useState<{ kind: QuickKind; origin: Which | 'empty' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [parkingBusy, setParkingBusy] = useState(false)
  // Актуальные подписи точек (обновляются сразу, до перерисовки) — для onBlur
  const labelsRef = useRef<Record<Which, string>>({})
  labelsRef.current = Object.fromEntries(slots.map((s) => [s.id, s.wp?.label ?? '']))

  const labelOf = (id: Which | null) => (id ? (slots.find((s) => s.id === id)?.wp?.label ?? '') : '')
  const editingText = editing ? (texts[editing] ?? '') : ''
  const userTyped = editing ? editingText !== labelOf(editing) : false
  const sugg = useSuggestions(editingText, near, !!editing && userTyped)

  // Синхронизируем текст полей с точками, выбранными на карте / из ссылки
  const labelsKey = slots.map((s) => `${s.id}:${s.wp?.label ?? ''}:${s.wp?.coord.join(',') ?? ''}`).join('|')
  useEffect(() => {
    setTexts((t) => {
      const next: Record<Which, string> = {}
      for (const s of slots) next[s.id] = editing === s.id ? (t[s.id] ?? '') : (s.wp?.label ?? '')
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsKey])

  useEffect(() => onEditingChange?.(!!editing), [editing, onEditingChange])
  useEffect(() => setHighlight(sugg.results.length ? 0 : -1), [sugg.results])
  const pendingEnter = useRef<Which | null>(null)
  useEffect(() => {
    const id = pendingEnter.current
    if (!id || sugg.loading) return
    pendingEnter.current = null
    if (id === editing && sugg.results[0]) pickPlace(id, sugg.results[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugg.loading, sugg.results])
  useEffect(() => {
    pendingEnter.current = null
  }, [editing])

  const pickPlace = (id: Which, place: Place) => {
    planner.setPoint(id, { coord: place.coord, label: place.name, sublabel: place.description })
    addToHistory(place)
    labelsRef.current[id] = place.name
    setTexts((t) => ({ ...t, [id]: place.name }))
    const nextEmpty = slots.find((s) => s.id !== id && !s.wp)
    if (nextEmpty) {
      setEditing(nextEmpty.id)
      fieldsRef.current?.focus(nextEmpty.id)
    } else {
      setEditing(null)
      fieldsRef.current?.blurAll()
    }
  }

  const locate = async (id: Which) => {
    setLocating(id)
    try {
      const coord = await getCurrentPosition()
      planner.setPointFromCoord(id, coord, 'Моё местоположение')
      labelsRef.current[id] = 'Моё местоположение'
      setTexts((t) => ({ ...t, [id]: 'Моё местоположение' }))
      setEditing(null)
      fieldsRef.current?.blurAll()
    } catch (e) {
      toast.show({ kind: 'error', title: 'Геолокация недоступна', message: (e as Error).message })
    } finally {
      setLocating(null)
    }
  }

  /** «Домой» / «На работу»: место — в конечную точку, старт — моё местоположение (если не задан) */
  const goTo = async (place: Place) => {
    const last = slots[slots.length - 1]
    const first = slots[0]
    planner.setPoint(last.id, { coord: place.coord, label: place.name, sublabel: place.description })
    labelsRef.current[last.id] = place.name
    setTexts((t) => ({ ...t, [last.id]: place.name }))
    if (!first.wp) {
      try {
        setLocating(first.id)
        const coord = await getCurrentPosition()
        planner.setPointFromCoord(first.id, coord, 'Моё местоположение')
        labelsRef.current[first.id] = 'Моё местоположение'
        setTexts((t) => ({ ...t, [first.id]: 'Моё местоположение' }))
      } catch {
        // Без геолокации — просим указать старт вручную
        setEditing(first.id)
        fieldsRef.current?.focus(first.id)
      } finally {
        setLocating(null)
      }
    }
  }

  /** «Я припарковался здесь» */
  const parkHere = async () => {
    setParkingBusy(true)
    try {
      const coord = await getCurrentPosition()
      const place = await geocoder.reverse(coord).catch(() => null)
      setParking({ coord, at: Date.now(), label: place?.name })
      toast.show({ kind: 'success', title: 'Место парковки сохранено', message: place?.name ?? 'Вернуться к машине можно в «Мои места»' })
    } catch (e) {
      toast.show({ kind: 'error', title: 'Геолокация недоступна', message: (e as Error).message })
    } finally {
      setParkingBusy(false)
    }
  }
  /** Пешком до машины от текущего места */
  const goToCar = (p: Parking) => {
    planner.setActiveMode('foot')
    void goTo({ id: 'parking', name: 'Моя машина', description: p.label ?? 'Место парковки', coord: p.coord })
  }
  const openSaved = (r: SavedRoute) => {
    planner.loadSaved(
      r.points.map((pt) => ({ coord: pt.coord, label: pt.label, sublabel: pt.sublabel })),
      r.mode,
    )
    toast.show({ kind: 'info', title: r.name })
  }

  const onKeyDown = (id: Which, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(sugg.results.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      const r = sugg.results[highlight] ?? sugg.results[0]
      if (r && !sugg.loading) pickPlace(id, r)
      // Подсказки ещё грузятся — выберем первую, как только придут
      else if (sugg.loading) pendingEnter.current = id
    } else if (e.key === 'Escape') {
      fieldsRef.current?.blurAll()
    }
  }

  const hasRoute = slots.filter((s) => s.wp).length >= 2 && !!slots[0].wp && !!slots[slots.length - 1].wp
  const active = routes[activeMode]
  const activeRoute = pick(active)
  const view = editing ? 'search' : hasRoute ? 'routes' : 'empty'
  const filledCount = slots.filter((s) => s.wp).length
  const destCoord = slots[slots.length - 1].wp?.coord
  const weather = useWeather(destCoord)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={'shrink-0 px-4 ' + (compactHeader ? 'pt-1' : 'pt-4')}>
        {!compactHeader && (
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
                <IconRoute className="size-[18px]" />
              </span>
              <div>
                <h1 className="text-[17px] leading-tight font-extrabold tracking-[-0.02em]">Маршрут</h1>
                <p className="text-[12px] leading-tight text-[var(--muted)]">Пешком, на велосипеде и машине</p>
              </div>
            </div>
            <AnimatePresence>
              {filledCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={planner.clearAll}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                >
                  Сбросить
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
        <WaypointFields
          ref={fieldsRef}
          slots={slots}
          editing={editing}
          texts={texts}
          locating={locating}
          weather={weather}
          onText={(id, t) => setTexts((x) => ({ ...x, [id]: t }))}
          onFocus={(id) => setEditing(id)}
          onBlur={(id) => {
            setEditing((cur) => (cur === id ? null : cur))
            setTexts((x) => ({ ...x, [id]: labelsRef.current[id] ?? '' }))
          }}
          onKeyDown={onKeyDown}
          onClear={(id) => {
            const idx = slots.findIndex((s) => s.id === id)
            const isStop = idx > 0 && idx < slots.length - 1
            if (isStop) {
              planner.removeStop(id)
              return
            }
            planner.setPoint(id, null)
            labelsRef.current[id] = ''
            setTexts((x) => ({ ...x, [id]: '' }))
            fieldsRef.current?.focus(id)
          }}
          onLocate={locate}
          onSwap={planner.swap}
          onReorder={planner.reorder}
          onAddStop={() => {
            const id = planner.addStop()
            if (id) setTimeout(() => fieldsRef.current?.focus(id), 60)
          }}
        />
      </div>

      <div className="scroll-thin mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <AnimatePresence mode="wait" initial={false}>
          {view === 'search' && (
            <motion.div key="search" {...fade}>
              <Suggestions
                text={userTyped ? editingText : ''}
                results={sugg.results}
                loading={sugg.loading}
                error={sugg.error}
                highlight={highlight}
                onHover={setHighlight}
                onPick={(p) => editing && pickPlace(editing, p)}
                onLocate={() => editing && locate(editing)}
                onSetupQuick={(kind) => editing && setSetup({ kind, origin: editing })}
              />
            </motion.div>
          )}
          {view === 'routes' && (
            <motion.div key="routes" {...fade} className="space-y-2.5">
              <TimePicker value={planner.time} onChange={planner.setTime} />
              <RouteCards
                routes={routes}
                active={activeMode}
                time={planner.time}
                onSelect={planner.setActiveMode}
                onAlternative={planner.setAlternative}
              />
              <AnimatePresence mode="wait">
                {activeRoute ? (
                  <motion.div key={activeMode + activeRoute.distance} {...fade} className="space-y-2.5">
                    <RouteActions
                      points={planner.points}
                      mode={activeMode}
                      flying={flying}
                      canFly={canFly}
                      onFly={onFly}
                      onNavigate={onNavigate}
                      onSave={() => setSaving(true)}
                    />
                    {activeMode !== 'car' && <ElevationProfile route={activeRoute} />}
                    <Directions route={activeRoute} onStep={onStep} />
                    {activeMode === 'car' && <ElevationProfile route={activeRoute} />}
                    <p className="px-1 text-[10.5px] text-[var(--subtle)]">
                      Маршрут: {activeRoute.provider} · высоты и погода: Open-Meteo · данные © участники OpenStreetMap
                    </p>
                  </motion.div>
                ) : active.status === 'loading' ? (
                  <motion.div key="sk" {...fade} className="space-y-2 rounded-[20px] border border-[var(--border)] p-4">
                    <div className="skeleton h-4 w-40" />
                    <div className="skeleton h-3 w-16" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          )}
          {view === 'empty' && (
            <motion.div key="empty" {...fade} className="space-y-3">
              <div>
                <p className="mb-2 px-1 text-[11px] font-bold tracking-wide text-[var(--subtle)] uppercase">Мои места</p>
                <QuickPlaces size="lg" onUse={goTo} onSetup={(kind) => setSetup({ kind, origin: 'empty' })} />
                <div className="mt-2">
                  <ParkingCard busy={parkingBusy} onPark={parkHere} onGo={goToCar} />
                </div>
              </div>
              <SavedRoutes onOpen={openSaved} />
              <EmptyHint step={filledCount ? 2 : 1} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SaveRouteDialog
        open={saving}
        mode={activeMode}
        points={slots.flatMap((sl) => (sl.wp ? [{ coord: sl.wp.coord, label: sl.wp.label, sublabel: sl.wp.sublabel }] : []))}
        onClose={() => setSaving(false)}
      />
      <PlaceSetupDialog
        kind={setup?.kind ?? null}
        near={near}
        routePoints={slots.flatMap((sl) =>
          sl.wp && !sl.wp.resolving
            ? [{ id: sl.id, name: sl.wp.label, description: sl.wp.sublabel ?? '', coord: sl.wp.coord }]
            : [],
        )}
        onClose={() => setSetup(null)}
        onSaved={(_, place) => {
          const origin = setup?.origin
          if (!origin) return
          if (origin === 'empty') void goTo(place)
          else if (slots.some((sl) => sl.id === origin)) pickPlace(origin, place)
        }}
      />
    </div>
  )
}

function EmptyHint({ step }: { step: 1 | 2 }) {
  const tips = [
    { Icon: IconSearch, title: 'Найдите адрес', text: 'Начните вводить улицу, место или город' },
    { Icon: IconPin, title: 'Нажмите на карту', text: 'Точка поставится там, куда вы нажмёте' },
    { Icon: IconLocate, title: 'Моё местоположение', text: 'Кнопка-прицел в поле ввода' },
  ]
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--border-strong)] p-4">
      <p className="text-[14px] font-bold">{step === 1 ? 'Куда отправимся?' : 'Осталась конечная точка'}</p>
      <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
        {step === 1
          ? 'Задайте точки А и Б — мы построим маршрут пешком, на велосипеде и на машине.'
          : 'Выберите точку Б — маршрут построится автоматически.'}
      </p>
      <ul className="mt-3.5 space-y-2.5">
        {tips.map(({ Icon, title, text }, i) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            className="flex items-center gap-3"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--field)] text-[var(--muted)]">
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold">{title}</span>
              <span className="block text-[12px] text-[var(--muted)]">{text}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2 text-[11.5px] text-[var(--subtle)]">
        <IconCar className="size-3.5" /> Маркеры можно перетаскивать, остановки — менять местами
      </div>
    </div>
  )
}
