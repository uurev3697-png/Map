import { motion } from 'framer-motion'
import { usePlaces } from '../hooks/usePlaces'
import { setParking, type Parking } from '../lib/places'
import { IconClose, IconParking } from './icons'

interface Props {
  busy: boolean
  onPark(): void
  onGo(p: Parking): void
}

const since = (at: number) => {
  const d = new Date(at)
  const today = new Date().toDateString() === d.toDateString()
  const t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return today ? `с ${t}` : `с ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${t}`
}

/** «Где моя машина»: запомнить место парковки и дойти до него пешком. */
export function ParkingCard({ busy, onPark, onGo }: Props) {
  const { parking } = usePlaces()
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
      <button
        type="button"
        onClick={() => (parking ? onGo(parking) : onPark())}
        disabled={busy}
        className="flex w-full items-center gap-2.5 rounded-[18px] border border-[var(--border)] p-2.5 pr-11 text-left transition hover:bg-[var(--hover)] active:scale-[0.99] disabled:opacity-70"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/14 text-blue-500">
          <IconParking className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold">{parking ? 'Дойти до машины' : 'Моя машина'}</span>
          <span className={'block truncate text-[11.5px] ' + (parking ? 'text-[var(--muted)]' : 'font-semibold text-indigo-500')}>
            {busy
              ? 'Определяем место…'
              : parking
                ? `${parking.label ?? 'Место парковки'} · ${since(parking.at)}`
                : '+ Я припарковался здесь'}
          </span>
        </span>
      </button>
      {parking && (
        <button
          type="button"
          onClick={() => setParking(null)}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          aria-label="Забыть место парковки"
          title="Забыть место парковки"
        >
          <IconClose className="size-4" />
        </button>
      )}
    </motion.div>
  )
}
