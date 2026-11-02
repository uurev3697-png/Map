const num1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const num0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** 850 → «850 м», 12430 → «12,4 км», 154000 → «154 км» */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 10) * 10)} м`
  const km = meters / 1000
  return km < 100 ? `${num1.format(km)} км` : `${num0.format(km)} км`
}

/** 5100 → «1 ч 25 мин», 30 → «1 мин», 90000 → «1 д 1 ч» */
export function formatDuration(seconds: number): string {
  const totalMin = Math.max(1, Math.round(seconds / 60))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return h ? `${d} д ${h} ч` : `${d} д`
  if (h > 0) return m ? `${h} ч ${m} мин` : `${h} ч`
  return `${m} мин`
}

/** Время прибытия: «14:35» */
export function formatArrival(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatCoord([lng, lat]: [number, number]): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

/** "HH:MM" → Date сегодня (или завтра, если время уже прошло) */
function atTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  if (d.getTime() < Date.now() - 60_000) d.setDate(d.getDate() + 1)
  return d
}
const hm = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export type TimeSpec = { kind: 'now' } | { kind: 'depart' | 'arrive'; time: string }

/** Подпись времени для карточки: «до 14:35» / «прибытие 14:35» / «выход в 13:20» */
export function timeHint(seconds: number, t: TimeSpec, mode: 'foot' | 'bike' | 'car'): string {
  if (t.kind === 'now') return `до ${formatArrival(seconds)}`
  if (t.kind === 'depart') return `прибытие ${hm(new Date(atTime(t.time).getTime() + seconds * 1000))}`
  const verb = mode === 'car' ? 'выезд' : 'выход'
  return `${verb} в ${hm(new Date(atTime(t.time).getTime() - seconds * 1000))}`
}

export function nowHHMM(offsetMin = 0): string {
  return hm(new Date(Date.now() + offsetMin * 60_000))
}
