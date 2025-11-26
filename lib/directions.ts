/**
 * Google Directions API wrapper for server-side route calculations
 */

export interface DirectionsRequest {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

export interface DirectionsResult {
  routes: Array<{
    legs: Array<{
      distance: { value: number; text: string }
      duration: { value: number; text: string }
      start_location: { lat: number; lng: number }
      end_location: { lat: number; lng: number }
      steps: Array<{
        distance: { value: number; text: string }
        duration: { value: number; text: string }
        start_location: { lat: number; lng: number }
        end_location: { lat: number; lng: number }
        polyline: { points: string }
      }>
    }>
    overview_polyline: { points: string }
  }>
}

/**
 * Get directions from Google Directions API
 * @param request - Origin and destination coordinates
 * @returns Promise with directions result
 */
export async function getDirections(
  request: DirectionsRequest
): Promise<DirectionsResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured')
  }

  const { origin, destination } = request
  
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.append('origin', `${origin.lat},${origin.lng}`)
  url.searchParams.append('destination', `${destination.lat},${destination.lng}`)
  url.searchParams.append('key', apiKey)

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Directions API failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
    }

    return data as DirectionsResult
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get directions: ${error.message}`)
    }
    throw new Error('Failed to get directions: Unknown error')
  }
}

/**
 * Decode polyline string to array of lat/lng coordinates
 * @param encoded - Encoded polyline string
 * @returns Array of coordinates
 */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const poly: Array<{ lat: number; lng: number }> = []
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0

  while (index < len) {
    let b: number
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    poly.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    })
  }

  return poly
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat)
  const dLng = toRad(point2.lng - point1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate bearing (heading) between two points
 * @param start - Starting coordinate
 * @param end - Ending coordinate
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const startLat = toRad(start.lat)
  const startLng = toRad(start.lng)
  const endLat = toRad(end.lat)
  const endLng = toRad(end.lng)

  const dLng = endLng - startLng

  const y = Math.sin(dLng) * Math.cos(endLat)
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng)

  const bearing = Math.atan2(y, x)
  const degrees = (bearing * 180) / Math.PI

  return (degrees + 360) % 360
}

