import { AnimatePresence, motion } from 'framer-motion'
import { pick, type RouteState, type TimeMode } from '../hooks/useRoutePlanner'
import { formatDistance, formatDuration, timeHint } from '../lib/format'
import { TRAVEL_MODES, type TravelMode } from '../services/types'
import { IconBike, IconCar, IconWalk } from './icons'
import { Skeleton } from './Skeleton'

const META: Record<TravelMode, { label: string; Icon: typeof IconCar; tint: string; grad: string; chip: string }> = {
  foot: {
    label: 'Пешком',
    Icon: IconWalk,
    tint: 'text-emerald-500 bg-emerald-500/12',
    grad: 'from-emerald-500/14 to-cyan-500/10 ring-emerald-500/40',
    chip: 'bg-emerald-500 text-white',
  },
  bike: {
    label: 'Велосипед',
    Icon: IconBike,
    tint: 'text-amber-500 bg-amber-500/14',
    grad: 'from-amber-500/16 to-orange-500/10 ring-amber-500/45',
    chip: 'bg-amber-500 text-white',
  },
  car: {
    label: 'Машина',
    Icon: IconCar,
    tint: 'text-indigo-500 bg-indigo-500/12',
    grad: 'from-indigo-500/14 to-violet-500/10 ring-indigo-500/40',
    chip: 'bg-indigo-500 text-white',
  },
}

interface Props {
  routes: Record<TravelMode, RouteState>
  active: TravelMode
  time: TimeMode
  onSelect(m: TravelMode): void
  onAlternative(m: TravelMode, idx: number): void
}

export function RouteCards({ routes, active, time, onSelect, onAlternative }: Props) {
  const activeState = routes[active]
  const variants = activeState.routes ?? []
  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Способ передвижения">
        {TRAVEL_MODES.map((m) => {
          const s = routes[m]
          const r = pick(s)
          const meta = META[m]
          const isActive = active === m
          const disabled = s.status === 'error'
          return (
            <motion.button
              key={m}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={meta.label}
              onClick={() => !disabled && onSelect(m)}
              whileTap={disabled ? undefined : { scale: 0.97 }}
              className={
                'relative min-w-0 overflow-hidden rounded-[18px] border p-2.5 text-left transition-colors ' +
                (isActive ? 'border-transparent' : 'border-[var(--border)] hover:bg-[var(--hover)]') +
                (disabled ? ' cursor-not-allowed opacity-60' : '')
              }
            >
              {isActive && (
                <motion.div
                  layoutId="route-card-active"
                  className={`absolute inset-0 rounded-[18px] bg-gradient-to-br ring-[1.5px] ring-inset ${meta.grad}`}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <div className="relative">
                <div className="flex items-center gap-1">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                    <meta.Icon className="size-[15px]" />
                  </span>
                  <span className="truncate text-[11.5px] font-semibold tracking-[-0.01em] text-[var(--muted)]">{meta.label}</span>
                </div>
                <div className="mt-2 min-h-[40px]">
                  {s.status === 'loading' && !r ? (
                    <>
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="mt-1.5 h-3 w-14" />
                    </>
                  ) : s.status === 'error' ? (
                    <>
                      <p className="text-[14px] font-bold tracking-tight">Недоступно</p>
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-tight text-[var(--muted)]">{s.error}</p>
                    </>
                  ) : r ? (
                    <div className={s.status === 'loading' ? 'animate-pulse opacity-60' : ''}>
                      <motion.p
                        key={r.duration}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="tabular text-[17px] leading-tight font-extrabold tracking-[-0.03em] whitespace-nowrap"
                      >
                        {formatDuration(r.duration)}
                      </motion.p>
                      <p className="tabular mt-0.5 truncate text-[11.5px] font-medium text-[var(--muted)]">
                        {formatDistance(r.distance)}
                      </p>
                      <p className="tabular truncate text-[11px] text-[var(--subtle)]">{timeHint(r.duration, time, m)}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Альтернативные варианты активного способа */}
      <AnimatePresence initial={false}>
        {variants.length > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
              <span className="mr-0.5 text-[12px] font-semibold text-[var(--muted)]">Варианты:</span>
              {variants.map((v, i) => {
                const diff = Math.round((v.duration - variants[0].duration) / 60)
                const sel = activeState.selected === i
                return (
                  <motion.button
                    key={i}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAlternative(active, i)}
                    className={
                      'tabular rounded-full px-2.5 py-1 text-[12px] font-bold transition ' +
                      (sel ? META[active].chip + ' shadow-sm' : 'bg-[var(--field)] hover:bg-[var(--hover)]')
                    }
                  >
                    {formatDuration(v.duration)}
                    {i > 0 && diff !== 0 && (
                      <span className={'ml-1 font-semibold ' + (sel ? 'opacity-80' : 'text-[var(--muted)]')}>
                        {diff > 0 ? `+${diff}` : diff} мин
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
