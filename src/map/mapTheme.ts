import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'

/**
 * Палитры векторной карты. Берём стиль OpenFreeMap «liberty» и перекрашиваем слои:
 *  - ночь — спокойная тёмно-синяя палитра в духе 2ГИС (не «чёрная дыра»):
 *    читаемые дороги и здания, контрастные подписи;
 *  - зима — заснеженная земля, парки и леса, ледяная вода (днём и ночью).
 */

const BASE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export interface MapVariant {
  night: boolean
  winter: boolean
}

type Role =
  | 'background' | 'residential' | 'park' | 'parkOutline' | 'wood' | 'grass' | 'ice' | 'sand'
  | 'pitch' | 'cemetery' | 'hospital' | 'school' | 'water' | 'waterway' | 'aeroway' | 'runway'
  | 'building' | 'buildingOutline' | 'casingMinor' | 'casingMajor' | 'path' | 'roadMinor' | 'roadService'
  | 'roadSecondary' | 'roadPrimary' | 'roadMotorway' | 'rail' | 'boundary'

type Palette = Partial<Record<Role, string>>

interface LabelColors {
  place: string
  placeMinor: string
  halo: string
  poi: string
  road: string
  water: string
  waterHalo: string
}

const NIGHT: Palette = {
  background: '#2a303c',
  residential: 'rgba(52,59,73,0.75)',
  park: '#2b3d36',
  parkOutline: 'rgba(72,112,90,0.45)',
  wood: 'rgba(43,64,55,0.85)',
  grass: '#2d3f37',
  ice: '#3a4352',
  sand: '#3b3b38',
  pitch: '#2f4039',
  cemetery: '#2f3d37',
  hospital: '#3d3440',
  school: '#363a40',
  water: '#1d3a57',
  waterway: '#2b5378',
  aeroway: '#333a47',
  runway: '#4a5160',
  building: '#3a414f',
  buildingOutline: '#4b5363',
  casingMinor: '#262b35',
  casingMajor: '#232831',
  path: '#535b6a',
  roadMinor: '#4a5263',
  roadService: '#434a59',
  roadSecondary: '#5f6878',
  roadPrimary: '#7b7564',
  roadMotorway: '#8f7c58',
  rail: '#5b6372',
  boundary: '#7a8494',
}

const NIGHT_LABELS: LabelColors = {
  place: '#e9edf3',
  placeMinor: '#c4cbd6',
  halo: 'rgba(30,35,45,0.9)',
  poi: '#aeb6c3',
  road: '#bcc4cf',
  water: '#86acd6',
  waterHalo: 'rgba(29,58,87,0.85)',
}

const WINTER_DAY: Palette = {
  background: '#f3f6f9',
  residential: 'rgba(226,232,240,0.65)',
  park: '#e5eef4',
  parkOutline: 'rgba(205,220,232,1)',
  wood: 'rgba(212,226,236,0.9)',
  grass: '#e8f0f5',
  ice: '#eef4f8',
  sand: '#eef0f2',
  pitch: '#e2eaf0',
  cemetery: '#e3eaf0',
  school: '#edf0f3',
  water: '#b4d1ea',
  waterway: '#a6c8e6',
  building: '#e1e7ee',
  buildingOutline: '#cdd6e0',
  aeroway: '#eaeef2',
}

const WINTER_NIGHT: Palette = {
  ...NIGHT,
  background: '#2f3644',
  residential: 'rgba(60,68,83,0.75)',
  park: '#3a4555',
  parkOutline: 'rgba(110,128,150,0.4)',
  wood: 'rgba(66,78,95,0.9)',
  grass: '#3c4657',
  pitch: '#3b4555',
  cemetery: '#3a4453',
  water: '#22405f',
  waterway: '#305a80',
  building: '#424a5a',
  buildingOutline: '#555e70',
}

function roleOf(id: string): Role | undefined {
  if (id === 'background') return 'background'
  if (id === 'landuse_residential') return 'residential'
  if (id === 'park') return 'park'
  if (id === 'park_outline') return 'parkOutline'
  if (id === 'landcover_wood') return 'wood'
  if (id === 'landcover_grass') return 'grass'
  if (id === 'landcover_ice') return 'ice'
  if (id === 'landcover_sand') return 'sand'
  if (id === 'landuse_pitch' || id === 'landuse_track') return 'pitch'
  if (id === 'landuse_cemetery') return 'cemetery'
  if (id === 'landuse_hospital') return 'hospital'
  if (id === 'landuse_school') return 'school'
  if (id === 'water') return 'water'
  if (id.startsWith('waterway_') && !id.includes('label')) return 'waterway'
  if (id === 'aeroway_fill') return 'aeroway'
  if (id.startsWith('aeroway_')) return 'runway'
  if (id === 'building' || id === 'building-3d') return 'building'
  if (id.startsWith('boundary')) return 'boundary'
  if (/^(road|tunnel|bridge)_/.test(id)) {
    if (id.includes('rail')) return 'rail'
    if (id.includes('casing')) {
      return /minor|street|service|path/.test(id) ? 'casingMinor' : 'casingMajor'
    }
    if (id.includes('path_pedestrian')) return 'path'
    if (id.includes('service_track')) return 'roadService'
    if (id.includes('minor') || id.includes('street')) return 'roadMinor'
    if (id.includes('motorway')) return 'roadMotorway'
    if (id.includes('trunk_primary')) return 'roadPrimary'
    if (id.includes('secondary') || id.includes('link')) return 'roadSecondary'
  }
  return undefined
}

function recolor(layer: LayerSpecification, pal: Palette) {
  const role = roleOf(layer.id)
  if (!role) return
  const color = pal[role]
  if (!color) return
  const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {})
  switch (layer.type) {
    case 'background':
      paint['background-color'] = color
      break
    case 'fill':
      paint['fill-color'] = color
      if (role === 'building' && pal.buildingOutline) paint['fill-outline-color'] = pal.buildingOutline
      if (role === 'park' && pal.parkOutline) paint['fill-outline-color'] = pal.parkOutline
      delete paint['fill-pattern']
      break
    case 'fill-extrusion':
      paint['fill-extrusion-color'] = color
      break
    case 'line':
      paint['line-color'] = color
      break
  }
}

function recolorLabel(layer: LayerSpecification, c: LabelColors) {
  if (layer.type !== 'symbol') return
  const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {})
  const id = layer.id
  let text = c.poi
  let halo = c.halo
  if (id.startsWith('label_')) text = /city|country|state|town/.test(id) ? c.place : c.placeMinor
  else if (id.includes('water')) {
    text = c.water
    halo = c.waterHalo
  } else if (id.startsWith('highway-name')) text = c.road
  else if (id === 'poi_transit') text = '#8fb4e0'
  paint['text-color'] = text
  paint['text-halo-color'] = halo
  if (paint['text-halo-width'] === undefined) paint['text-halo-width'] = 1.2
}

let basePromise: Promise<StyleSpecification> | null = null

function loadBase(): Promise<StyleSpecification> {
  basePromise ??= fetch(BASE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<StyleSpecification>
    })
    .catch((e) => {
      basePromise = null // позволим повторить попытку
      throw e
    })
  return basePromise
}

/** Готовый стиль для слоёв «Схема» / «Тёмная» с учётом зимнего режима. */
export async function buildVectorStyle(v: MapVariant): Promise<StyleSpecification> {
  const style = structuredClone(await loadBase())
  const pal = v.night ? (v.winter ? WINTER_NIGHT : NIGHT) : v.winter ? WINTER_DAY : null
  for (const layer of style.layers) {
    if (pal) recolor(layer, pal)
    if (v.night) recolorLabel(layer, NIGHT_LABELS)
    // Штриховка пешеходных зон ночью слишком яркая — приглушаем
    if (v.night && layer.id === 'road_area_pattern') {
      const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {})
      paint['fill-opacity'] = 0.08
    }
    // Рельеф Natural Earth на мелких масштабах ночью приглушаем, зимой — высветляем
    if (layer.type === 'raster') {
      const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {})
      if (v.night) paint['raster-brightness-max'] = 0.35
      else if (v.winter) paint['raster-saturation'] = -0.8
    }
  }
  return style
}
