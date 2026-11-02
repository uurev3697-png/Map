import type { SVGProps } from 'react'
import type { ManeuverKind } from '../services/types'

type P = SVGProps<SVGSVGElement>

function Svg({ children, className = 'size-[18px]', ...rest }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconClose = (p: P) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>
export const IconAlert = (p: P) => <Svg {...p}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></Svg>
export const IconSwap = (p: P) => <Svg {...p}><path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4m0 16-3.5-3.5M17 20l3.5-3.5" /></Svg>
export const IconLocate = (p: P) => <Svg {...p}><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></Svg>
export const IconNavigation = (p: P) => <Svg {...p}><path d="M3 11 21 3l-8 18-2-8-8-2Z" /></Svg>
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
export const IconPin = (p: P) => <Svg {...p}><path d="M12 21s-7-6.1-7-11.5a7 7 0 1 1 14 0C19 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>
export const IconLayers = (p: P) => <Svg {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></Svg>
export const IconSun = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
export const IconMoon = (p: P) => <Svg {...p}><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" /></Svg>
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconMinus = (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>
export const IconChevron = (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconRoute = (p: P) => <Svg {...p}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5" /></Svg>

export const IconWalk = (p: P) => (
  <Svg {...p}>
    <circle cx="13" cy="4" r="1.8" />
    <path d="m9 21 2.5-6.5L14 17v4M8.5 11.5 10 8l3-1 2.5 3 3 1.5M10 8l1.5 6.5" />
  </Svg>
)
export const IconCar = (p: P) => (
  <Svg {...p}>
    <path d="M5 16.5V12l1.8-4.7A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.3L19 12v4.5" />
    <path d="M3.5 12.5h17v4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-4Z" />
    <path d="M6 17.5V19M18 17.5V19M7 14.5h1.5M15.5 14.5H17" />
  </Svg>
)

/** Иконка манёвра в пошаговых инструкциях */
export function ManeuverIcon({ kind, className = 'size-[18px]' }: { kind: ManeuverKind; className?: string }) {
  switch (kind) {
    case 'depart':
      return <Svg className={className}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="8" /></Svg>
    case 'arrive':
      return <Svg className={className}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Svg>
    case 'roundabout':
      return <Svg className={className}><circle cx="12" cy="10" r="4" /><path d="M12 14v7M16 10h4M20 10l-2-2M20 10l-2 2" /></Svg>
    case 'uturn':
      return <Svg className={className}><path d="M8 20V9a4 4 0 0 1 8 0v4M13 10l3 3 3-3" /></Svg>
    case 'fork':
    case 'merge':
      return <Svg className={className}><path d="M12 21v-7M12 14 6 6M12 14l6-8M6 6v4M6 6h4M18 6v4M18 6h-4" /></Svg>
    case 'other':
    case 'straight':
      return <Svg className={className}><path d="M12 20V4M6 10l6-6 6 6" /></Svg>
  }
  const paths: Record<string, string> = {
    left: 'M15 21v-7a5 5 0 0 0-5-5H5M8 6 5 9l3 3',
    right: 'M9 21v-7a5 5 0 0 1 5-5h5M16 6l3 3-3 3',
    'slight-left': 'M14 21v-6L8 7M8 7v4.5M8 7h4.5',
    'slight-right': 'M10 21v-6l6-8M16 7v4.5M16 7h-4.5',
    'sharp-left': 'M15 21V8l-8 8M7 16v-5M7 16h5',
    'sharp-right': 'M9 21V8l8 8M17 16v-5M17 16h-5',
  }
  return (
    <Svg className={className}>
      <path d={paths[kind] ?? 'M12 20V4M6 10l6-6 6 6'} />
    </Svg>
  )
}
