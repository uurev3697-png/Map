import { useEffect, useState } from 'react'
import { getFavorites, getHistory, getQuick } from '../lib/places'

/** История, избранное, Дом и Работа — с подпиской на изменения (в т.ч. из других вкладок) */
export function usePlaces() {
  const [, setV] = useState(0)
  useEffect(() => {
    const on = () => setV((x) => x + 1)
    window.addEventListener('places-changed', on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener('places-changed', on)
      window.removeEventListener('storage', on)
    }
  }, [])
  return { favorites: getFavorites(), history: getHistory(), home: getQuick('home'), work: getQuick('work') }
}
