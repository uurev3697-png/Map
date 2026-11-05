import { AnimatePresence, motion } from 'framer-motion'
import { usePlaces } from '../hooks/usePlaces'
import { deleteSavedRoute, type SavedRoute } from '../lib/places'
import { IconBike, IconCar, IconTrash, IconWalk } from './icons'

const MODE = {
  foot: { Icon: IconWalk, tint: 'bg-emerald-500/12 text-emerald-500' },
  bike: { Icon: IconBike, tint: 'bg-amber-500/14 text-amber-500' },
  car: { Icon: IconCar, tint: 'bg-indigo-500/12 text-indigo-500' },
}

/** «Мои маршруты» — сохранённые маршруты, открываются одним нажатием. */
export function SavedRoutes({ onOpen }: { onOpen(r: SavedRoute): void }) {
  const { routes } = usePlaces()
  if (!routes.length) return null
  return (
    <div>
      <p className="mb-2 px-1 text-[11px] font-bold tracking-wide text-[var(--subtle)] uppercase">Мои маршруты</p>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {routes.map((r, i) => {
            const m = MODE[r.mode] ?? MODE.car
            const stops = r.points.length - 2
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-center rounded-[18px] border border-[var(--border)] transition hover:bg-[var(--hover)]"
              >
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 p-2.5 text-left"
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${m.tint}`}>
                    <m.Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{r.name}</span>
                    <span className="block truncate text-[11.5px] text-[var(--muted)]">
                      {r.points[0].label} → {r.points[r.points.length - 1].label}
                      {stops > 0 ? ` · ${stops} ${stops === 1 ? 'остановка' : 'остановки'}` : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedRoute(r.id)}
                  className="mr-1.5 grid size-8 shrink-0 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-rose-500/10 hover:text-rose-500"
                  aria-label={`Удалить маршрут «${r.name}»`}
                  title="Удалить"
                >
                  <IconTrash className="size-4" />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}
