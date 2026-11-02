import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, type Snap } from './components/BottomSheet'
import { Garland } from './components/Garland'
import { LayerSwitcher } from './components/LayerSwitcher'
import { LocateButton, ThemeToggle, TiltToggle, WinterToggle, ZoomControls } from './components/MapButtons'
import { RoutePanel } from './components/RoutePanel'
import { SnowCap } from './components/SnowCap'
import { Snowfall } from './components/Snowfall'
import { useToast } from './components/Toast'
import { slotKind, slotLabel } from './components/WaypointFields'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useMyLocation } from './hooks/useMyLocation'
import { pick, useRoutePlanner } from './hooks/useRoutePlanner'
import { useTheme } from './hooks/useTheme'
import { useWinter } from './hooks/useWinter'
import { isNewYearEve, isNewYearSeason } from './lib/season'
import { decodeState, encodeState } from './lib/share'
import MapView from './map/MapView'
import { LAYERS, type LayerId } from './map/styles'
import type { MapApi, MapPadding, MapWaypoint } from './map/types'
import { TRAVEL_MODES, type LngLat, type Route, type TravelMode } from './services/types'

const GoogleMapView = lazy(() => import('./map/GoogleMapView'))

const PANEL_W = 400
const MOBILE_PEEK = 208
const NEW_YEAR = isNewYearSeason()

export default function App() {
  const { dark, toggle } = useTheme()
  const winterMode = useWinter()
  const { winter } = winterMode
  const toast = useToast()
  const toggleWinter = () => {
    winterMode.toggle()
    toast.show(
      winter
        ? { kind: 'info', title: 'Зимний режим выключен' }
        : { kind: 'success', title: 'Зимний режим включён', message: 'Снег, заснеженные парки и ледяные реки ❄' },
    )
  }
  const isMobile = useMediaQuery('(max-width: 767px)')
  const planner = useRoutePlanner()
  const { slots, routes, activeMode } = planner

  // Новогодняя ночь: ёлочка вместо маркера «Б»
  useEffect(() => {
    document.documentElement.classList.toggle('newyear-eve', winter && isNewYearEve())
  }, [winter])

  // Слой карты: «Схема» и «Тёмная» следуют за темой приложения
  const [layer, setLayer] = useState<LayerId>(() => (dark ? 'dark' : 'osm'))
  useEffect(() => {
    setLayer((l) => (l === 'osm' && dark ? 'dark' : l === 'dark' && !dark ? 'osm' : l))
  }, [dark])
  const safeLayer: LayerId = LAYERS.some((l) => l.id === layer) ? layer : 'osm'
  const isGoogle = safeLayer === 'google'

  // ===== Ссылка на маршрут: читаем при загрузке, обновляем при изменениях =====
  const { loadPoints } = planner
  useEffect(() => {
    const shared = decodeState(window.location.search)
    if (shared) loadPoints(shared.points, shared.mode)
  }, [loadPoints])
  const pointsKey = planner.points.map((p) => p.join(',')).join(';')
  useEffect(() => {
    const url = new URL(window.location.href)
    const keep = url.searchParams.has('newyear') ? '&newyear' : ''
    const search = planner.points.length ? '?' + encodeState(planner.points, activeMode) + keep : keep ? '?newyear' : ''
    if (url.search !== search) window.history.replaceState(null, '', url.pathname + search + url.hash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, activeMode])

  // ===== Шторка на мобильных =====
  const [snap, setSnap] = useState<Snap>('peek')
  const [sheetH, setSheetH] = useState(MOBILE_PEEK)
  const hasRoute = TRAVEL_MODES.some((m) => routes[m].status === 'ok')
  useEffect(() => {
    if (isMobile && hasRoute) setSnap((s) => (s === 'peek' ? 'half' : s))
  }, [isMobile, hasRoute])
  const onEditingChange = useCallback(
    (editing: boolean) => {
      if (isMobile && editing) setSnap('full')
    },
    [isMobile],
  )

  const padding: MapPadding = useMemo(
    () =>
      isMobile
        ? { top: 64, right: 8, bottom: Math.min(sheetH, window.innerHeight * 0.6), left: 8 }
        : { top: 24, right: 80, bottom: 24, left: PANEL_W + 32 },
    [isMobile, sheetH],
  )
  useEffect(() => {
    document.documentElement.style.setProperty('--ctrl-bottom', isMobile ? `${sheetH}px` : '0px')
  }, [isMobile, sheetH])

  const [center, setCenter] = useState<LngLat>()
  const [focus, setFocus] = useState<{ coord: LngLat; key: number } | null>(null)
  const apiRef = useRef<MapApi | null>(null)

  // ===== Данные для карты =====
  const mapRoutes = useMemo(() => {
    const r: Partial<Record<TravelMode, Route>> = {}
    for (const m of TRAVEL_MODES) {
      const route = pick(routes[m])
      if (route) r[m] = route
    }
    return r
  }, [routes])

  const alternatives = useMemo(() => {
    const s = routes[activeMode]
    return (s.routes ?? []).map((route, idx) => ({ idx, route })).filter((x) => x.idx !== s.selected)
  }, [routes, activeMode])

  const waypoints = useMemo<MapWaypoint[]>(
    () =>
      slots.flatMap((s, i) =>
        s.wp ? [{ id: s.id, coord: s.wp.coord, kind: slotKind(i, slots.length), label: slotLabel(i, slots.length) }] : [],
      ),
    [slots],
  )

  const skipRefit = useRef(false)
  const onStep = useCallback(
    (coord: LngLat) => {
      setFocus({ coord, key: Date.now() })
      if (isMobile) {
        skipRefit.current = true
        setSnap('peek')
      }
    },
    [isMobile],
  )

  // Шторка поменяла высоту — заново вписываем маршрут в видимую часть карты
  const { refit } = planner
  useEffect(() => {
    if (!isMobile || !hasRoute) return
    if (skipRefit.current) {
      skipRefit.current = false
      return
    }
    const t = setTimeout(refit, 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetH])

  // ===== «Я здесь» =====
  const { me, start: startTracking } = useMyLocation((message) =>
    toast.show({ kind: 'error', title: 'Геолокация недоступна', message }),
  )
  const [locating, setLocating] = useState(false)
  const locateMe = async () => {
    if (me) {
      apiRef.current?.flyTo(me.coord, 16)
      return
    }
    setLocating(true)
    try {
      const pos = await startTracking()
      apiRef.current?.flyTo(pos.coord, 16)
    } catch {
      /* сообщение уже показано */
    } finally {
      setLocating(false)
    }
  }

  // ===== 3D =====
  const [tilt3d, setTilt3d] = useState(false)

  // ===== Пролёт по маршруту =====
  const [flying, setFlying] = useState(false)
  const stopFlyRef = useRef<(() => void) | null>(null)
  const activeRoute = pick(routes[activeMode])
  const onFly = () => {
    if (flying) {
      stopFlyRef.current?.()
      return
    }
    if (!activeRoute || !apiRef.current?.flyAlong) return
    setFlying(true)
    if (isMobile) {
      skipRefit.current = true
      setSnap('peek')
    }
    stopFlyRef.current = apiRef.current.flyAlong(activeRoute, () => {
      stopFlyRef.current = null
      setFlying(false)
      setTilt3d(false)
      setTimeout(refit, 950)
    })
  }
  // Сменился маршрут — останавливаем пролёт
  useEffect(() => () => stopFlyRef.current?.(), [activeRoute])

  const mapProps = {
    waypoints,
    routes: mapRoutes,
    alternatives,
    activeMode,
    padding,
    dark,
    fitKey: planner.fitKey,
    focus,
    me,
    tilt3d,
    onMapClick: planner.setNextFromCoord,
    onMarkerDrag: planner.setPointFromCoord,
    onSelectAlternative: (idx: number) => planner.setAlternative(activeMode, idx),
    onCenterChange: setCenter,
    onReady: (api: MapApi) => (apiRef.current = api),
    onStyleError: () =>
      toast.show({ kind: 'error', title: 'Не удалось загрузить карту', message: 'Проверьте подключение к интернету.' }),
  }

  const panel = (
    <RoutePanel
      planner={planner}
      near={center}
      onStep={onStep}
      onEditingChange={onEditingChange}
      compactHeader={isMobile}
      flying={flying}
      canFly={!isGoogle}
      onFly={onFly}
    />
  )
  const festive = winter && NEW_YEAR

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Карта */}
      <div className="absolute inset-0">
        {isGoogle ? (
          <Suspense fallback={<div className="skeleton absolute inset-0 !rounded-none" />}>
            <GoogleMapView {...mapProps} />
          </Suspense>
        ) : (
          <MapView {...mapProps} layer={safeLayer as Exclude<LayerId, 'google'>} winter={winter} />
        )}
      </div>

      {/* Снегопад зимнего режима — над картой, под панелями */}
      <AnimatePresence>
        {winter && (
          <motion.div
            key="snow"
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Snowfall dark={dark || safeLayer !== 'osm'} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Правые кнопки */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="absolute top-3 right-3 z-20 flex flex-col gap-2 md:top-4 md:right-4"
      >
        <LayerSwitcher value={safeLayer} onChange={setLayer} />
        <ThemeToggle dark={dark} onToggle={toggle} />
        <WinterToggle on={winter} onToggle={toggleWinter} />
        {!isGoogle && <TiltToggle on={tilt3d} onToggle={() => setTilt3d((t) => !t)} />}
        <LocateButton active={!!me} busy={locating} onClick={locateMe} />
      </motion.div>

      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="absolute right-4 bottom-16 z-20"
        >
          <ZoomControls
            onIn={() => apiRef.current?.zoomIn()}
            onOut={() => apiRef.current?.zoomOut()}
            onFit={hasRoute ? planner.refit : undefined}
          />
        </motion.div>
      )}

      {/* Панель маршрута */}
      <AnimatePresence>
        {isMobile ? (
          <BottomSheet
            key="sheet"
            snap={snap}
            onSnapChange={setSnap}
            onVisibleHeight={setSheetH}
            peek={MOBILE_PEEK}
            header={
              <>
                <SnowCap show={winter} className="-top-[9px] right-8 left-8 w-[calc(100%-4rem)]" />
                <Garland show={festive} className="top-1 right-6 left-6" />
                <MobileHeader canReset={planner.points.length > 0} onReset={planner.clearAll} />
              </>
            }
          >
            {panel}
          </BottomSheet>
        ) : (
          <motion.aside
            key="side"
            initial={{ opacity: 0, x: -24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="glass absolute top-4 left-4 z-20 flex max-h-[calc(100%-2rem)] flex-col rounded-[28px]"
            style={{ width: PANEL_W }}
          >
            <SnowCap show={winter} className="-top-[9px] right-6 left-6 w-[calc(100%-3rem)]" />
            <Garland show={festive} className="-top-1 right-5 left-5" />
            <div className="flex min-h-0 flex-1 flex-col">{panel}</div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

function MobileHeader({ canReset, onReset }: { canReset: boolean; onReset(): void }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <h1 className="text-[17px] font-extrabold tracking-[-0.02em]">Маршрут</h1>
      {canReset && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onReset}
          className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-[var(--muted)] hover:bg-[var(--hover)]"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
