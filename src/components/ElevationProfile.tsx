import { motion } from 'framer-motion'
import { useEffect, useId, useMemo, useState } from 'react'
import { formatDistance } from '../lib/format'
import { isAbort } from '../services/errors'
import { getElevationProfile, type ElevationProfile as Profile } from '../services/elevation'
import type { Route } from '../services/types'
import { ROUTE_COLORS } from '../map/styles'
import { IconMountain } from './icons'
import { Skeleton } from './Skeleton'

const W = 320
const H = 72

/** Профиль высот маршрута (Open-Meteo Elevation API) с подъёмами и спусками. */
export function ElevationProfile({ route }: { route: Route }) {
  const [state, setState] = useState<{ route: Route; profile?: Profile; error?: boolean } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')

  useEffect(() => {
    const ctl = new AbortController()
    getElevationProfile(route.geometry, ctl.signal)
      .then((profile) => setState({ route, profile }))
      .catch((e) => !isAbort(e) && setState({ route, error: true }))
    return () => ctl.abort()
  }, [route])

  const p = state?.route === route ? state.profile : undefined
  const failed = state?.route === route && state.error
  const c = ROUTE_COLORS[route.mode]

  const path = useMemo(() => {
    if (!p) return null
    const span = Math.max(10, p.max - p.min)
    const lo = p.min - span * 0.15
    const hi = p.max + span * 0.15
    const total = p.dist[p.dist.length - 1] || 1
    const pts = p.dist.map((d, i) => [(d / total) * W, H - ((p.elev[i] - lo) / (hi - lo)) * H] as const)
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    return { line, area: `${line} L${W},${H} L0,${H} Z`, pts }
  }, [p])

  if (failed) return null

  return (
    <div className="rounded-[20px] border border-[var(--border)] px-4 pt-3 pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[14px] font-bold">
          <IconMountain className="size-4 text-[var(--muted)]" /> Профиль высот
        </span>
        {p && (
          <span className="tabular flex gap-2.5 text-[12px] font-semibold text-[var(--muted)]">
            <span title="Набор высоты">↗ {Math.round(p.ascent)} м</span>
            <span title="Спуск">↘ {Math.round(p.descent)} м</span>
          </span>
        )}
      </div>
      {!p || !path ? (
        <Skeleton className="mt-3 h-[72px] w-full" />
      ) : (
        <div className="relative mt-2">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-[72px] w-full overflow-visible"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const x = ((e.clientX - r.left) / r.width) * W
              let best = 0
              path.pts.forEach(([px], i) => Math.abs(px - x) < Math.abs(path.pts[best][0] - x) && (best = i))
              setHover(best)
            }}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`elev-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c.from} stopOpacity="0.45" />
                <stop offset="1" stopColor={c.to} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <motion.path
              d={path.area}
              fill={`url(#elev-${gid})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            <motion.path
              d={path.line}
              fill="none"
              stroke={c.from}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {hover !== null && (
              <line
                x1={path.pts[hover][0]}
                x2={path.pts[hover][0]}
                y1={0}
                y2={H}
                stroke="var(--muted)"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {hover !== null && (
            <div
              className="tabular pointer-events-none absolute -top-1 rounded-lg bg-[var(--panel-solid)] px-1.5 py-0.5 text-[11px] font-bold shadow-md"
              style={{
                left: `${(path.pts[hover][0] / W) * 100}%`,
                transform: `translateX(${path.pts[hover][0] > W * 0.7 ? '-105%' : '5%'})`,
              }}
            >
              {Math.round(p.elev[hover])} м · {formatDistance(p.dist[hover])}
            </div>
          )}
          <div className="tabular mt-1 flex justify-between text-[10.5px] text-[var(--subtle)]">
            <span>{Math.round(p.min)} м</span>
            <span>{Math.round(p.max)} м</span>
          </div>
        </div>
      )}
    </div>
  )
}
