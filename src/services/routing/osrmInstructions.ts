import type { ManeuverKind } from '../types'

export interface OsrmManeuver {
  type: string
  modifier?: string
  exit?: number
  location?: [number, number]
}

const DIR: Record<string, string> = {
  left: 'налево',
  right: 'направо',
  'slight left': 'плавно налево',
  'slight right': 'плавно направо',
  'sharp left': 'резко налево',
  'sharp right': 'резко направо',
  straight: 'прямо',
  uturn: 'на разворот',
}

const SIDE: Record<string, string> = {
  left: 'левее', 'slight left': 'левее', 'sharp left': 'левее',
  right: 'правее', 'slight right': 'правее', 'sharp right': 'правее',
  straight: 'прямо',
}

export function osrmKind(m: OsrmManeuver): ManeuverKind {
  if (m.type === 'depart') return 'depart'
  if (m.type === 'arrive') return 'arrive'
  if (m.type.includes('roundabout') || m.type === 'rotary') return 'roundabout'
  if (m.type === 'merge') return 'merge'
  if (m.type === 'fork') return 'fork'
  switch (m.modifier) {
    case 'left': return 'left'
    case 'right': return 'right'
    case 'slight left': return 'slight-left'
    case 'slight right': return 'slight-right'
    case 'sharp left': return 'sharp-left'
    case 'sharp right': return 'sharp-right'
    case 'uturn': return 'uturn'
    case 'straight': return 'straight'
  }
  return 'other'
}

/** Русская формулировка манёвра OSRM. Название улицы добавляется отдельно. */
export function osrmInstruction(m: OsrmManeuver, name: string): string {
  const on = name ? ` на ${name}` : ''
  const along = name ? ` по ${name}` : ''
  const dir = m.modifier ? DIR[m.modifier] : undefined

  switch (m.type) {
    case 'depart':
      return `Начните движение${along}`
    case 'arrive':
      return 'Вы прибыли в пункт назначения'
    case 'roundabout':
    case 'rotary':
      return m.exit
        ? `На круговом движении выполните ${m.exit}-й съезд${on}`
        : `Проедьте круговое движение${on}`
    case 'roundabout turn':
      return `На круговом движении поверните ${dir ?? ''}${on}`.replace('  ', ' ')
    case 'exit roundabout':
    case 'exit rotary':
      return `Покиньте круговое движение${on}`
    case 'fork':
      return `На развилке держитесь ${SIDE[m.modifier ?? ''] ?? 'прямо'}${on}`
    case 'merge':
      return `Перестройтесь ${SIDE[m.modifier ?? ''] ?? ''}${on}`.replace('  ', ' ')
    case 'on ramp':
      return `Въезд${on}${dir && m.modifier !== 'straight' ? `, ${dir}` : ''}`
    case 'off ramp':
      return `Съезд${on}${dir && m.modifier !== 'straight' ? `, ${dir}` : ''}`
    case 'end of road':
      return `В конце дороги поверните ${dir ?? ''}${on}`.replace('  ', ' ')
    case 'continue':
    case 'new name':
      if (!m.modifier || m.modifier === 'straight') return `Продолжайте прямо${along}`
      if (m.modifier === 'uturn') return `Развернитесь${on}`
      return `Держитесь ${SIDE[m.modifier] ?? dir}${along}`
    case 'turn':
    default:
      if (m.modifier === 'uturn') return `Развернитесь${on}`
      if (m.modifier === 'straight') return `Продолжайте прямо${along}`
      return dir ? `Поверните ${dir}${on}` : `Продолжайте${along}`
  }
}
