import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { externalLinks, shareUrl } from '../lib/share'
import type { LngLat, TravelMode } from '../services/types'
import { IconExternal, IconLink, IconPlay, IconShare, IconStop } from './icons'
import { useToast } from './Toast'

interface Props {
  points: LngLat[]
  mode: TravelMode
  flying: boolean
  canFly: boolean
  onFly(): void
}

const btn =
  'flex flex-1 items-center whitespace-nowrap justify-center gap-1.5 rounded-2xl border border-[var(--border)] px-2 py-2.5 text-[12.5px] font-bold transition hover:bg-[var(--hover)] active:scale-[0.98]'

/** Поделиться маршрутом, пролёт камеры, открыть во внешних картах. */
export function RouteActions({ points, mode, flying, canFly, onFly }: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const share = async () => {
    const url = shareUrl(points, mode)
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'Маршрут', url })
        return
      } catch {
        /* отменили — копируем */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.show({ kind: 'success', title: 'Ссылка скопирована', message: 'Отправьте её — у получателя откроется этот же маршрут.' })
    } catch {
      window.prompt('Скопируйте ссылку на маршрут:', url)
    }
  }

  const links = externalLinks(points, mode)

  return (
    <div className="flex gap-2">
      <button type="button" onClick={share} className={btn}>
        <IconShare className="size-4" /> Поделиться
      </button>
      {canFly && (
        <button
          type="button"
          onClick={onFly}
          className={btn + (flying ? ' !border-indigo-500/50 bg-indigo-500/10 text-indigo-500' : '')}
        >
          {flying ? <IconStop className="size-3.5" /> : <IconPlay className="size-3.5" />}
          {flying ? 'Стоп' : 'Пролёт'}
        </button>
      )}
      <div ref={ref} className="relative flex flex-1">
        <button type="button" onClick={() => setOpen((o) => !o)} className={btn} aria-expanded={open}>
          <IconExternal className="size-4" /> Открыть
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              style={{ transformOrigin: 'bottom right' }}
              className="glass absolute right-0 bottom-full z-30 mb-1.5 w-52 rounded-2xl p-1.5"
            >
              {[
                ['Яндекс Картах', links.yandex, '#fc3f1d'],
                ['2ГИС', links.twoGis, '#19aa1e'],
                ['Google Картах', links.google, '#4285f4'],
              ].map(([name, href, color]) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-semibold transition hover:bg-[var(--hover)]"
                >
                  <span className="size-2.5 rounded-full" style={{ background: color }} />
                  {name}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  void navigator.clipboard?.writeText(shareUrl(points, mode))
                  toast.show({ kind: 'success', title: 'Ссылка скопирована' })
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold transition hover:bg-[var(--hover)]"
              >
                <IconLink className="size-3.5 text-[var(--muted)]" /> Копировать ссылку
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
