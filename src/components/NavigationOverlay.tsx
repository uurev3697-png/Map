import { AnimatePresence, motion } from 'framer-motion'
import type { NavState } from '../hooks/useNavigation'
import { formatDistance, formatDuration } from '../lib/format'
import type { TravelMode } from '../services/types'
import { IconNavigation, ManeuverIcon } from './icons'

interface Props {
  nav: NavState | null
  mode: TravelMode
  simulate: boolean
  voice: boolean
  follow: boolean
  rerouting: boolean
  onToggleVoice(): void
  onRecenter(): void
  onStop(): void
}

const BANNER: Record<TravelMode, string> = {
  foot: 'from-emerald-600 to-teal-700',
  bike: 'from-amber-500 to-orange-600',
  car: 'from-indigo-600 to-violet-700',
}

const arrival = (sec: number) =>
  new Date(Date.now() + sec * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
    </svg>
  )
}

/** Экран навигации «В путь»: манёвр сверху, остаток пути и управление снизу. */
export function NavigationOverlay({ nav, mode, simulate, voice, follow, rerouting, onToggleVoice, onRecenter, onStop }: Props) {
  const spring = { type: 'spring' as const, stiffness: 380, damping: 34 }
  return (
    <>
      {/* Верх: следующий манёвр */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={spring}
        className="pointer-events-none absolute inset-x-3 top-3 z-30 mx-auto max-w-[460px] md:top-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!nav ? (
            <motion.div
              key="gps"
              {...fadeCard}
              className="glass pointer-events-auto flex items-center gap-3 rounded-[24px] p-4"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-500">
                <IconNavigation className="size-6 animate-pulse" />
              </span>
              <div>
                <p className="text-[16px] font-extrabold">Ищем GPS…</p>
                <p className="text-[12.5px] text-[var(--muted)]">Разрешите доступ к геолокации и выйдите на открытое место</p>
              </div>
            </motion.div>
          ) : nav.arrived ? (
            <motion.div
              key="arrived"
              {...fadeCard}
              className="pointer-events-auto flex items-center gap-3 rounded-[24px] bg-gradient-to-br from-emerald-500 to-green-700 p-4 text-white shadow-2xl"
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-white/20 text-[30px]">🏁</span>
              <div className="flex-1">
                <p className="text-[20px] font-extrabold tracking-tight">Вы прибыли!</p>
                <p className="text-[13px] opacity-85">Маршрут завершён</p>
              </div>
              <button
                type="button"
                onClick={onStop}
                className="rounded-full bg-white px-4 py-2 text-[13.5px] font-bold text-emerald-700 transition active:scale-95"
              >
                Готово
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={nav.stepIndex}
              {...fadeCard}
              className={`pointer-events-auto overflow-hidden rounded-[24px] bg-gradient-to-br text-white shadow-2xl ${BANNER[mode]}`}
            >
              <div className="flex items-center gap-3.5 p-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/18">
                  {nav.step && <ManeuverIcon kind={nav.step.kind} className="size-9" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="tabular text-[28px] leading-none font-extrabold tracking-[-0.03em]">
                    {formatDistance(nav.distToStep)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[15px] leading-snug font-semibold">{nav.step?.instruction}</p>
                </div>
              </div>
              {nav.nextStep && nav.nextStep.kind !== 'arrive' && (
                <div className="flex items-center gap-2 bg-black/15 px-4 py-2 text-[13px] font-semibold">
                  <span className="opacity-75">Затем</span>
                  <ManeuverIcon kind={nav.nextStep.kind} className="size-4" />
                  <span className="truncate">{nav.nextStep.instruction}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {(rerouting || nav?.offRoute) && !nav?.arrived && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass mx-auto mt-2 w-fit rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-amber-600"
            >
              {rerouting ? 'Перестраиваем маршрут…' : 'Вы ушли с маршрута'}
            </motion.p>
          )}
          {simulate && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass mx-auto mt-2 w-fit rounded-full px-3 py-1 text-[11.5px] font-bold text-[var(--muted)]"
            >
              Демо-поездка · ускорено
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Низ: сколько осталось + управление */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={spring}
        className="absolute inset-x-3 bottom-3 z-30 mx-auto max-w-[460px] md:bottom-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <AnimatePresence>
          {!follow && nav && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={onRecenter}
              className="glass mx-auto mb-2 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-bold text-sky-600"
            >
              <IconNavigation className="size-4 fill-current" /> Вернуться к маршруту
            </motion.button>
          )}
        </AnimatePresence>
        <div className="glass flex items-center gap-3 rounded-[24px] p-3 pl-4">
          <div className="min-w-0 flex-1">
            {nav ? (
              <>
                <p className="tabular text-[22px] leading-tight font-extrabold tracking-[-0.03em]">
                  {formatDuration(nav.remainingTime)}
                </p>
                <p className="tabular truncate text-[13px] font-semibold text-[var(--muted)]">
                  {formatDistance(nav.remaining)} · прибытие {arrival(nav.remainingTime)}
                </p>
              </>
            ) : (
              <p className="text-[14px] font-semibold text-[var(--muted)]">Навигация запущена</p>
            )}
            {nav && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--field)]">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${BANNER[mode]}`}
                  animate={{ width: `${Math.round(nav.progress * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleVoice}
            aria-pressed={voice}
            className={
              'grid size-11 shrink-0 place-items-center rounded-full transition ' +
              (voice ? 'bg-[var(--field)] text-[var(--fg)]' : 'bg-[var(--field)] text-[var(--subtle)]')
            }
            aria-label={voice ? 'Выключить голос' : 'Включить голос'}
            title={voice ? 'Выключить голос' : 'Включить голос'}
          >
            <SpeakerIcon on={voice} />
          </button>
          <button
            type="button"
            onClick={onStop}
            className="h-11 shrink-0 rounded-full bg-rose-500 px-4 text-[14px] font-bold text-white shadow-lg shadow-rose-500/25 transition active:scale-95"
          >
            Завершить
          </button>
        </div>
      </motion.div>
    </>
  )
}

const fadeCard = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98 },
  transition: { duration: 0.22 },
}
