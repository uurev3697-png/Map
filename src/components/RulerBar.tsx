import { motion } from 'framer-motion'
import { formatDistance } from '../lib/format'
import { rulerDistances } from '../map/ruler'
import type { LngLat } from '../services/types'
import { IconClose, IconRuler, IconTrash, IconUndo } from './icons'

interface Props {
  points: LngLat[]
  onUndo(): void
  onClear(): void
  onClose(): void
}

/** Плашка линейки: общее расстояние и управление точками. */
export function RulerBar({ points, onUndo, onClear, onClose }: Props) {
  const d = rulerDistances(points)
  const total = d[d.length - 1] ?? 0
  const btn =
    'grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:opacity-35'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="glass flex items-center gap-2 rounded-[20px] py-1.5 pr-1.5 pl-3"
      role="status"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500">
        <IconRuler className="size-[17px]" />
      </span>
      <div className="min-w-0 pr-1">
        {points.length < 2 ? (
          <>
            <p className="text-[13.5px] font-bold">Линейка</p>
            <p className="text-[11.5px] text-[var(--muted)]">
              {points.length ? 'Поставьте следующую точку' : 'Нажимайте на карту, чтобы ставить точки'}
            </p>
          </>
        ) : (
          <>
            <motion.p key={Math.round(total)} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="tabular text-[17px] leading-tight font-extrabold tracking-tight">
              {formatDistance(total)}
            </motion.p>
            <p className="truncate text-[11.5px] text-[var(--muted)]">
              {points.length - 1} {points.length - 1 === 1 ? 'отрезок' : points.length - 1 < 5 ? 'отрезка' : 'отрезков'} · точки можно двигать
            </p>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center">
        <button type="button" onClick={onUndo} disabled={!points.length} className={btn} aria-label="Убрать последнюю точку" title="Убрать последнюю точку">
          <IconUndo className="size-4" />
        </button>
        <button type="button" onClick={onClear} disabled={!points.length} className={btn} aria-label="Очистить" title="Очистить">
          <IconTrash className="size-4" />
        </button>
        <button type="button" onClick={onClose} className={btn} aria-label="Закрыть линейку" title="Закрыть линейку">
          <IconClose className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}
