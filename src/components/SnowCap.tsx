import { AnimatePresence, motion } from 'framer-motion'

/** Снежная «шапка» на верхней кромке панели — деталь зимнего режима. */
export function SnowCap({ show, className = '' }: { show: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.svg
          key="cap"
          aria-hidden
          viewBox="0 0 200 16"
          preserveAspectRatio="none"
          initial={{ opacity: 0, y: -6, scaleY: 0.4 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -4, scaleY: 0.4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ transformOrigin: 'bottom', filter: 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.18))' }}
          className={'pointer-events-none absolute z-10 h-[14px] ' + className}
        >
          <path
            fill="var(--snow)"
            d="M0 16 C3 7 12 4 21 8 C29 2 43 1 52 7 C61 3 72 4 79 9 C90 2 107 2 116 8 C125 1 140 3 148 8 C157 3 171 3 180 8 C188 5 197 7 200 16 Z
               M60 15 q2 5 4 0 Z M131 15 q2 6 4 0 Z M168 15 q1.5 4 3 0 Z"
          />
        </motion.svg>
      )}
    </AnimatePresence>
  )
}
