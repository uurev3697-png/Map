import { animate, motion, useDragControls, useMotionValue, type PanInfo } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export type Snap = 'peek' | 'half' | 'full'

interface Props {
  snap: Snap
  onSnapChange(s: Snap): void
  /** Видимая высота шторки после доводки — для отступов карты */
  onVisibleHeight?(h: number): void
  peek: number
  header?: ReactNode
  children: ReactNode
}

function useViewportHeight() {
  const [h, setH] = useState(() => window.innerHeight)
  useEffect(() => {
    const on = () => setH(window.visualViewport?.height ?? window.innerHeight)
    window.addEventListener('resize', on)
    window.visualViewport?.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      window.visualViewport?.removeEventListener('resize', on)
    }
  }, [])
  return h
}

/**
 * Нижняя шторка со свайпом и тремя положениями: свернута / половина / развернута.
 */
export function BottomSheet({ snap, onSnapChange, onVisibleHeight, peek, header, children }: Props) {
  const vh = useViewportHeight()
  const sheetH = Math.round(vh - 12)
  const positions: Record<Snap, number> = {
    full: 0,
    half: Math.max(0, sheetH - Math.round(vh * 0.55)),
    peek: Math.max(0, sheetH - peek),
  }
  const y = useMotionValue(positions[snap])
  const controls = useDragControls()
  const [visible, setVisible] = useState(sheetH - positions[snap])
  const headRef = useRef<HTMLDivElement>(null)
  const [headH, setHeadH] = useState(40)
  useLayoutEffect(() => {
    const el = headRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const settle = useCallback(
    (s: Snap) => {
      const target = positions[s]
      animate(y, target, { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 })
      setVisible(sheetH - target)
      onVisibleHeight?.(sheetH - target)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheetH, peek],
  )

  useLayoutEffect(() => settle(snap), [snap, settle])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * 0.18
    const order: Snap[] = ['full', 'half', 'peek']
    let best: Snap = snap
    let dist = Infinity
    for (const s of order) {
      const d = Math.abs(positions[s] - projected)
      if (d < dist) {
        dist = d
        best = s
      }
    }
    if (best === snap) settle(snap)
    else onSnapChange(best)
  }

  return (
    <motion.div
      className="glass fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] !border-b-0"
      style={{ y, height: sheetH }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: positions.peek }}
      dragElastic={{ top: 0.05, bottom: 0.15 }}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div
        ref={headRef}
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
      >
        <button
          type="button"
          onClick={() => onSnapChange(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half')}
          className="mx-auto block px-8 pt-2.5 pb-2"
          aria-label={snap === 'full' ? 'Свернуть панель' : 'Развернуть панель'}
        >
          <span className="block h-[5px] w-10 rounded-full bg-[var(--border-strong)]" />
        </button>
        {header}
      </div>
      <div className="min-h-0 flex-1" style={{ maxHeight: Math.max(0, visible - headH) }}>
        {children}
      </div>
    </motion.div>
  )
}
