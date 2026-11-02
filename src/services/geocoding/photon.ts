import { request } from '../errors'
import type { LngLat, Place } from '../types'
import type { GeocodingProvider } from './types'

/**
 * Photon (Komoot) — геокодер на данных OSM, рассчитанный на автодополнение.
 * https://photon.komoot.io — публичный инстанс, используйте бережно:
 * запросы идут с debounce и отменой устаревших.
 * lang=default — названия на местном языке (для России — по-русски).
 */
const BASE = 'https://photon.komoot.io'

interface PhotonFeature {
  geometry: { coordinates: LngLat }
  properties: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    housenumber?: string
    city?: string
    district?: string
    locality?: string
    state?: string
    country?: string
    postcode?: string
  }
}

function toPlace(f: PhotonFeature): Place {
  const p = f.properties
  const street = [p.street, p.housenumber].filter(Boolean).join(', ')
  const name = p.name || street || p.city || p.state || 'Без названия'
  const parts = [p.name && street ? street : undefined, p.district ?? p.locality, p.city, p.state, p.country]
  const description = [...new Set(parts.filter((x): x is string => !!x && x !== name))].join(', ')
  return {
    id: `${p.osm_type ?? ''}${p.osm_id ?? f.geometry.coordinates.join(',')}`,
    name,
    description,
    coord: [f.geometry.coordinates[0], f.geometry.coordinates[1]],
  }
}

export class PhotonProvider implements GeocodingProvider {
  readonly id = 'photon'
  readonly name = 'Photon'

  async search(query: string, opts: { near?: LngLat; signal?: AbortSignal; limit?: number } = {}): Promise<Place[]> {
    const params = new URLSearchParams({ q: query, limit: String(opts.limit ?? 6), lang: 'default' })
    if (opts.near) {
      params.set('lon', opts.near[0].toFixed(4))
      params.set('lat', opts.near[1].toFixed(4))
    }
    const data = await request<{ features: PhotonFeature[] }>(`${BASE}/api/?${params}`, { signal: opts.signal })
    const seen = new Set<string>()
    return data.features.map(toPlace).filter((p) => {
      const key = p.name + '|' + p.description
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async reverse(coord: LngLat, signal?: AbortSignal): Promise<Place | null> {
    const params = new URLSearchParams({ lon: String(coord[0]), lat: String(coord[1]), lang: 'default', limit: '1' })
    const data = await request<{ features: PhotonFeature[] }>(`${BASE}/reverse?${params}`, { signal })
    const f = data.features[0]
    if (!f) return null
    // Сохраняем точную точку клика, адрес — только подпись
    return { ...toPlace(f), coord }
  }
}
