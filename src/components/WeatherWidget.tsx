import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { MyLocation } from '../map/types'
import { isAbort } from '../services/errors'
import { geocoder } from '../services/geocoding'
import { getWeatherDetails, type WeatherDetails } from '../services/weather'
import { IconNavigation } from './icons'
import { Skeleton } from './Skeleton'

interface Props {
  me: MyLocation | null
  busy: boolean
  onLocate(): void
  /** Расположение: справа (десктоп, рядом с кнопками) или слева (телефон) */
  align: 'left' | 'right'
}

const sign = (t: number) => (t > 0 ? `+${t}` : `${t}`)

/** Погода в моём местоположении: плашка на карте + подробная карточка по нажатию. */
export function WeatherWidget({ me, busy, onLocate, align }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ key: string; w: WeatherDetails; city?: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  // Округляем до ~1 км, чтобы не дёргать API на каждый шаг
  const key = me ? `${me.coord[0].toFixed(2)},${me.coord[1].toFixed(2)}` : ''

  useEffect(() => {
    if (!me) return
    const ctl = new AbortController()
    setFailed(false)
    Promise.all([getWeatherDetails(me.coord, ctl.signal), geocoder.reverse(me.coord, ctl.signal).catch(() => null)])
      .then(([w, place]) => setData({ key, w, city: place?.city ?? place?.name }))
      .catch((e) => !isAbort(e) && setFailed(true))
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const w = data?.key === key ? data.w : null
  const chip = 'glass flex h-11 items-center gap-2 rounded-2xl px-3 text-[13.5px] font-bold transition-colors'

  if (!me) {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onLocate}
        disabled={busy}
        className={chip + ' hover:text-sky-500'}
        title="Показать погоду в моём местоположении"
      >
        <span className="text-[17px] leading-none">🌤️</span>
        <span className="text-[12.5px]">{busy ? 'Определяем…' : 'Погода рядом'}</span>
        <IconNavigation className={'size-3.5 text-sky-500 ' + (busy ? 'animate-pulse' : '')} />
      </motion.button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => (failed ? setAttempt((a) => a + 1) : setOpen((o) => !o))}
        className={chip + ' hover:text-sky-500'}
        aria-expanded={open}
        title={w ? `${w.text}, ${sign(w.temp)}°` : 'Погода'}
      >
        {w ? (
          <>
            <span className="text-[17px] leading-none">{w.icon}</span>
            <span className="tabular">{sign(w.temp)}°</span>
            {data?.city && (
              <span className="max-w-[110px] truncate text-[12px] font-semibold text-[var(--muted)]">{data.city}</span>
            )}
          </>
        ) : failed ? (
          <span className="text-[12px] text-[var(--muted)]">Погода недоступна · повторить</span>
        ) : (
          <Skeleton className="h-4 w-20" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && w && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
            className={'glass absolute top-full z-30 mt-2 w-[min(300px,calc(100vw-24px))] rounded-[22px] p-4 ' + (align === 'right' ? 'right-0' : 'left-0')}
          >
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted)]">
              <IconNavigation className="size-3 text-sky-500" /> {data?.city ?? 'Вы здесь'} · сейчас
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-[44px] leading-none">{w.icon}</span>
              <div>
                <p className="tabular text-[34px] leading-none font-extrabold tracking-[-0.04em]">{sign(w.temp)}°</p>
                <p className="mt-1 text-[13px] font-semibold">{w.text}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['Ощущается', `${sign(w.feels)}°`],
                ['Ветер', `${w.wind} м/с`],
                ['Влажность', `${w.humidity}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[var(--field)] px-1 py-2">
                  <p className="text-[10.5px] text-[var(--muted)]">{k}</p>
                  <p className="tabular text-[13.5px] font-bold">{v}</p>
                </div>
              ))}
            </div>
            {w.hourly.length > 0 && (
              <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3">
                {w.hourly.map((h, i) => (
                  <motion.div
                    key={h.time}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="tabular text-[10.5px] text-[var(--muted)]">{h.time}</span>
                    <span className="text-[17px] leading-none">{h.icon}</span>
                    <span className="tabular text-[12px] font-bold">{sign(h.temp)}°</span>
                  </motion.div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] text-[var(--subtle)]">Данные: Open-Meteo</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
