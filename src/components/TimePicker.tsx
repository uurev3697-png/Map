import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { TimeMode } from '../hooks/useRoutePlanner'
import { nowHHMM } from '../lib/format'
import { IconChevron, IconClock } from './icons'

/** «Отправление: сейчас / выехать в … / прибыть к …» */
export function TimePicker({ value, onChange }: { value: TimeMode; onChange(t: TimeMode): void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const label =
    value.kind === 'now' ? 'Отправление сейчас' : value.kind === 'depart' ? `Отправление в ${value.time}` : `Прибытие к ${value.time}`
  const time = value.kind === 'now' ? nowHHMM(30) : value.time

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
      >
        <IconClock className="size-3.5" />
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <IconChevron className="size-3.5" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{ transformOrigin: 'top left' }}
            className="glass absolute top-full left-0 z-30 mt-1 w-64 rounded-2xl p-1.5"
          >
            {(
              [
                ['now', 'Сейчас'],
                ['depart', 'Отправиться в'],
                ['arrive', 'Прибыть к'],
              ] as const
            ).map(([kind, text]) => (
              <div
                key={kind}
                className={
                  'flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 ' +
                  (value.kind === kind ? 'bg-[var(--hover)]' : 'hover:bg-[var(--hover)]')
                }
              >
                <button
                  type="button"
                  className="flex-1 text-left text-[13.5px] font-semibold"
                  onClick={() => {
                    onChange(kind === 'now' ? { kind } : { kind, time })
                    if (kind === 'now') setOpen(false)
                  }}
                >
                  {text}
                </button>
                {kind !== 'now' && (
                  <input
                    type="time"
                    value={value.kind === kind ? value.time : time}
                    onChange={(e) => e.target.value && onChange({ kind, time: e.target.value })}
                    onFocus={() => value.kind !== kind && onChange({ kind, time })}
                    className="tabular rounded-lg border border-[var(--border)] bg-[var(--field)] px-2 py-1 text-[13px] font-semibold outline-none focus:border-indigo-400"
                    aria-label={text}
                  />
                )}
              </div>
            ))}
            <p className="px-2.5 pt-1 pb-1 text-[11px] leading-snug text-[var(--subtle)]">
              Время в пути считается без учёта пробок.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
