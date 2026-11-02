import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { formatDistance } from '../lib/format'
import type { LngLat, Route } from '../services/types'
import { IconChevron, ManeuverIcon } from './icons'

interface Props {
  route: Route
  onStep(coord: LngLat): void
}

export function Directions({ route, onStep }: Props) {
  const [open, setOpen] = useState(false)
  const accent = route.mode === 'car' ? 'text-indigo-500 bg-indigo-500/10' : 'text-emerald-500 bg-emerald-500/10'

  return (
    <div className="rounded-[20px] border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-[20px] px-4 py-3.5 text-left transition hover:bg-[var(--hover)]"
      >
        <span>
          <span className="block text-[14px] font-bold">Пошаговые инструкции</span>
          <span className="block text-[12px] text-[var(--muted)]">
            {route.steps.length} {plural(route.steps.length, 'шаг', 'шага', 'шагов')}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-[var(--muted)]">
          <IconChevron />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <ol className="relative px-2 pb-2">
              {route.steps.map((s, i) => {
                const showName = s.name && !s.instruction.includes(s.name)
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.25 }}
                  >
                    <button
                      type="button"
                      disabled={!s.location}
                      onClick={() => s.location && onStep(s.location)}
                      className="flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-[var(--hover)]"
                    >
                      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${accent}`}>
                        <ManeuverIcon kind={s.kind} className="size-[17px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] leading-snug font-semibold">{s.instruction}</span>
                        {showName && <span className="block truncate text-[12px] text-[var(--muted)]">{s.name}</span>}
                      </span>
                      {s.distance > 0 && (
                        <span className="tabular mt-0.5 shrink-0 text-[12px] font-semibold text-[var(--muted)]">
                          {formatDistance(s.distance)}
                        </span>
                      )}
                    </button>
                  </motion.li>
                )
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
