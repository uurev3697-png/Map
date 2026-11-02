import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { IconMinus, IconMoon, IconPlus, IconRoute, IconSun } from './icons'

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
