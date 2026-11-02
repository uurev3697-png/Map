import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getCurrentPosition } from '../hooks/geolocation'
import type { useRoutePlanner, Which } from '../hooks/useRoutePlanner'
import { useSuggestions } from '../hooks/useSuggestions'
import type { LngLat, Place } from '../services/types'
import { Directions } from './Directions'
import { IconCar, IconLocate, IconPin, IconRoute, IconSearch } from './icons'
import { RouteCards } from './RouteCards'
import { Suggestions } from './Suggestions'
import { useToast } from './Toast'
import { WaypointFields, type WaypointFieldsHandle } from './WaypointFields'

type Planner = ReturnType<typeof useRoutePlanner>

interface Props {
  planner: Planner
  near?: LngLat
  onStep(coord: LngLat): void
  onEditingChange?(editing: boolean): void
  /** Мобильная шторка: шапка — зона перетаскивания */
  compactHeader?: boolean
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const },
}

export function RoutePanel({ planner, near, onStep, onEditingChange, compactHeader }: Props) {
  const toast = useToast()
  const { points, routes, activeMode } = planner
  const [texts, setTexts] = useState<Record<Which, string>>({ from: '', to: '' })
  const [editing, setEditing] = useState<Which | null>(null)
  const [highlight, setHighlight] = useState(-1)
  const [locating, setLocating] = useState<Which | null>(null)
  const fieldsRef = useRef<WaypointFieldsHandle>(null)
  // Актуальные подписи точек (обновляются сразу, до перерисовки) — для onBlur
  const labelsRef = useRef<Record<Which, string>>({ from: '', to: '' })
  labelsRef.current = { from: points.from?.label ?? '', to: points.to?.label ?? '' }

  const editingText = editing ? texts[editing] : ''
  const userTyped = editing ? editingText !== (points[editing]?.label ?? '') : false
  const sugg = useSuggestions(editingText, near, !!editing && userTyped)

  // Синхронизируем текст полей с точками, выбранными на карте
  const fromLabel = points.from?.label ?? ''
  const toLabel = points.to?.label ?? ''
  useEffect(() => setTexts((t) => (editing === 'from' ? t : { ...t, from: fromLabel })), [fromLabel, points.from?.coord]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setTexts((t) => (editing === 'to' ? t : { ...t, to: toLabel })), [toLabel, points.to?.coord]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => onEditingChange?.(!!editing), [editing, onEditingChange])
  useEffect(() => setHighlight(sugg.results.length ? 0 : -1), [sugg.results])

  const pick = (which: Which, place: Place) => {
    planner.setPoint(which, { coord: place.coord, label: place.name, sublabel: place.description })
    labelsRef.current[which] = place.name
    setTexts((t) => ({ ...t, [which]: place.name }))
    const other: Which = which === 'from' ? 'to' : 'from'
    if (!points[other]) {
      setEditing(other)
      fieldsRef.current?.focus(other)
    } else {
      setEditing(null)
      fieldsRef.current?.blurAll()
    }
  }

  const locate = async (which: Which) => {
    setLocating(which)
    try {
      const coord = await getCurrentPosition()
      planner.setPointFromCoord(which, coord, 'Моё местоположение')
      labelsRef.current[which] = 'Моё местоположение'
      setTexts((t) => ({ ...t, [which]: 'Моё местоположение' }))
      setEditing(null)
      fieldsRef.current?.blurAll()
    } catch (e) {
      toast.show({ kind: 'error', title: 'Геолокация недоступна', message: (e as Error).message })
    } finally {
      setLocating(null)
    }
  }

  const onKeyDown = (which: Which, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(sugg.results.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      const r = sugg.results[highlight] ?? sugg.results[0]
      if (r && !sugg.loading) pick(which, r)
    } else if (e.key === 'Escape') {
      fieldsRef.current?.blurAll()
    }
  }

  const hasBoth = !!(points.from && points.to)
  const active = routes[activeMode]
  const view = editing ? 'search' : hasBoth ? 'routes' : 'empty'

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
                <p className="text-[12px] leading-tight text-[var(--muted)]">Пешком и на машине</p>
              </div>
            </div>
            <AnimatePresence>
              {(points.from || points.to) && (
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
          points={points}
          editing={editing}
          texts={texts}
          locating={locating}
          onText={(w, t) => setTexts((x) => ({ ...x, [w]: t }))}
          onFocus={(w) => setEditing(w)}
          onBlur={(w) => {
            setEditing((cur) => (cur === w ? null : cur))
            setTexts((x) => ({ ...x, [w]: labelsRef.current[w] }))
          }}
          onKeyDown={onKeyDown}
          onClear={(w) => {
            planner.setPoint(w, null)
            labelsRef.current[w] = ''
            setTexts((x) => ({ ...x, [w]: '' }))
            fieldsRef.current?.focus(w)
          }}
          onLocate={locate}
          onSwap={() => {
            planner.swap()
            setTexts((t) => ({ from: t.to, to: t.from }))
          }}
        />
      </div>

      <div className="scroll-thin mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
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
                onPick={(p) => editing && pick(editing, p)}
                onLocate={() => editing && locate(editing)}
              />
            </motion.div>
          )}
          {view === 'routes' && (
            <motion.div key="routes" {...fade} className="space-y-2.5">
              <RouteCards routes={routes} active={activeMode} onSelect={planner.setActiveMode} />
              <AnimatePresence mode="wait">
                {active.route ? (
                  <motion.div key={activeMode + active.route.distance} {...fade}>
                    <Directions route={active.route} onStep={onStep} />
                    <p className="mt-3 px-1 text-[10.5px] text-[var(--subtle)]">
                      Маршрут: {active.route.provider} · данные © участники OpenStreetMap
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
            <motion.div key="empty" {...fade}>
              <EmptyHint step={points.from || points.to ? 2 : 1} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
      <p className="text-[14px] font-bold">
        {step === 1 ? 'Куда отправимся?' : 'Осталась вторая точка'}
      </p>
      <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
        {step === 1
          ? 'Задайте точки А и Б — мы построим маршрут пешком и на машине.'
          : 'Выберите вторую точку — маршрут построится автоматически.'}
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
        <IconCar className="size-3.5" /> Маркеры можно перетаскивать
      </div>
    </div>
  )
}
