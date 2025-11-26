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
 * Calculate a destination point given start point, bearing, and distance
 * @param start - Starting coordinate
 * @param bearing - Bearing in degrees (0-360)
 * @param distanceKm - Distance in kilometers
 * @returns Destination coordinate
 */
export function calculateDestination(
  start: { lat: number; lng: number },
  bearing: number,
  distanceKm: number
): { lat: number; lng: number } {
  const R = 6371 // Earth radius in km
  const lat1 = toRad(start.lat)
  const lng1 = toRad(start.lng)
  const brng = toRad(bearing)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
    Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(brng)
  )

  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(distanceKm / R) * Math.cos(lat1),
    Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
  )

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  }
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
 * Calculate distance from a point to a line segment using Haversine formula
 */
function distanceToSegment(
  point: { lat: number; lng: number },
  segStart: { lat: number; lng: number },
  segEnd: { lat: number; lng: number }
): number {
  // Calculate distances
  const distToStart = calculateDistance(point, segStart)
  const distToEnd = calculateDistance(point, segEnd)
  const distSegment = calculateDistance(segStart, segEnd)

  // If segment is very short, return distance to start
  if (distSegment < 0.001) {
    return distToStart
  }

  // Calculate bearing from start to end
  const bearingStartToEnd = calculateBearing(segStart, segEnd)
  const bearingStartToPoint = calculateBearing(segStart, point)

  // Calculate angle between segment and point
  const angleDiff = Math.abs(bearingStartToEnd - bearingStartToPoint)
  const angleRad = toRad(Math.min(angleDiff, 360 - angleDiff))

  // Calculate perpendicular distance
  const perpendicularDist = distToStart * Math.sin(angleRad)

  // Check if perpendicular point is within segment
  const distAlongSegment = distToStart * Math.cos(angleRad)
  
  if (distAlongSegment < 0) {
    // Point is before start
    return distToStart
  } else if (distAlongSegment > distSegment) {
    // Point is after end
    return distToEnd
  } else {
    // Point projects onto segment
    return Math.abs(perpendicularDist)
  }
}
