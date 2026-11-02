import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { IconCube, IconMinus, IconMoon, IconNavigation, IconPlus, IconRoute, IconSnowflake, IconSun } from './icons'

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle(): void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      className="glass grid size-11 place-items-center overflow-hidden rounded-2xl transition-colors hover:text-indigo-500"
      aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}
        >
          {dark ? <IconMoon /> : <IconSun />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export function WinterToggle({ on, onToggle }: { on: boolean; onToggle(): void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      aria-pressed={on}
      className={
        'glass grid size-11 place-items-center overflow-hidden rounded-2xl transition-colors ' +
        (on ? '!bg-sky-500 text-white !border-sky-400/60 shadow-sky-500/30' : 'hover:text-sky-500')
      }
      aria-label={on ? 'Выключить зимний режим' : 'Включить зимний режим'}
      title={on ? 'Зимний режим: вкл.' : 'Зимний режим'}
    >
      <motion.span animate={{ rotate: on ? 180 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
        <IconSnowflake />
      </motion.span>
    </motion.button>
  )
}

const round = 'glass grid size-11 place-items-center overflow-hidden rounded-2xl transition-colors '

export function TiltToggle({ on, onToggle }: { on: boolean; onToggle(): void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      aria-pressed={on}
      className={round + (on ? '!bg-indigo-500 text-white !border-indigo-400/60' : 'hover:text-indigo-500')}
      aria-label={on ? 'Плоская карта' : '3D-здания'}
      title={on ? 'Плоская карта' : '3D-здания'}
    >
      <span className="flex flex-col items-center leading-none">
        <IconCube className="size-[17px]" />
        <span className="mt-0.5 text-[9px] font-extrabold tracking-wide">3D</span>
      </span>
    </motion.button>
  )
}

export function LocateButton({ active, busy, onClick }: { active: boolean; busy: boolean; onClick(): void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={busy}
      className={round + (active ? 'text-sky-500' : 'hover:text-sky-500')}
      aria-label="Где я"
      title="Где я"
    >
      <IconNavigation className={'size-[18px] ' + (busy ? 'animate-pulse' : '') + (active ? ' fill-current' : '')} />
    </motion.button>
  )
}

function Btn({ onClick, label, children }: { onClick(): void; label: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center transition-colors hover:bg-[var(--hover)] hover:text-indigo-500 active:scale-95"
    >
      {children}
    </button>
  )
}

export function ZoomControls({
  onIn,
  onOut,
  onFit,
}: {
  onIn(): void
  onOut(): void
  onFit?: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence>
        {onFit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="glass overflow-hidden rounded-2xl"
          >
            <Btn onClick={onFit} label="Показать весь маршрут">
              <IconRoute />
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="glass flex flex-col overflow-hidden rounded-2xl">
        <Btn onClick={onIn} label="Приблизить">
          <IconPlus />
        </Btn>
        <div className="mx-2.5 h-px bg-[var(--border)]" />
        <Btn onClick={onOut} label="Отдалить">
          <IconMinus />
        </Btn>
      </div>
    </div>
  )
}
