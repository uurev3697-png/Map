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
    case 'waypoint':
      return <Svg className={className}><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2" fill="currentColor" /></Svg>
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

export const IconSnowflake = (p: P) => (
  <Svg {...p}>
    <path d="M12 2v20M4.2 6.5l15.6 9M4.2 17.5l15.6-9" />
    <path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2M3.6 9.9l3.2-.6-1-3M18.2 17.7l-1-3 3.2-.6M3.6 14.1l3.2.6-1 3M18.2 6.3l-1 3 3.2.6" />
  </Svg>
)

export const IconGrip = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="18" r="1" fill="currentColor" />
    <circle cx="15" cy="6" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="18" r="1" fill="currentColor" />
  </Svg>
)
export const IconBike = (p: P) => (
  <Svg {...p}>
    <circle cx="5.5" cy="16.5" r="3.5" />
    <circle cx="18.5" cy="16.5" r="3.5" />
    <path d="M5.5 16.5 9 9h6l3.5 7.5M9 9l3 7.5h-6.5M15 9l-1.5-3H11M12 16.5 15 9" />
  </Svg>
)
export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
  </Svg>
)
export const IconPlay = (p: P) => <Svg {...p}><path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" /></Svg>
export const IconStop = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></Svg>
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path
      d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Svg>
)
export const IconHistory = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
    <path d="M3.5 4v4.5H8M12 7.5V12l3 2" />
  </Svg>
)
export const IconCube = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Svg>
)
export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </Svg>
)
export const IconMountain = (p: P) => <Svg {...p}><path d="m3 19 6-10 4 6 2.5-3.5L21 19H3Z" /></Svg>
export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
)

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" />
  </Svg>
)
export const IconBriefcase = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2.5" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" />
  </Svg>
)
export const IconPencil = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></Svg>
export const IconRuler = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 16.5 16.5 3.5l4 4-13 13-4-4Z" />
    <path d="m7 13 2 2M10 10l1.5 1.5M13 7l2 2" />
  </Svg>
)
export const IconUndo = (p: P) => <Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>
export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
  </Svg>
)

export const IconBookmark = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.5L5.5 21V4.5a1 1 0 0 1 1-1Z" fill={filled ? 'currentColor' : 'none'} />
  </Svg>
)
export const IconParking = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5" />
  </Svg>
)
