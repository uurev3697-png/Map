import { PhotonProvider } from './photon'
import type { GeocodingProvider } from './types'

export type { GeocodingProvider }

/** Активный геокодер. Заменяемый: Nominatim, Google Geocoding и т.д. */
export const geocoder: GeocodingProvider = new PhotonProvider()
