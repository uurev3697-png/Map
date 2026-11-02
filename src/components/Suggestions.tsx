import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { MIN_QUERY } from '../hooks/useSuggestions'
import { getFavorites, getHistory, isFavorite, removeFromHistory, toggleFavorite } from '../lib/places'
import type { Place } from '../services/types'
import { IconClose, IconHistory, IconNavigation, IconPin, IconSearch, IconStar } from './icons'
import { SuggestionSkeleton } from './Skeleton'

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

const item = 'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors duration-150'

/** Подписка на изменения истории/избранного (в т.ч. из других вкладок) */
function usePlaces() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const on = () => setV((x) => x + 1)
    window.addEventListener('places-changed', on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener('places-changed', on)
      window.removeEventListener('storage', on)
    }
  }, [])
  return { favorites: getFavorites(), history: getHistory(), v }
}

function StarButton({ place }: { place: Place }) {
  const fav = isFavorite(place)
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(place)
      }}
      className={
        'grid size-8 shrink-0 place-items-center rounded-full transition hover:bg-[var(--hover)] ' +
        (fav ? 'text-amber-500' : 'text-[var(--subtle)] opacity-0 group-hover:opacity-100 focus:opacity-100')
      }
      aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
      title={fav ? 'Убрать из избранного' : 'В избранное'}
    >
      <IconStar filled={fav} className="size-4" />
    </motion.button>
  )
}

function PlaceRow({
  place,
  icon,
  selected,
  onHover,
  onPick,
  extra,
  delay = 0,
}: {
  place: Place
  icon: 'pin' | 'history' | 'star'
  selected?: boolean
  onHover?: () => void
  onPick(): void
  extra?: React.ReactNode
  delay?: number
}) {
  const Icon = icon === 'history' ? IconHistory : icon === 'star' ? IconStar : IconPin
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: 'easeOut' }}
      className={'group flex items-center rounded-2xl pr-1 ' + (selected ? 'bg-[var(--hover)]' : 'hover:bg-[var(--hover)]')}
      onMouseEnter={onHover}
    >
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPick}
        className={item + ' min-w-0 flex-1'}
      >
        <span
          className={
            'grid size-9 shrink-0 place-items-center rounded-xl ' +
            (icon === 'star' ? 'bg-amber-500/14 text-amber-500' : 'bg-[var(--field)] text-[var(--muted)]')
          }
        >
          <Icon className="size-[17px]" {...(icon === 'star' ? { filled: true } : {})} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{place.name}</span>
          {place.description && <span className="block truncate text-[12.5px] text-[var(--muted)]">{place.description}</span>}
        </span>
      </button>
      {extra}
    </motion.li>
  )
}

export function Suggestions(p: Props) {
  const short = p.text.trim().length < MIN_QUERY
  const { favorites, history } = usePlaces()
  const recent = history.filter((h) => !favorites.some((f) => f.id === h.id))

  return (
    <div className="p-1" role="listbox" aria-label="Подсказки адресов">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={p.onLocate} className={item + ' hover:bg-[var(--hover)]'}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500">
          <IconNavigation className="size-[17px]" />
        </span>
        <span className="text-[14px] font-semibold">Моё местоположение</span>
      </button>

      <div className="mx-2.5 my-1 h-px bg-[var(--border)]" />

      {short ? (
        <>
          {favorites.length > 0 && (
            <>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-[var(--subtle)] uppercase">Избранное</p>
              <ul>
                {favorites.map((f, i) => (
                  <PlaceRow key={'f' + f.id} place={f} icon="star" onPick={() => p.onPick(f)} delay={i * 0.02} extra={<StarButton place={f} />} />
                ))}
              </ul>
            </>
          )}
          {recent.length > 0 && (
            <>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-[var(--subtle)] uppercase">Недавние</p>
              <ul>
                {recent.map((h, i) => (
                  <PlaceRow
                    key={'h' + h.id}
                    place={h}
                    icon="history"
                    onPick={() => p.onPick(h)}
                    delay={i * 0.02}
                    extra={
                      <>
                        <StarButton place={h} />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => removeFromHistory(h)}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--subtle)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--hover)]"
                          aria-label="Удалить из истории"
                          title="Удалить из истории"
                        >
                          <IconClose className="size-3.5" />
                        </button>
                      </>
                    }
                  />
                ))}
              </ul>
            </>
          )}
          {!favorites.length && !recent.length && (
            <div className="flex items-center gap-3 px-2.5 py-3 text-[13px] text-[var(--muted)]">
              <IconSearch className="size-4 shrink-0" />
              Введите адрес или место — или просто нажмите на карту
            </div>
          )}
        </>
      ) : p.loading ? (
        <SuggestionSkeleton />
      ) : p.error ? (
        <div className="px-2.5 py-3 text-[13px] text-rose-500">{p.error}</div>
      ) : p.results.length === 0 ? (
        <div className="px-2.5 py-3 text-[13px] text-[var(--muted)]">Ничего не найдено. Попробуйте уточнить запрос.</div>
      ) : (
        <ul>
          {p.results.map((r, i) => (
            <PlaceRow
              key={r.id + i}
              place={r}
              icon="pin"
              selected={p.highlight === i}
              onHover={() => p.onHover(i)}
              onPick={() => p.onPick(r)}
              delay={i * 0.03}
              extra={<StarButton place={r} />}
            />
          ))}
        </ul>
      )}
      <p className="px-2.5 pt-1 pb-1.5 text-[10.5px] text-[var(--subtle)]">Поиск: Photon · данные © участники OpenStreetMap</p>
    </div>
  )
}
