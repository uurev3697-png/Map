import { useEffect, useRef, useState } from 'react'
import { isAbort, ServiceError } from '../services/errors'
import { geocoder } from '../services/geocoding'
import type { LngLat, Place } from '../services/types'
import { useDebounce } from './useDebounce'

export const MIN_QUERY = 3

/** Автодополнение адресов: debounce + отмена устаревших запросов. */
export function useSuggestions(query: string, near: LngLat | undefined, enabled: boolean) {
  const q = useDebounce(query.trim(), 350)
  const [results, setResults] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nearRef = useRef(near)
  nearRef.current = near

  useEffect(() => {
    if (!enabled || q.length < MIN_QUERY) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }
    const ctl = new AbortController()
    setLoading(true)
    setError(null)
    geocoder
      .search(q, { near: nearRef.current, signal: ctl.signal })
      .then((r) => {
        setResults(r)
        setLoading(false)
      })
      .catch((e) => {
        if (isAbort(e)) return
        setResults([])
        setLoading(false)
        setError(e instanceof ServiceError ? e.message : 'Не удалось выполнить поиск.')
      })
    return () => ctl.abort()
  }, [q, enabled])

  // Пока пользователь печатает (debounce ещё не сработал) — тоже показываем загрузку
  const pending = enabled && query.trim().length >= MIN_QUERY && query.trim() !== q
  return { results, loading: loading || pending, error, query: q }
}
