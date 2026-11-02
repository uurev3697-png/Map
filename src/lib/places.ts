import type { Place } from '../services/types'

/** История поиска и избранные места — хранятся локально в браузере. */
const HISTORY = 'places-history'
const FAVORITES = 'places-favorites'
const MAX_HISTORY = 8

function read(key: string): Place[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v.filter((p) => p && Array.isArray(p.coord)) : []
  } catch {
    return []
  }
}
function write(key: string, list: Place[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* приватный режим / переполнение */
  }
  window.dispatchEvent(new Event('places-changed'))
}

const same = (a: Place, b: Place) =>
  a.id === b.id || (Math.abs(a.coord[0] - b.coord[0]) < 1e-5 && Math.abs(a.coord[1] - b.coord[1]) < 1e-5)

export const getHistory = () => read(HISTORY)
export const getFavorites = () => read(FAVORITES)

export function addToHistory(p: Place) {
  write(HISTORY, [p, ...read(HISTORY).filter((x) => !same(x, p))].slice(0, MAX_HISTORY))
}
export function removeFromHistory(p: Place) {
  write(HISTORY, read(HISTORY).filter((x) => !same(x, p)))
}
export function isFavorite(p: Place) {
  return read(FAVORITES).some((x) => same(x, p))
}
export function toggleFavorite(p: Place): boolean {
  const list = read(FAVORITES)
  if (list.some((x) => same(x, p))) {
    write(FAVORITES, list.filter((x) => !same(x, p)))
    return false
  }
  write(FAVORITES, [p, ...list].slice(0, 20))
  return true
}
