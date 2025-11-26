import { NextRequest, NextResponse } from 'next/server'
import { Zone } from '@/types'
import { calculateDistance, calculateBearing, calculateDestination } from '@/lib/directions'

// POST /api/directions/detour - Calculate route avoiding zones using Mapbox with waypoints
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

    const apiKey = process.env.MAPBOX_ACCESS_TOKEN
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MAPBOX_ACCESS_TOKEN is not configured' },
        { status: 500 }
      )
    }

    // If no zones to avoid, return normal route
    if (!avoidZones || avoidZones.length === 0) {
      const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${apiKey}`
      const response = await fetch(url)
      const data = await response.json()
      return NextResponse.json(data)
    }

    // Calculate waypoints that avoid the redzone
    const waypoints: Array<{ lat: number; lng: number }> = []
    
    for (const zone of avoidZones as Zone[]) {
      if (zone.coordinates && zone.coordinates.length >= 3) {
        // Find zone center (average of all coordinates)
        let centerLat = 0
        let centerLng = 0
        for (const coord of zone.coordinates) {
          centerLat += coord.lat
          centerLng += coord.lng
        }
        centerLat /= zone.coordinates.length
        centerLng /= zone.coordinates.length
        
        const zoneCenter = { lat: centerLat, lng: centerLng }
        
        // Calculate bearing from origin to destination
        const bearingToDest = calculateBearing(origin, destination)
        const bearingFromOrigin = calculateBearing(origin, zoneCenter)
        
        // Calculate distance from origin to zone center
        const distToZone = calculateDistance(origin, zoneCenter)
        
        // If zone is between origin and destination, add waypoints to avoid it
        if (distToZone < calculateDistance(origin, destination)) {
          // Calculate two waypoints: one on each side of the zone
          // Distance from zone center to waypoint (should be outside zone boundary)
          const avoidDistance = 15 // 15km away from zone center to ensure we're outside
          
          // Calculate perpendicular bearings (90 degrees left and right)
          const bearingLeft = (bearingToDest - 90 + 360) % 360
          const bearingRight = (bearingToDest + 90) % 360
          
          // Calculate waypoints on both sides
          const waypointLeft = calculateDestination(zoneCenter, bearingLeft, avoidDistance)
          const waypointRight = calculateDestination(zoneCenter, bearingRight, avoidDistance)
          
          // Choose the waypoint that's closer to the destination direction
          const distLeft = calculateDistance(waypointLeft, destination)
          const distRight = calculateDistance(waypointRight, destination)
          
          // Add the closer waypoint
          if (distLeft < distRight) {
            waypoints.push(waypointLeft)
          } else {
            waypoints.push(waypointRight)
          }
        }
      }
    }

    // Build Mapbox coordinates string with waypoints
    let coordinates = `${origin.lng},${origin.lat}`
    for (const waypoint of waypoints) {
      coordinates += `;${waypoint.lng},${waypoint.lat}`
    }
    coordinates += `;${destination.lng},${destination.lat}`

    // Call Mapbox Directions API with waypoints
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Mapbox API failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.routes || data.routes.length === 0) {
      // Fallback: try without waypoints if route fails
      const fallbackCoords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
      const fallbackUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fallbackCoords}?geometries=geojson&access_token=${apiKey}`
      const fallbackResponse = await fetch(fallbackUrl)
      const fallbackData = await fallbackResponse.json()
      return NextResponse.json(fallbackData)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error calculating detour route:', error)
    return NextResponse.json(
      { error: 'Failed to calculate detour route', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

