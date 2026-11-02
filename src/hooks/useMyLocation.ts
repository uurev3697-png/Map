import { useCallback, useEffect, useRef, useState } from 'react'
import type { MyLocation } from '../map/types'

/**
 * «Я здесь»: следим за позицией (watchPosition) и направлением —
 * курс из GPS при движении или компас устройства (deviceorientation).
 */
export function useMyLocation(onError: (msg: string) => void) {
  const [me, setMe] = useState<MyLocation | null>(null)
  const watchId = useRef<number | null>(null)
  const compass = useRef<number | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    },
    [],
  )

  // Компас: на iOS — webkitCompassHeading, на Android — deviceorientationabsolute
  useEffect(() => {
    if (!me) return
    const on = (e: DeviceOrientationEvent) => {
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const h = ios ?? (e.absolute && e.alpha !== null ? 360 - e.alpha : null)
      if (h === null || Number.isNaN(h)) return
      compass.current = h
      setMe((m) => (m && Math.abs((m.heading ?? -999) - h) > 3 ? { ...m, heading: h } : m))
    }
    const type = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(type, on as EventListener)
    return () => window.removeEventListener(type, on as EventListener)
  }, [me !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Запускает слежение; resolve — с первой координатой */
  const start = useCallback(
    () =>
      new Promise<MyLocation>((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          onErrorRef.current('Ваш браузер не поддерживает геолокацию.')
          reject()
          return
        }
        // iOS 13+: доступ к компасу только по жесту пользователя
        const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
        DOE?.requestPermission?.().catch(() => {})

        let first = true
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            const gpsHeading =
              pos.coords.heading !== null && !Number.isNaN(pos.coords.heading) && (pos.coords.speed ?? 0) > 0.8
                ? pos.coords.heading
                : null
            const next: MyLocation = {
              coord: [pos.coords.longitude, pos.coords.latitude],
              heading: gpsHeading ?? compass.current,
            }
            setMe(next)
            if (first) {
              first = false
              resolve(next)
            }
          },
          (err) => {
            const msg =
              err.code === err.PERMISSION_DENIED
                ? 'Доступ к геолокации запрещён. Разрешите его в настройках браузера.'
                : 'Не удалось определить местоположение.'
            onErrorRef.current(msg)
            if (first) reject()
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        )
      }),
    [],
  )

  return { me, start }
}
