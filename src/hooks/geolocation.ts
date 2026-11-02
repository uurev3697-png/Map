import type { LngLat } from '../services/types'

export function getCurrentPosition(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Ваш браузер не поддерживает геолокацию.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Доступ к геолокации запрещён. Разрешите его в настройках браузера.'
            : err.code === err.TIMEOUT
              ? 'Не удалось определить местоположение: истекло время ожидания.'
              : 'Не удалось определить местоположение.'
        reject(new Error(msg))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}
