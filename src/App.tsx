import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, type Snap } from './components/BottomSheet'
import { LayerSwitcher } from './components/LayerSwitcher'
import { ThemeToggle, ZoomControls } from './components/MapButtons'
import { RoutePanel } from './components/RoutePanel'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useRoutePlanner } from './hooks/useRoutePlanner'
import { useTheme } from './hooks/useTheme'
import MapView from './map/MapView'
import { LAYERS, type LayerId } from './map/styles'
import type { MapApi, MapPadding } from './map/types'
import type { LngLat, Route, TravelMode } from './services/types'

const GoogleMapView = lazy(() => import('./map/GoogleMapView'))

const PANEL_W = 400
const MOBILE_PEEK = 208

export default function App() {
  const { dark, toggle } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const planner = useRoutePlanner()
  const { points, routes, activeMode } = planner

  // Слой карты: «Схема» и «Тёмная» следуют за темой приложения
  const [layer, setLayer] = useState<LayerId>(() => (dark ? 'dark' : 'osm'))
  useEffect(() => {
    setLayer((l) => (l === 'osm' && dark ? 'dark' : l === 'dark' && !dark ? 'osm' : l))
  }, [dark])
  const safeLayer: LayerId = LAYERS.some((l) => l.id === layer) ? layer : 'osm'

  // Шторка на мобильных
  const [snap, setSnap] = useState<Snap>('peek')
  const [sheetH, setSheetH] = useState(MOBILE_PEEK)
  const hasRoute = routes.car.status === 'ok' || routes.foot.status === 'ok'
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

  const mapRoutes = useMemo(() => {
    const r: Partial<Record<TravelMode, Route>> = {}
    if (routes.foot.route) r.foot = routes.foot.route
    if (routes.car.route) r.car = routes.car.route
    return r
  }, [routes])

  const onMapClick = useCallback(
    (coord: LngLat) => {
      const target = !points.from ? 'from' : 'to'
      planner.setPointFromCoord(target, coord)
    },
    [points.from, planner],
  )

  const onStep = useCallback(
    (coord: LngLat) => {
      setFocus({ coord, key: Date.now() })
      if (isMobile) setSnap('peek')
    },
    [isMobile],
  )

  const mapProps = {
    from: points.from?.coord ?? null,
    to: points.to?.coord ?? null,
    routes: mapRoutes,
    activeMode,
    padding,
    dark,
    fitKey: planner.fitKey,
    focus,
    onMapClick,
    onMarkerDrag: planner.setPointFromCoord,
    onCenterChange: setCenter,
    onReady: (api: MapApi) => (apiRef.current = api),
  }

  const panel = (
    <RoutePanel
      planner={planner}
      near={center}
      onStep={onStep}
      onEditingChange={onEditingChange}
      compactHeader={isMobile}
    />
  )

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Карта */}
      <div className="absolute inset-0">
        {safeLayer === 'google' ? (
          <Suspense fallback={<div className="skeleton absolute inset-0 !rounded-none" />}>
            <GoogleMapView {...mapProps} />
          </Suspense>
        ) : (
          <MapView {...mapProps} layer={safeLayer} />
        )}
      </div>

      {/* Правые кнопки */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="absolute top-3 right-3 z-20 flex flex-col gap-2 md:top-4 md:right-4"
      >
        <LayerSwitcher value={safeLayer} onChange={setLayer} />
        <ThemeToggle dark={dark} onToggle={toggle} />
      </motion.div>

      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="absolute right-4 bottom-12 z-20"
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
            header={<MobileHeader canReset={!!(points.from || points.to)} onReset={planner.clearAll} />}
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
