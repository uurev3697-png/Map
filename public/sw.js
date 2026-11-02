/*
 * Service worker приложения «Маршрут».
 *  - оболочка приложения (HTML, JS, CSS, иконки) — кэш, чтобы открывалось мгновенно и без сети;
 *  - стили, шрифты и спрайты карты — «сначала кэш, потом обновление»;
 *  - тайлы карты — ограниченный кэш последних просмотренных;
 *  - API маршрутов/поиска/погоды не кэшируем — данные должны быть свежими.
 */
const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const MAP = `map-${VERSION}`
const TILES = `tiles-${VERSION}`
const MAX_TILES = 600

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, max) {
  const c = await caches.open(cacheName)
  const keys = await c.keys()
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i])
}

async function staleWhileRevalidate(req, cacheName) {
  const c = await caches.open(cacheName)
  const hit = await c.match(req)
  const net = fetch(req)
    .then((res) => {
      if (res.ok) c.put(req, res.clone())
      return res
    })
    .catch(() => hit)
  return hit || net
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Навигация: сеть, при её отсутствии — сохранённая страница
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(SHELL).then((c) => c.put('/', res.clone()))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Собственные статические файлы (хэшированные ассеты Vite)
  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req, SHELL))
    return
  }

  // Шрифты интерфейса и ресурсы стиля карты
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    (url.hostname === 'tiles.openfreemap.org' && /\/(styles|fonts|sprites)\//.test(url.pathname))
  ) {
    e.respondWith(staleWhileRevalidate(req, MAP))
    return
  }

  // Тайлы карты (векторные и спутник) — ограниченный кэш
  if (url.hostname === 'tiles.openfreemap.org' || url.hostname === 'server.arcgisonline.com') {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) {
          c.put(req, res.clone()).then(() => trim(TILES, MAX_TILES))
        }
        return res
      }),
    )
  }
})
