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

// ===== Дом и Работа =====
export type QuickKind = 'home' | 'work'
const QUICK_KEY: Record<QuickKind, string> = { home: 'place-home', work: 'place-work' }
export const QUICK_LABEL: Record<QuickKind, string> = { home: 'Дом', work: 'Работа' }

export function getQuick(kind: QuickKind): Place | null {
  try {
    const v = JSON.parse(localStorage.getItem(QUICK_KEY[kind]) || 'null')
    return v && Array.isArray(v.coord) ? v : null
  } catch {
    return null
  }
}

export function setQuick(kind: QuickKind, p: Place | null) {
  try {
    if (p) localStorage.setItem(QUICK_KEY[kind], JSON.stringify(p))
    else localStorage.removeItem(QUICK_KEY[kind])
  } catch {
    /* приватный режим */
  }
  window.dispatchEvent(new Event('places-changed'))
}

// ===== Сохранённые маршруты =====
export interface SavedPoint {
  coord: [number, number]
  label: string
  sublabel?: string
}
export interface SavedRoute {
  id: string
  name: string
  points: SavedPoint[]
  mode: 'foot' | 'bike' | 'car'
  createdAt: number
}
const ROUTES = 'saved-routes'

export function getSavedRoutes(): SavedRoute[] {
  try {
    const v = JSON.parse(localStorage.getItem(ROUTES) || '[]')
    return Array.isArray(v) ? v.filter((r) => r && Array.isArray(r.points) && r.points.length >= 2) : []
  } catch {
    return []
  }
}
function writeRoutes(list: SavedRoute[]) {
  try {
    localStorage.setItem(ROUTES, JSON.stringify(list))
  } catch {
    /* приватный режим */
  }
  window.dispatchEvent(new Event('places-changed'))
}
export function saveRoute(r: Omit<SavedRoute, 'id' | 'createdAt'>): SavedRoute {
  const route = { ...r, id: `r${Date.now().toString(36)}`, createdAt: Date.now() }
  writeRoutes([route, ...getSavedRoutes()].slice(0, 30))
  return route
}
export function deleteSavedRoute(id: string) {
  writeRoutes(getSavedRoutes().filter((r) => r.id !== id))
}

// ===== Где моя машина =====
export interface Parking {
  coord: [number, number]
  at: number
  label?: string
}
const PARKING = 'parking'

export function getParking(): Parking | null {
  try {
    const v = JSON.parse(localStorage.getItem(PARKING) || 'null')
    return v && Array.isArray(v.coord) ? v : null
  } catch {
    return null
  }
}
export function setParking(p: Parking | null) {
  try {
    if (p) localStorage.setItem(PARKING, JSON.stringify(p))
    else localStorage.removeItem(PARKING)
  } catch {
    /* приватный режим */
  }
  window.dispatchEvent(new Event('places-changed'))
}
