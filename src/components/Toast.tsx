import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconAlert, IconCheck, IconClose, IconInfo } from './icons'

type ToastKind = 'error' | 'info' | 'success'
interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

interface ToastApi {
  show(t: Omit<ToastItem, 'id'>): void
}

const Ctx = createContext<ToastApi>({ show: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const show = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = ++idRef.current
      setItems((xs) => {
        // не дублируем одинаковые уведомления
        const rest = xs.filter((x) => x.title !== t.title || x.message !== t.message)
        return [...rest.slice(-2), { ...t, id }]
      })
      setTimeout(() => dismiss(id), t.kind === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )
  const api = useMemo(() => ({ show }), [show])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:top-5"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 pr-2.5"
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <span
                className={
                  'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ' +
                  (t.kind === 'error'
                    ? 'bg-rose-500/15 text-rose-500'
                    : t.kind === 'success'
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-indigo-500/15 text-indigo-500')
                }
              >
                {t.kind === 'error' ? <IconAlert /> : t.kind === 'success' ? <IconCheck /> : <IconInfo />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] font-semibold leading-snug">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{t.message}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)]"
                aria-label="Закрыть"
              >
                <IconClose className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
