import type { StyleSpecification } from 'maplibre-gl'
import { buildVectorStyle } from './mapTheme'

export type LayerId = 'osm' | 'satellite' | 'dark' | 'google'

export interface MapLayerOption {
  id: LayerId
  label: string
  /** Цвета превью-плитки в переключателе */
  preview: string
}

export const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || ''
export const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || ''

export const LAYERS: MapLayerOption[] = [
  { id: 'osm', label: 'Схема', preview: 'linear-gradient(135deg,#eef0e6 0%,#f7f3ea 45%,#c9dff2 46%,#c9dff2 60%,#e8ead9 61%)' },
  { id: 'satellite', label: 'Спутник', preview: 'linear-gradient(135deg,#2f4a2a 0%,#4f6b3a 40%,#2b4660 41%,#1d3348 70%,#56603f 71%)' },
  { id: 'dark', label: 'Тёмная', preview: 'linear-gradient(135deg,#2a303c 0%,#3a414f 45%,#1d3a57 46%,#1d3a57 60%,#2b3d36 61%)' },
  ...(GOOGLE_KEY
    ? [{ id: 'google' as const, label: 'Google', preview: 'linear-gradient(135deg,#e8f0e2 0%,#f5f5f5 45%,#aadaff 46%,#aadaff 60%,#fde293 61%)' }]
    : []),
]

const SATELLITE: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'esri-imagery', type: 'raster', source: 'esri' },
    { id: 'esri-labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.9 } },
  ],
}

/** Стиль MapLibre для слоя с учётом зимнего режима. */
export async function styleFor(id: Exclude<LayerId, 'google'>, winter: boolean): Promise<StyleSpecification> {
  switch (id) {
    case 'osm':
      return buildVectorStyle({ night: false, winter })
    case 'dark':
      return buildVectorStyle({ night: true, winter })
    case 'satellite':
      return SATELLITE
  }
}

/** Цвета маршрутов (используются и в MapLibre, и в Google) */
export const ROUTE_COLORS = {
  car: { from: '#6366f1', to: '#8b5cf6', casing: '#ffffff', casingDark: '#0b0d12' },
  foot: { from: '#16b364', to: '#0e9384', casing: '#ffffff', casingDark: '#0b0d12' },
  inactive: '#64748b',
} as const
