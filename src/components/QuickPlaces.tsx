import { motion } from 'framer-motion'
import { usePlaces } from '../hooks/usePlaces'
import { QUICK_LABEL, type QuickKind } from '../lib/places'
import type { Place } from '../services/types'
import { IconBriefcase, IconHome, IconPencil, IconStar } from './icons'

const ICON = { home: IconHome, work: IconBriefcase }
const TINT = { home: 'bg-sky-500/14 text-sky-500', work: 'bg-violet-500/14 text-violet-500' }

interface Props {
  onUse(place: Place, kind?: QuickKind): void
  onSetup(kind: QuickKind): void
  /** Показывать избранные места рядом с Домом и Работой */
  withFavorites?: boolean
  /** Крупные карточки (пустое состояние) или компактные чипы (подсказки) */
  size?: 'lg' | 'sm'
}

/** Быстрые места: Дом, Работа и избранное. */
export function QuickPlaces({ onUse, onSetup, withFavorites, size = 'sm' }: Props) {
  const { home, work, favorites } = usePlaces()
  const quick: [QuickKind, Place | null][] = [
    ['home', home],
    ['work', work],
  ]

  if (size === 'lg') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {quick.map(([kind, place], i) => {
          const Icon = ICON[kind]
          return (
            <motion.div
              key={kind}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative"
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (place ? onUse(place, kind) : onSetup(kind))}
                className="flex w-full items-center gap-2.5 rounded-[18px] border border-[var(--border)] p-2.5 text-left transition hover:bg-[var(--hover)] active:scale-[0.98]"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${TINT[kind]}`}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold">{QUICK_LABEL[kind]}</span>
                  <span className={'block truncate text-[11.5px] ' + (place ? 'text-[var(--muted)]' : 'font-semibold text-indigo-500')}>
                    {place ? place.name : '+ Добавить адрес'}
                  </span>
                </span>
              </button>
              {place && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSetup(kind)}
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full text-[var(--subtle)] opacity-60 transition hover:bg-[var(--hover)] hover:text-[var(--fg)] hover:opacity-100"
                  aria-label={`Изменить адрес: ${QUICK_LABEL[kind]}`}
                  title="Изменить адрес"
                >
                  <IconPencil className="size-3.5" />
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {quick.map(([kind, place]) => {
        const Icon = ICON[kind]
        return (
          <span key={kind} className="flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--field)]">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (place ? onUse(place, kind) : onSetup(kind))}
              className="flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-2 text-[12.5px] font-bold transition hover:bg-[var(--hover)]"
              title={place ? `${QUICK_LABEL[kind]}: ${place.name}` : `Указать адрес: ${QUICK_LABEL[kind]}`}
            >
              <span className={`grid size-5 place-items-center rounded-full ${TINT[kind]}`}>
                <Icon className="size-3" />
              </span>
              {QUICK_LABEL[kind]}
              {!place && <span className="font-semibold text-indigo-500">+</span>}
            </button>
            {place && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSetup(kind)}
                className="mr-0.5 grid size-6 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                aria-label={`Изменить адрес: ${QUICK_LABEL[kind]}`}
                title="Изменить адрес"
              >
                <IconPencil className="size-3" />
              </button>
            )}
          </span>
        )
      })}
      {withFavorites &&
        favorites.slice(0, 8).map((f) => (
          <button
            key={f.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onUse(f)}
            className="flex max-w-[160px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--field)] py-1.5 pr-3 pl-2 text-[12.5px] font-bold transition hover:bg-[var(--hover)]"
            title={f.name}
          >
            <IconStar filled className="size-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{f.name}</span>
          </button>
        ))}
    </div>
  )
}
