import { NextRequest, NextResponse } from 'next/server'
import { getDirections, convertMapboxCoordinates } from '@/lib/directions'
import { Zone } from '@/types'

// POST /api/directions/detour - Calculate route avoiding zones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, destination, avoidZones } = body

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      )
    }

    // For now, use simple route calculation
    // In production, you'd use Mapbox Directions API with avoidances
    // For simplicity, we'll calculate a route that goes around the zone
    
    // Get basic route first
    const directions = await getDirections({ origin, destination })
    
    // If no zones to avoid, return normal route
    if (!avoidZones || avoidZones.length === 0) {
      return NextResponse.json(directions)
    }

    // For zones, we'll modify the route to avoid zone centers
    // This is a simplified approach - in production you'd use Mapbox's avoidances parameter
    const route = directions.routes[0]
    const coordinates = route.geometry.coordinates

    // Check if route passes through any zone
    // If it does, calculate a waypoint that avoids the zone
    const modifiedCoordinates = [...coordinates]
    
    for (const zone of avoidZones as Zone[]) {
      if (zone.coordinates && zone.coordinates.length > 0) {
        const zoneCenter = zone.coordinates[0]
        
        // Find if route is too close to zone center
        for (let i = 0; i < modifiedCoordinates.length - 1; i++) {
          const [lng1, lat1] = modifiedCoordinates[i]
          const [lng2, lat2] = modifiedCoordinates[i + 1]
          
          // Calculate distance from segment to zone center
          const distToZone = calculateDistanceToSegment(
            { lat: lat1, lng: lng1 },
            { lat: lat2, lng: lng2 },
            zoneCenter
          )
          
          // If too close (within 2km), add waypoint to avoid
          if (distToZone < 2) {
            // Calculate waypoint that avoids zone (simplified - go around)
            const bearing = calculateBearing(
              { lat: lat1, lng: lng1 },
              zoneCenter
            )
            const avoidPoint = calculateDestination(
              zoneCenter,
              bearing + 90, // 90 degrees offset
              5 // 5km away
            )
            
            modifiedCoordinates.splice(i + 1, 0, [avoidPoint.lng, avoidPoint.lat])
            break
          }
        }
      }
    }

    // Recalculate route with waypoints if needed
    // For now, return modified coordinates
    return NextResponse.json({
      routes: [{
        ...route,
        geometry: {
          ...route.geometry,
          coordinates: modifiedCoordinates,
        },
      }],
    })
  } catch (error) {
    console.error('Error calculating detour route:', error)
    return NextResponse.json(
      { error: 'Failed to calculate detour route' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateDistanceToSegment(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  point: { lat: number; lng: number }
): number {
  const R = 6371 // Earth radius in km
  const dLat1 = toRad(point.lat - p1.lat)
  const dLng1 = toRad(point.lng - p1.lng)
  const dLat2 = toRad(p2.lat - p1.lat)
  const dLng2 = toRad(p2.lng - p1.lng)

  const a1 = Math.sin(dLat1 / 2) * Math.sin(dLat1 / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(point.lat)) *
    Math.sin(dLng1 / 2) * Math.sin(dLng1 / 2)
  const c1 = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1))
  const dist1 = R * c1

  const a2 = Math.sin(dLat2 / 2) * Math.sin(dLat2 / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
    Math.sin(dLng2 / 2) * Math.sin(dLng2 / 2)
  const c2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2))
  const dist2 = R * c2

  return Math.min(dist1, dist2)
}

function calculateBearing(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const startLat = toRad(start.lat)
  const startLng = toRad(start.lng)
  const endLat = toRad(end.lat)
  const endLng = toRad(end.lng)

  const dLng = endLng - startLng
  const y = Math.sin(dLng) * Math.cos(endLat)
  const x = Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng)

  const bearing = Math.atan2(y, x)
  return ((bearing * 180) / Math.PI + 360) % 360
}

function calculateDestination(
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

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

