/**
 * Mapbox Directions API wrapper for server-side route calculations
 */

export interface DirectionsRequest {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

export interface DirectionsResult {
  routes: Array<{
    distance: number // meters
    duration: number // seconds
    geometry: {
      coordinates: Array<[number, number]> // [lng, lat]
    }
  }>
}

/**
 * Get directions from Mapbox Directions API
 * @param request - Origin and destination coordinates
 * @returns Promise with directions result
 */
export async function getDirections(
  request: DirectionsRequest
): Promise<DirectionsResult> {
  const apiKey = process.env.MAPBOX_ACCESS_TOKEN

  if (!apiKey) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured')
  }

  const { origin, destination } = request
  
  // Mapbox format: lng,lat;lng,lat
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${apiKey}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Directions API failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found')
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
 * Convert Mapbox coordinates to our format
 * @param coordinates - Array of [lng, lat] from Mapbox
 * @returns Array of {lat, lng} objects
 */
export function convertMapboxCoordinates(
  coordinates: Array<[number, number]>
): Array<{ lat: number; lng: number }> {
  return coordinates.map(([lng, lat]) => ({ lat, lng }))
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

/**
 * Calculate minimum distance from a point to a polygon
 * @param point - Point to check
 * @param polygon - Array of polygon coordinates
 * @returns Minimum distance in kilometers
 */
export function distanceToPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): number {
  if (polygon.length < 3) return Infinity

  let minDistance = Infinity

  // Check distance to each edge of the polygon
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % polygon.length]

    // Calculate distance from point to line segment
    const dist = distanceToSegment(point, p1, p2)
    minDistance = Math.min(minDistance, dist)
  }

  return minDistance
}

/**
 * Calculate distance from a point to a line segment
 */
function distanceToSegment(
  point: { lat: number; lng: number },
  segStart: { lat: number; lng: number },
  segEnd: { lat: number; lng: number }
): number {
  const A = point.lat - segStart.lat
  const B = point.lng - segStart.lng
  const C = segEnd.lat - segStart.lat
  const D = segEnd.lng - segStart.lng

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx: number, yy: number

  if (param < 0) {
    xx = segStart.lat
    yy = segStart.lng
  } else if (param > 1) {
    xx = segEnd.lat
    yy = segEnd.lng
  } else {
    xx = segStart.lat + param * C
    yy = segStart.lng + param * D
  }

  const dx = point.lat - xx
  const dy = point.lng - yy
  return calculateDistance(point, { lat: xx, lng: yy })
}
