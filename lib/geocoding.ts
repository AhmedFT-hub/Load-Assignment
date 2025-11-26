/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 * Converts city names to lat/lng coordinates
 */

const GEOCODER_BASE_URL = process.env.GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org'

export interface GeocodeResult {
  lat: number
  lng: number
  displayName?: string
}

interface NominatimResponse {
  lat: string
  lon: string
  display_name: string
}

/**
 * Geocode a city name to coordinates
 * @param cityName - The city name to geocode
 * @returns Promise with lat/lng coordinates
 */
export async function geocodeCity(cityName: string): Promise<GeocodeResult> {
  if (!cityName || cityName.trim().length === 0) {
    throw new Error('City name is required')
  }

  const params = new URLSearchParams({
    q: cityName,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  })

  const url = `${GEOCODER_BASE_URL}/search?${params.toString()}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LoadAssignmentAgent/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`)
    }

    const data: NominatimResponse[] = await response.json()

    if (!data || data.length === 0) {
      throw new Error(`Could not find coordinates for city: ${cityName}`)
    }

    const result = data[0]
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Geocoding error for "${cityName}": ${error.message}`)
    }
    throw new Error(`Geocoding error for "${cityName}": Unknown error`)
  }
}

/**
 * Add a small delay to respect rate limits
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Geocode multiple cities with rate limiting
 * @param cityNames - Array of city names
 * @param delayMs - Delay between requests (default 1000ms)
 */
export async function geocodeCities(
  cityNames: string[],
  delayMs: number = 1000
): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = []
  
  for (const cityName of cityNames) {
    const result = await geocodeCity(cityName)
    results.push(result)
    
    // Add delay between requests to respect rate limits
    if (cityNames.indexOf(cityName) < cityNames.length - 1) {
      await delay(delayMs)
    }
  }
  
  return results
}


