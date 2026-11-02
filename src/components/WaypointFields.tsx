import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { forwardRef, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import { MAX_SLOTS, type Slot, type Which } from '../hooks/useRoutePlanner'
import type { Weather } from '../services/weather'
import { usePlaces } from '../hooks/usePlaces'
import { isFavorite, toggleFavorite } from '../lib/places'
import { IconClose, IconGrip, IconLocate, IconPlus, IconStar, IconSwap } from './icons'

export interface FieldHandle {
  focus(): void
  blur(): void
}

/** Буква/номер точки по позиции: А, 1, 2, …, Б */
export function slotLabel(index: number, count: number) {
  if (index === 0) return 'А'
  if (index === count - 1) return 'Б'
  return String(index)
}
export function slotKind(index: number, count: number): 'from' | 'stop' | 'to' {
  return index === 0 ? 'from' : index === count - 1 ? 'to' : 'stop'
}

const BADGE: Record<'from' | 'stop' | 'to', string> = {
  from: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  stop: 'bg-gradient-to-br from-slate-400 to-slate-600',
  to: 'bg-gradient-to-br from-rose-400 to-rose-600',
}

interface FieldProps {
  slot: Slot
  index: number
  count: number
  text: string
  active: boolean
  locating: boolean
  weather?: Weather | null
  onText(text: string): void
  onFocus(): void
  onBlur(): void
  onKeyDown(e: KeyboardEvent<HTMLInputElement>): void
  onClear(): void
  onLocate(): void
}

const Field = forwardRef<FieldHandle, FieldProps>(function Field(p, ref) {
  const inputRef = useRef<HTMLInputElement>(null)
  const controls = useDragControls()
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), blur: () => inputRef.current?.blur() }))
  const kind = slotKind(p.index, p.count)
  const isStop = kind === 'stop'
  const showSub = !p.active && p.slot.wp?.sublabel
  const placeholder = kind === 'from' ? 'Откуда' : kind === 'to' ? 'Куда' : 'Остановка'

  return (
    <Reorder.Item
      value={p.slot.id}
      dragListener={false}
      dragControls={controls}
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="relative list-none"
      whileDrag={{ scale: 1.02, zIndex: 20 }}
    >
      <div
        className={
          'group relative flex items-center gap-2.5 rounded-2xl px-2 transition-colors duration-200 ' +
          (p.active ? 'bg-[var(--field-focus)] shadow-[0_0_0_1.5px_var(--ring)]' : 'hover:bg-[var(--hover)]')
        }
      >
        {/* Ручка перетаскивания + буква точки */}
        <span
          onPointerDown={(e) => p.count > 2 && controls.start(e)}
          className={
            'relative grid size-7 shrink-0 touch-none place-items-center rounded-full text-[12px] font-extrabold text-white shadow-sm ' +
            BADGE[kind] +
            (p.count > 2 ? ' cursor-grab active:cursor-grabbing' : '')
          }
          title={p.count > 2 ? 'Перетащите, чтобы изменить порядок' : undefined}
        >
          {slotLabel(p.index, p.count)}
          {p.count > 2 && (
            <IconGrip className="absolute -left-3 size-3 text-[var(--subtle)] opacity-0 transition group-hover:opacity-100" />
          )}
        </span>
        <div className="min-w-0 flex-1 py-2">
          <input
            ref={inputRef}
            value={p.text}
            onChange={(e) => p.onText(e.target.value)}
            onFocus={(e) => {
              p.onFocus()
              e.target.select()
            }}
            onBlur={p.onBlur}
            onKeyDown={p.onKeyDown}
            placeholder={placeholder}
            aria-label={kind === 'from' ? 'Точка отправления' : kind === 'to' ? 'Точка назначения' : `Остановка ${p.index}`}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full truncate bg-transparent text-[15px] font-semibold tracking-[-0.01em] outline-none placeholder:font-medium placeholder:text-[var(--subtle)]"
          />
          <AnimatePresence initial={false}>
            {showSub && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={'truncate text-[12px] text-[var(--muted)] ' + (p.slot.wp?.resolving ? 'animate-pulse' : '')}
              >
                {p.slot.wp?.sublabel}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <AnimatePresence>
            {p.weather && !p.active && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="tabular mr-0.5 flex items-center gap-0.5 rounded-full bg-[var(--field)] px-2 py-1 text-[12px] font-bold"
                title={`Погода сейчас: ${p.weather.text}, ${p.weather.temp}°`}
              >
                <span className="text-[13px] leading-none">{p.weather.icon}</span>
                {p.weather.temp > 0 ? '+' : ''}
                {p.weather.temp}°
              </motion.span>
            )}
          </AnimatePresence>
          {(p.text || p.slot.wp || isStop) && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={p.onClear}
              className="grid size-8 place-items-center rounded-full text-[var(--subtle)] opacity-70 transition hover:bg-[var(--hover)] hover:text-[var(--fg)] hover:opacity-100"
              aria-label={isStop ? 'Удалить остановку' : 'Очистить'}
              title={isStop ? 'Удалить остановку' : 'Очистить'}
            >
              <IconClose className="size-4" />
            </button>
          )}
          {p.slot.wp && !p.active && !p.slot.wp.resolving ? (
            <FavButton wp={p.slot.wp} />
          ) : (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={p.onLocate}
            disabled={p.locating}
            className="grid size-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-indigo-500 disabled:opacity-60"
            aria-label="Моё местоположение"
            title="Моё местоположение"
          >
            <IconLocate className={'size-[18px] ' + (p.locating ? 'animate-spin text-indigo-500' : '')} />
          </button>
          )}
        </div>
      </div>
    </Reorder.Item>
  )
})

/** Звёздочка «в избранное» у заполненной точки */
function FavButton({ wp }: { wp: NonNullable<Slot['wp']> }) {
  usePlaces() // перерисовка при изменении избранного
  const place = { id: `fav:${wp.coord.join(',')}`, name: wp.label, description: wp.sublabel ?? '', coord: wp.coord }
  const fav = isFavorite(place)
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => toggleFavorite(place)}
      className={
        'grid size-8 place-items-center rounded-full transition hover:bg-[var(--hover)] ' +
        (fav ? 'text-amber-500' : 'text-[var(--subtle)] hover:text-amber-500')
      }
      aria-label={fav ? 'Убрать из избранного' : 'Добавить в избранное'}
      title={fav ? 'Убрать из избранного' : 'Добавить в избранное'}
    >
      <IconStar filled={fav} className="size-[17px]" />
    </motion.button>
  )
}

export interface WaypointFieldsHandle {
  focus(id: Which): void
  blurAll(): void
}

interface Props {
  slots: Slot[]
  editing: Which | null
  texts: Record<Which, string>
  locating: Which | null
  weather?: Weather | null
  onText(id: Which, text: string): void
  onFocus(id: Which): void
  onBlur(id: Which): void
  onKeyDown(id: Which, e: KeyboardEvent<HTMLInputElement>): void
  onClear(id: Which): void
  onLocate(id: Which): void
  onSwap(): void
  onReorder(ids: Which[]): void
  onAddStop(): void
}

export const WaypointFields = forwardRef<WaypointFieldsHandle, Props>(function WaypointFields(p, ref) {
  const refs = useRef(new Map<Which, FieldHandle | null>())
  useImperativeHandle(ref, () => ({
    focus: (id) => refs.current.get(id)?.focus(),
    blurAll: () => refs.current.forEach((r) => r?.blur()),
  }))
  const [spin, setSpin] = useState(0)
  const canSwap = p.slots.some((s) => s.wp)
  const ids = p.slots.map((s) => s.id)

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 rounded-[22px] border border-[var(--border)] bg-[var(--field)] p-1">
          {/* пунктир, соединяющий точки */}
          <div className="pointer-events-none absolute top-8 bottom-8 left-[22px] border-l-2 border-dotted border-[var(--border-strong)]" />
          <Reorder.Group axis="y" values={ids} onReorder={p.onReorder} className="relative m-0 space-y-0.5 p-0">
            <AnimatePresence initial={false}>
              {p.slots.map((slot, i) => (
                <Field
                  key={slot.id}
                  ref={(r) => {
                    refs.current.set(slot.id, r)
                  }}
                  slot={slot}
                  index={i}
                  count={p.slots.length}
                  text={p.texts[slot.id] ?? ''}
                  active={p.editing === slot.id}
                  locating={p.locating === slot.id}
                  weather={i === p.slots.length - 1 ? p.weather : null}
                  onText={(t) => p.onText(slot.id, t)}
                  onFocus={() => p.onFocus(slot.id)}
                  onBlur={() => p.onBlur(slot.id)}
                  onKeyDown={(e) => p.onKeyDown(slot.id, e)}
                  onClear={() => p.onClear(slot.id)}
                  onLocate={() => p.onLocate(slot.id)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
        <motion.button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setSpin((s) => s + 180)
            p.onSwap()
          }}
          disabled={!canSwap}
          animate={{ rotate: spin }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileTap={{ scale: 0.9 }}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--field)] text-[var(--fg)] transition-colors hover:bg-[var(--hover)] hover:text-indigo-500 disabled:opacity-40"
          aria-label="Поменять точки местами"
          title="Поменять местами"
        >
          <IconSwap className="size-4" />
        </motion.button>
      </div>
      {p.slots.length < MAX_SLOTS && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={p.onAddStop}
          className="mt-1.5 ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-indigo-500"
        >
          <IconPlus className="size-3.5" /> Добавить остановку
        </button>
      )}
    </div>
  )
})
