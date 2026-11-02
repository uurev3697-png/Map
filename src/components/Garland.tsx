import { AnimatePresence, motion } from 'framer-motion'

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899']
const N = 13

/** Новогодняя гирлянда по верхней кромке панели: провод с мигающими лампочками. */
export function Garland({ show, className = '' }: { show: boolean; className?: string }) {
  // Провод провисает дугами между «крючками»
  const hooks = 4
  const seg = 100 / hooks
  const wire = Array.from({ length: hooks }, (_, i) => {
    const x0 = i * seg
    return `${i ? '' : 'M0,2 '}Q${x0 + seg / 2},12 ${x0 + seg},2`
  }).join(' ')
  // y провода в точке x (для лампочек)
  const yAt = (x: number) => {
    const t = (x % seg) / seg
    return 2 + 20 * t * (1 - t) // квадратичная кривая Безье с контрольной точкой посередине
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="garland"
          aria-hidden
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5 }}
          className={'pointer-events-none absolute z-20 h-6 ' + className}
        >
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <path d={wire} fill="none" stroke="#3f4a3a" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
          {Array.from({ length: N }, (_, i) => {
            const x = ((i + 0.5) / N) * 100
            const color = COLORS[i % COLORS.length]
            return (
              <span
                key={i}
                className="garland-bulb absolute"
                style={{
                  left: `${x}%`,
                  top: `${(yAt(x) / 20) * 100}%`,
                  ['--c' as string]: color,
                  animationDelay: `${(i % 3) * 0.5}s`,
                }}
              />
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
