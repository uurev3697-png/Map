import { motion } from 'framer-motion'
import type { Place } from '../services/types'
import { IconNavigation, IconPin, IconSearch } from './icons'
import { SuggestionSkeleton } from './Skeleton'
import { MIN_QUERY } from '../hooks/useSuggestions'

interface Props {
  text: string
  results: Place[]
  loading: boolean
  error: string | null
  highlight: number
  onHover(i: number): void
  onPick(p: Place): void
  onLocate(): void
}

const item =
  'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors duration-150'

export function Suggestions(p: Props) {
  const short = p.text.trim().length < MIN_QUERY

  return (
    <div className="p-1" role="listbox" aria-label="Подсказки адресов">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={p.onLocate}
        className={item + ' hover:bg-[var(--hover)]'}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500">
          <IconNavigation className="size-[17px]" />
        </span>
        <span className="text-[14px] font-semibold">Моё местоположение</span>
      </button>

      <div className="mx-2.5 my-1 h-px bg-[var(--border)]" />

      {short ? (
        <div className="flex items-center gap-3 px-2.5 py-3 text-[13px] text-[var(--muted)]">
          <IconSearch className="size-4 shrink-0" />
          Введите адрес или место — или просто нажмите на карту
        </div>
      ) : p.loading ? (
        <SuggestionSkeleton />
      ) : p.error ? (
        <div className="px-2.5 py-3 text-[13px] text-rose-500">{p.error}</div>
      ) : p.results.length === 0 ? (
        <div className="px-2.5 py-3 text-[13px] text-[var(--muted)]">Ничего не найдено. Попробуйте уточнить запрос.</div>
      ) : (
        <ul>
          {p.results.map((r, i) => (
            <motion.li
              key={r.id + i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25, ease: 'easeOut' }}
            >
              <button
                type="button"
                role="option"
                aria-selected={p.highlight === i}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => p.onHover(i)}
                onClick={() => p.onPick(r)}
                className={item + (p.highlight === i ? ' bg-[var(--hover)]' : '')}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--field)] text-[var(--muted)]">
                  <IconPin className="size-[17px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.name}</span>
                  {r.description && (
                    <span className="block truncate text-[12.5px] text-[var(--muted)]">{r.description}</span>
                  )}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
      <p className="px-2.5 pt-1 pb-1.5 text-[10.5px] text-[var(--subtle)]">
        Поиск: Photon · данные © участники OpenStreetMap
      </p>
    </div>
  )
}
