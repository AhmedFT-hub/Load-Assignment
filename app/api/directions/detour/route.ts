import { NextRequest, NextResponse } from 'next/server'
import { Zone } from '@/types'
import { calculateDistance, calculateBearing, calculateDestination, distanceToPolygon } from '@/lib/directions'

// POST /api/directions/detour - Calculate route avoiding zones and rejoining original route after redzone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, destination, avoidZones, originalRoute } = body

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

    // Find entry and exit points on original route relative to redzone
    let entryPoint: { lat: number; lng: number } | null = null
    let exitPoint: { lat: number; lng: number } | null = null
    const waypoints: Array<{ lat: number; lng: number }> = []
    
    if (originalRoute && originalRoute.length > 0) {
      for (const zone of avoidZones as Zone[]) {
        if (zone.coordinates && zone.coordinates.length >= 3) {
          // Find zone center
          let centerLat = 0
          let centerLng = 0
          for (const coord of zone.coordinates) {
            centerLat += coord.lat
            centerLng += coord.lng
          }
          centerLat /= zone.coordinates.length
          centerLng /= zone.coordinates.length
          const zoneCenter = { lat: centerLat, lng: centerLng }
          
          // Find where original route enters redzone (first point within 10km of zone)
          let entryIndex = -1
          let exitIndex = -1
          
          for (let i = 0; i < originalRoute.length; i++) {
            const point = originalRoute[i]
            const distToZone = distanceToPolygon(point, zone.coordinates)
            
            // Entry point: first point that gets close to redzone (within 10km)
            if (entryIndex === -1 && distToZone <= 10) {
              // Go back a bit to find a point before entering
              entryIndex = Math.max(0, i - 5)
              entryPoint = originalRoute[entryIndex]
            }
            
            // Exit point: first point after entry that's far enough from redzone (more than 10km)
            if (entryIndex !== -1 && exitIndex === -1 && distToZone > 15) {
              exitIndex = i
              exitPoint = originalRoute[exitIndex]
              break
            }
          }
          
          // If we couldn't find exit point, use a point further along the route
          if (entryIndex !== -1 && exitIndex === -1) {
            exitIndex = Math.min(originalRoute.length - 1, entryIndex + Math.floor(originalRoute.length * 0.3))
            exitPoint = originalRoute[exitIndex]
          }
          
          // Calculate waypoints to go around the redzone
          if (entryPoint && exitPoint) {
            // Calculate bearing from entry to exit (direction of travel)
            const routeBearing = calculateBearing(entryPoint, exitPoint)
            
            // Calculate waypoints on both sides of the zone
            const avoidDistance = 20 // 20km away from zone center to ensure we're well outside
            const bearingLeft = (routeBearing - 90 + 360) % 360
            const bearingRight = (routeBearing + 90) % 360
            
            const waypointLeft = calculateDestination(zoneCenter, bearingLeft, avoidDistance)
            const waypointRight = calculateDestination(zoneCenter, bearingRight, avoidDistance)
            
            // Choose the waypoint that's closer to the exit point
            const distLeft = calculateDistance(waypointLeft, exitPoint)
            const distRight = calculateDistance(waypointRight, exitPoint)
            
            // Add the closer waypoint
            if (distLeft < distRight) {
              waypoints.push(waypointLeft)
            } else {
              waypoints.push(waypointRight)
            }
            
            // Add exit point as a waypoint to rejoin original route
            waypoints.push(exitPoint)
          } else {
            // Fallback: use simple waypoint calculation
            const bearingToDest = calculateBearing(origin, destination)
            const avoidDistance = 20
            const bearingLeft = (bearingToDest - 90 + 360) % 360
            const bearingRight = (bearingToDest + 90) % 360
            
            const waypointLeft = calculateDestination(zoneCenter, bearingLeft, avoidDistance)
            const waypointRight = calculateDestination(zoneCenter, bearingRight, avoidDistance)
            
            const distLeft = calculateDistance(waypointLeft, destination)
            const distRight = calculateDistance(waypointRight, destination)
            
            if (distLeft < distRight) {
              waypoints.push(waypointLeft)
            } else {
              waypoints.push(waypointRight)
            }
          }
        }
      }
    } else {
      // No original route provided, use simple waypoint calculation
      for (const zone of avoidZones as Zone[]) {
        if (zone.coordinates && zone.coordinates.length >= 3) {
          let centerLat = 0
          let centerLng = 0
          for (const coord of zone.coordinates) {
            centerLat += coord.lat
            centerLng += coord.lng
          }
          centerLat /= zone.coordinates.length
          centerLng /= zone.coordinates.length
          const zoneCenter = { lat: centerLat, lng: centerLng }
          
          const bearingToDest = calculateBearing(origin, destination)
          const avoidDistance = 20
          const bearingLeft = (bearingToDest - 90 + 360) % 360
          const bearingRight = (bearingToDest + 90) % 360
          
          const waypointLeft = calculateDestination(zoneCenter, bearingLeft, avoidDistance)
          const waypointRight = calculateDestination(zoneCenter, bearingRight, avoidDistance)
          
          const distLeft = calculateDistance(waypointLeft, destination)
          const distRight = calculateDistance(waypointRight, destination)
          
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

