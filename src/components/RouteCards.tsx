import { motion } from 'framer-motion'
import type { RouteState } from '../hooks/useRoutePlanner'
import { formatArrival, formatDistance, formatDuration } from '../lib/format'
import type { TravelMode } from '../services/types'
import { IconCar, IconWalk } from './icons'
import { Skeleton } from './Skeleton'

const META: Record<TravelMode, { label: string; Icon: typeof IconCar; tint: string; grad: string }> = {
  foot: {
    label: 'Пешком',
    Icon: IconWalk,
    tint: 'text-emerald-500 bg-emerald-500/12',
    grad: 'from-emerald-500/14 to-cyan-500/10 ring-emerald-500/40',
  },
  car: {
    label: 'На машине',
    Icon: IconCar,
    tint: 'text-indigo-500 bg-indigo-500/12',
    grad: 'from-indigo-500/14 to-violet-500/10 ring-indigo-500/40',
  },
}

interface Props {
  routes: Record<TravelMode, RouteState>
  active: TravelMode
  onSelect(m: TravelMode): void
}

export function RouteCards({ routes, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Способ передвижения">
      {(['foot', 'car'] as const).map((m) => {
        const s = routes[m]
        const meta = META[m]
        const isActive = active === m
        const disabled = s.status === 'error'
        return (
          <motion.button
            key={m}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => !disabled && onSelect(m)}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={
              'relative overflow-hidden rounded-[20px] border p-3 text-left transition-colors ' +
              (isActive ? 'border-transparent' : 'border-[var(--border)] hover:bg-[var(--hover)]') +
              (disabled ? ' cursor-not-allowed opacity-60' : '')
            }
          >
            {isActive && (
              <motion.div
                layoutId="route-card-active"
                className={`absolute inset-0 rounded-[20px] bg-gradient-to-br ring-[1.5px] ring-inset ${meta.grad}`}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className={`grid size-8 place-items-center rounded-xl ${meta.tint}`}>
                  <meta.Icon className="size-[18px]" />
                </span>
                <span className="text-[13px] font-semibold text-[var(--muted)]">{meta.label}</span>
              </div>
              <div className="mt-2.5 min-h-[44px]">
                {s.status === 'loading' && !s.route ? (
                  <>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </>
                ) : s.status === 'error' ? (
                  <>
                    <p className="text-[17px] font-bold tracking-tight">Недоступно</p>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-tight text-[var(--muted)]">{s.error}</p>
                  </>
                ) : s.route ? (
                  <div className={s.status === 'loading' ? 'animate-pulse opacity-60' : ''}>
                    <motion.p
                      key={s.route.duration}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="tabular text-[21px] leading-tight font-extrabold tracking-[-0.03em]"
                    >
                      {formatDuration(s.route.duration)}
                    </motion.p>
                    <p className="tabular mt-0.5 text-[12.5px] font-medium text-[var(--muted)]">
                      {formatDistance(s.route.distance)} · до {formatArrival(s.route.duration)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
