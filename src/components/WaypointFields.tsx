import { AnimatePresence, motion } from 'framer-motion'
import { forwardRef, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import type { Waypoint, Which } from '../hooks/useRoutePlanner'
import { IconClose, IconLocate, IconSwap } from './icons'

export interface FieldHandle {
  focus(): void
  blur(): void
}

interface FieldProps {
  which: Which
  value: Waypoint | null
  text: string
  active: boolean
  locating: boolean
  onText(text: string): void
  onFocus(): void
  onBlur(): void
  onKeyDown(e: KeyboardEvent<HTMLInputElement>): void
  onClear(): void
  onLocate(): void
}

const Field = forwardRef<FieldHandle, FieldProps>(function Field(p, ref) {
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), blur: () => inputRef.current?.blur() }))
  const isFrom = p.which === 'from'
  const showSub = !p.active && p.value?.sublabel

  return (
    <div
      className={
        'group relative flex items-center gap-3 rounded-2xl px-3 transition-colors duration-200 ' +
        (p.active ? 'bg-[var(--field-focus)] shadow-[0_0_0_1.5px_var(--ring)]' : 'hover:bg-[var(--hover)]')
      }
    >
      <span
        className={
          'grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white shadow-sm ' +
          (isFrom ? 'bg-gradient-to-br from-indigo-400 to-indigo-600' : 'bg-gradient-to-br from-rose-400 to-rose-600')
        }
      >
        {isFrom ? 'А' : 'Б'}
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
          placeholder={isFrom ? 'Откуда' : 'Куда'}
          aria-label={isFrom ? 'Точка отправления' : 'Точка назначения'}
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
              className={'truncate text-[12px] text-[var(--muted)] ' + (p.value?.resolving ? 'animate-pulse' : '')}
            >
              {p.value?.sublabel}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {(p.text || p.value) && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={p.onClear}
            className="grid size-8 place-items-center rounded-full text-[var(--subtle)] opacity-70 transition hover:bg-[var(--hover)] hover:text-[var(--fg)] hover:opacity-100"
            aria-label="Очистить"
            title="Очистить"
          >
            <IconClose className="size-4" />
          </button>
        )}
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
      </div>
    </div>
  )
})

export interface WaypointFieldsHandle {
  focus(which: Which): void
  blurAll(): void
}

interface Props {
  points: Record<Which, Waypoint | null>
  editing: Which | null
  texts: Record<Which, string>
  locating: Which | null
  onText(which: Which, text: string): void
  onFocus(which: Which): void
  onBlur(which: Which): void
  onKeyDown(which: Which, e: KeyboardEvent<HTMLInputElement>): void
  onClear(which: Which): void
  onLocate(which: Which): void
  onSwap(): void
}

export const WaypointFields = forwardRef<WaypointFieldsHandle, Props>(function WaypointFields(p, ref) {
  const refs = { from: useRef<FieldHandle>(null), to: useRef<FieldHandle>(null) }
  useImperativeHandle(ref, () => ({
    focus: (w) => refs[w].current?.focus(),
    blurAll: () => {
      refs.from.current?.blur()
      refs.to.current?.blur()
    },
  }))
  const [spin, setSpin] = useState(0)
  const canSwap = !!(p.points.from || p.points.to)

  return (
    <div className="flex items-center gap-2">
    <div className="relative min-w-0 flex-1 rounded-[22px] border border-[var(--border)] bg-[var(--field)] p-1">
      {(['from', 'to'] as const).map((w, i) => (
        <div key={w}>
          {i === 1 && (
            <div className="relative mx-3 my-0.5 flex items-center">
              {/* пунктир между точками */}
              <div className="ml-[13px] h-3 border-l-2 border-dotted border-[var(--border-strong)]" />
              <div className="ml-6 h-px flex-1 bg-[var(--border)]" />
            </div>
          )}
          <Field
            ref={refs[w]}
            which={w}
            value={p.points[w]}
            text={p.texts[w]}
            active={p.editing === w}
            locating={p.locating === w}
            onText={(t) => p.onText(w, t)}
            onFocus={() => p.onFocus(w)}
            onBlur={() => p.onBlur(w)}
            onKeyDown={(e) => p.onKeyDown(w, e)}
            onClear={() => p.onClear(w)}
            onLocate={() => p.onLocate(w)}
          />
        </div>
      ))}
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
  )
})
