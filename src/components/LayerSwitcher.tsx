import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { LAYERS, type LayerId } from '../map/styles'
import { IconLayers } from './icons'

export function LayerSwitcher({ value, onChange }: { value: LayerId; onChange(id: LayerId): void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        className="glass grid size-11 place-items-center rounded-2xl transition-colors hover:text-indigo-500"
        aria-label="Слои карты"
        aria-expanded={open}
        title="Слои карты"
      >
        <IconLayers />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            style={{ transformOrigin: 'top right' }}
            className="glass absolute top-0 right-[52px] w-[min(296px,calc(100vw-96px))] rounded-[22px] p-2.5"
            role="menu"
          >
            <p className="px-1.5 pt-0.5 pb-2 text-[12px] font-bold tracking-wide text-[var(--muted)] uppercase">Слой карты</p>
            <div className="grid grid-cols-2 gap-2">
              {LAYERS.map((l) => {
                const active = l.id === value
                return (
                  <button
                    key={l.id}
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      onChange(l.id)
                      setOpen(false)
                    }}
                    className="group rounded-2xl p-1 text-left transition hover:bg-[var(--hover)]"
                  >
                    <span
                      className={
                        'relative block h-[60px] overflow-hidden rounded-xl ring-2 transition ' +
                        (active ? 'ring-indigo-500' : 'ring-transparent group-hover:ring-[var(--border-strong)]')
                      }
                      style={{ background: l.preview }}
                    >
                      {active && (
                        <motion.span
                          layoutId="layer-check"
                          className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-indigo-500 text-white shadow"
                        >
                          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3.5}>
                            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.span>
                      )}
                    </span>
                    <span className={'mt-1.5 block px-1 text-[13px] font-semibold ' + (active ? 'text-indigo-500' : '')}>
                      {l.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
