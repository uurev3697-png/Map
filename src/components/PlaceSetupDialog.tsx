import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCurrentPosition } from '../hooks/geolocation'
import { useSuggestions } from '../hooks/useSuggestions'
import { getQuick, QUICK_LABEL, setQuick, type QuickKind } from '../lib/places'
import { formatCoord } from '../lib/format'
import { geocoder } from '../services/geocoding'
import type { LngLat, Place } from '../services/types'
import { IconBriefcase, IconClose, IconHome, IconNavigation, IconPin, IconTrash } from './icons'
import { SuggestionSkeleton } from './Skeleton'
import { useToast } from './Toast'

interface Props {
  kind: QuickKind | null
  near?: LngLat
  /** Точки текущего маршрута — можно сохранить одну из них */
  routePoints: Place[]
  onClose(): void
  /** Адрес сохранён — например, сразу построить маршрут */
  onSaved?(kind: QuickKind, place: Place): void
}

const TITLE: Record<QuickKind, string> = { home: 'Где ваш дом?', work: 'Где ваша работа?' }

/** Окно «Указать адрес Дома / Работы»: поиск, моё местоположение или точка маршрута. */
export function PlaceSetupDialog({ kind, near, routePoints, onClose, onSaved }: Props) {
  return createPortal(
    <AnimatePresence>
      {kind && <Dialog key={kind} kind={kind} near={near} routePoints={routePoints} onClose={onClose} onSaved={onSaved} />}
    </AnimatePresence>,
    document.body,
  )
}

function Dialog({ kind, near, routePoints, onClose, onSaved }: Props & { kind: QuickKind }) {
  const toast = useToast()
  const current = getQuick(kind)
  const [text, setText] = useState('')
  const [locating, setLocating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sugg = useSuggestions(text, near, true)
  const Icon = kind === 'home' ? IconHome : IconBriefcase

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const save = (place: Place) => {
    const p = { ...place, id: `${kind}:${place.id}` }
    setQuick(kind, p)
    toast.show({ kind: 'success', title: `${QUICK_LABEL[kind]} сохранён${kind === 'work' ? 'а' : ''}`, message: place.name })
    onSaved?.(kind, p)
    onClose()
  }

  const useMyLocation = async () => {
    setLocating(true)
    try {
      const coord = await getCurrentPosition()
      const place = await geocoder.reverse(coord).catch(() => null)
      save({
        id: coord.join(','),
        name: place?.name ?? 'Моё местоположение',
        description: place?.description ?? formatCoord(coord),
        coord,
      })
    } catch (e) {
      toast.show({ kind: 'error', title: 'Геолокация недоступна', message: (e as Error).message })
    } finally {
      setLocating(false)
    }
  }

  const row = 'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-[var(--hover)]'

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 backdrop-blur-[2px] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal
        aria-label={TITLE[kind]}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="glass flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-[28px] p-4 sm:rounded-[28px]"
        style={{ background: 'var(--panel-solid)' }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span
            className={
              'grid size-10 place-items-center rounded-2xl ' +
              (kind === 'home' ? 'bg-sky-500/14 text-sky-500' : 'bg-violet-500/14 text-violet-500')
            }
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">{TITLE[kind]}</h2>
            <p className="truncate text-[12.5px] text-[var(--muted)]">
              {current ? `Сейчас: ${current.name}` : 'Укажите адрес — маршрут будет строиться в одно касание'}
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
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sugg.results[0] && !sugg.loading && save(sugg.results[0])}
          placeholder="Улица, дом или место"
          aria-label="Адрес"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-[var(--subtle)] focus:border-indigo-400 focus:shadow-[0_0_0_3px_var(--ring)]"
        />

        <div className="scroll-thin -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
          {text.trim().length >= 3 ? (
            sugg.loading ? (
              <SuggestionSkeleton />
            ) : sugg.results.length ? (
              <ul>
                {sugg.results.map((r, i) => (
                  <li key={r.id + i}>
                    <button type="button" onClick={() => save(r)} className={row}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--field)] text-[var(--muted)]">
                        <IconPin className="size-[17px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{r.name}</span>
                        <span className="block truncate text-[12.5px] text-[var(--muted)]">{r.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2.5 py-3 text-[13px] text-[var(--muted)]">{sugg.error ?? 'Ничего не найдено.'}</p>
            )
          ) : (
            <>
              <button type="button" onClick={useMyLocation} disabled={locating} className={row}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-500/12 text-indigo-500">
                  <IconNavigation className={'size-[17px] ' + (locating ? 'animate-pulse' : '')} />
                </span>
                <span className="text-[14px] font-semibold">{locating ? 'Определяем…' : 'Я сейчас здесь'}</span>
              </button>
              {routePoints.length > 0 && (
                <>
                  <p className="px-2.5 pt-2 pb-1 text-[11px] font-bold tracking-wide text-[var(--subtle)] uppercase">
                    Точки маршрута
                  </p>
                  {routePoints.map((p, i) => (
                    <button key={p.id + i} type="button" onClick={() => save(p)} className={row}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--field)] text-[var(--muted)]">
                        <IconPin className="size-[17px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                        <span className="block truncate text-[12.5px] text-[var(--muted)]">{p.description}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {current && (
          <button
            type="button"
            onClick={() => {
              setQuick(kind, null)
              toast.show({ kind: 'info', title: `Адрес «${QUICK_LABEL[kind]}» удалён` })
              onClose()
            }}
            className="mt-2 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-semibold text-rose-500 transition hover:bg-rose-500/10"
          >
            <IconTrash className="size-4" /> Удалить адрес
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
