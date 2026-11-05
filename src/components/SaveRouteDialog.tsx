import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { saveRoute, type SavedPoint } from '../lib/places'
import type { TravelMode } from '../services/types'
import { IconBookmark, IconClose } from './icons'
import { useToast } from './Toast'

interface Props {
  open: boolean
  points: SavedPoint[]
  mode: TravelMode
  onClose(): void
}

/** Окно «Сохранить маршрут» с названием (по умолчанию «Откуда → Куда»). */
export function SaveRouteDialog(p: Props) {
  return createPortal(<AnimatePresence>{p.open && <Dialog key="save" {...p} />}</AnimatePresence>, document.body)
}

function Dialog({ points, mode, onClose }: Props) {
  const toast = useToast()
  const short = (s: string) => (s.length > 22 ? s.slice(0, 21) + '…' : s)
  const [name, setName] = useState(`${short(points[0]?.label ?? 'Старт')} → ${short(points[points.length - 1]?.label ?? 'Финиш')}`)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const t = setTimeout(() => ref.current?.select(), 150)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const save = () => {
    const n = name.trim() || 'Мой маршрут'
    saveRoute({ name: n, points, mode })
    toast.show({ kind: 'success', title: 'Маршрут сохранён', message: `«${n}» — в списке «Мои маршруты»` })
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 backdrop-blur-[2px] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.form
        role="dialog"
        aria-modal
        aria-label="Сохранить маршрут"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="glass w-full max-w-md rounded-t-[28px] p-4 sm:rounded-[28px]"
        style={{ background: 'var(--panel-solid)' }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-indigo-500/14 text-indigo-500">
            <IconBookmark className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">Сохранить маршрут</h2>
            <p className="truncate text-[12.5px] text-[var(--muted)]">
              {points.length} {points.length > 4 ? 'точек' : 'точки'} · откроется в «Мои маршруты» одним нажатием
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)]"
            aria-label="Закрыть"
          >
            <IconClose className="size-4" />
          </button>
        </div>
        <input
          ref={ref}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Название маршрута"
          placeholder="Например: Утром на работу"
          maxLength={60}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-[var(--subtle)] focus:border-indigo-400 focus:shadow-[0_0_0_3px_var(--ring)]"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Утром на работу', 'Домой', 'К родителям', 'Прогулка'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="rounded-full bg-[var(--field)] px-2.5 py-1 text-[12px] font-semibold text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="submit"
          className="mt-4 w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 py-3 text-[15px] font-bold text-white shadow-lg shadow-indigo-500/25 transition active:scale-[0.98]"
        >
          Сохранить
        </button>
      </motion.form>
    </motion.div>
  )
}
