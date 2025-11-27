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

    // Build route segment by segment, avoiding each redzone and rejoining after each zone ends
    const routeSegments: Array<{ lat: number; lng: number }> = []
    const waypoints: Array<{ lat: number; lng: number }> = []
    let zoneSegments: Array<{ entryIndex: number, exitIndex: number, entry: { lat: number; lng: number }, exit: { lat: number; lng: number }, zone: Zone }> = []
    
    if (originalRoute && originalRoute.length > 0) {
      // Find the closest point on the original route to the origin (truck position)
      let startIndex = 0
      let minDistToOrigin = Infinity
      for (let i = 0; i < originalRoute.length; i++) {
        const dist = calculateDistance(origin, originalRoute[i])
        if (dist < minDistToOrigin) {
          minDistToOrigin = dist
          startIndex = i
        }
      }
      
      // Process each zone to find where it intersects with the route (only check ahead of current position)
      for (const zone of avoidZones as Zone[]) {
        if (zone.coordinates && zone.coordinates.length >= 3) {
          // Find where original route enters and exits this redzone (only check from startIndex forward)
          let entryIndex = -1
          let exitIndex = -1
          
          for (let i = startIndex; i < originalRoute.length; i++) {
            const point = originalRoute[i]
            const distToZone = distanceToPolygon(point, zone.coordinates)
            
            // Entry point: first point that gets close to redzone (within 10km)
            if (entryIndex === -1 && distToZone <= 10) {
              // Go back to find a safe point before entering (at least 15km away)
              for (let j = Math.max(startIndex, i - 20); j < i; j++) {
                const prevDist = distanceToPolygon(originalRoute[j], zone.coordinates)
                if (prevDist > 15) {
                  entryIndex = j
                  break
                }
              }
              if (entryIndex === -1) entryIndex = Math.max(startIndex, i - 15)
            }
            
            // Exit point: first point after entry that's far enough from redzone (more than 15km)
            if (entryIndex !== -1 && exitIndex === -1 && distToZone > 15) {
              // Find a point that's safely past the zone
              for (let j = i; j < Math.min(originalRoute.length, i + 20); j++) {
                const nextDist = distanceToPolygon(originalRoute[j], zone.coordinates)
                if (nextDist > 15) {
                  exitIndex = j
                  break
                }
              }
              if (exitIndex === -1) exitIndex = Math.min(originalRoute.length - 1, i + 10)
              break
            }
          }
          
          // If we found an entry but no exit, set exit to be further along
          if (entryIndex !== -1 && exitIndex === -1) {
            exitIndex = Math.min(originalRoute.length - 1, entryIndex + Math.floor((originalRoute.length - entryIndex) * 0.3))
          }
          
          // Store zone segment if we found both entry and exit
          if (entryIndex !== -1 && exitIndex !== -1 && exitIndex > entryIndex) {
            zoneSegments.push({
              entryIndex,
              exitIndex,
              entry: originalRoute[entryIndex],
              exit: originalRoute[exitIndex],
              zone: zone
            })
          }
        }
      }
      
      // Sort zone segments by their position along the route
      zoneSegments.sort((a, b) => a.entryIndex - b.entryIndex)
      
      // Build route segment by segment
      // Start from origin (current truck position)
      let routeIndex = startIndex
      routeSegments.push(origin) // Start from current truck position
      
      // If origin is not on the route, calculate route from origin to closest route point
      if (minDistToOrigin > 0.1) { // If origin is more than 100m from closest route point
        try {
          const originToRouteCoords = `${origin.lng},${origin.lat};${originalRoute[startIndex].lng},${originalRoute[startIndex].lat}`
          const originToRouteUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originToRouteCoords}?geometries=geojson&access_token=${apiKey}`
          const originToRouteResponse = await fetch(originToRouteUrl)
          if (originToRouteResponse.ok) {
            const originToRouteData = await originToRouteResponse.json()
            if (originToRouteData.routes && originToRouteData.routes[0]) {
              const originPath = originToRouteData.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
              // Skip first point (origin) and last point (will be added as route point)
              routeSegments.push(...originPath.slice(1, -1))
            }
          }
        } catch (error) {
          console.error('Error calculating origin to route segment:', error)
        }
      }
      
      for (const segment of zoneSegments) {
        // Add route from current position to entry point of this zone
        if (routeIndex < segment.entryIndex) {
          // Use original route points up to entry
          for (let i = Math.max(routeIndex + 1, startIndex + 1); i <= segment.entryIndex; i++) {
            routeSegments.push(originalRoute[i])
          }
          routeIndex = segment.entryIndex
        }
        
        // Simple approach: Calculate waypoint far enough from THIS zone, use Mapbox routing, validate strictly
        const zoneCenter = {
          lat: segment.zone.coordinates.reduce((sum, c) => sum + c.lat, 0) / segment.zone.coordinates.length,
          lng: segment.zone.coordinates.reduce((sum, c) => sum + c.lng, 0) / segment.zone.coordinates.length
        }
        
        // Find the maximum distance from zone center to any point on the zone boundary
        let maxZoneRadius = 0
        for (const coord of segment.zone.coordinates) {
          const distFromCenter = calculateDistance(zoneCenter, coord)
          maxZoneRadius = Math.max(maxZoneRadius, distFromCenter)
        }
        
        // Calculate bearing from entry to exit
        const routeBearing = calculateBearing(segment.entry, segment.exit)
        const bearingLeft = (routeBearing - 90 + 360) % 360
        const bearingRight = (routeBearing + 90) % 360
        
        // Start with small distances and increase only if needed - find shortest valid route
        const minDistance = Math.max(8, maxZoneRadius + 5) // Start close: zone radius + 5km
        const testDistances = [minDistance, minDistance + 3, minDistance + 6, minDistance + 10, minDistance + 15, minDistance + 20]
        let bestRoute: Array<{ lat: number; lng: number }> | null = null
        let bestDistance = Infinity
        
        // Test distances from smallest to largest, stop when we find valid routes and pick shortest
        for (const avoidDistance of testDistances) {
          const waypointLeft = calculateDestination(zoneCenter, bearingLeft, avoidDistance)
          const waypointRight = calculateDestination(zoneCenter, bearingRight, avoidDistance)
          
          // Test both waypoints
          for (const waypoint of [waypointLeft, waypointRight]) {
            try {
              // Use Mapbox routing: entry -> waypoint -> exit (real road path)
              const routeCoords = `${segment.entry.lng},${segment.entry.lat};${waypoint.lng},${waypoint.lat};${segment.exit.lng},${segment.exit.lat}`
              const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${routeCoords}?geometries=geojson&access_token=${apiKey}`
              const routeResponse = await fetch(routeUrl)
              
              if (!routeResponse.ok) continue
              
              const routeData = await routeResponse.json()
              if (!routeData.routes || !routeData.routes[0]) continue
              
              // Mapbox returns route along real roads
              const routePath = routeData.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
              
              // Validate: EVERY point must be at least 3km away from ALL zones
              let isValid = true
              for (const zone of avoidZones as Zone[]) {
                if (zone.coordinates && zone.coordinates.length >= 3) {
                  for (const point of routePath) {
                    const distToZone = distanceToPolygon(point, zone.coordinates)
                    if (distToZone <= 3) { // Must be at least 3km away
                      isValid = false
                      break
                    }
                  }
                  if (!isValid) break
                }
              }
              
              if (isValid) {
                const totalDist = routeData.routes[0].distance
                // Keep the shortest valid route
                if (totalDist < bestDistance) {
                  bestDistance = totalDist
                  bestRoute = routePath
                }
              }
            } catch (error) {
              continue
            }
          }
        }
        
        // Use the best route found, or fallback to a very safe distance
        if (bestRoute) {
          // Skip first point (entry) to avoid duplicate
          routeSegments.push(...bestRoute.slice(1))
        } else {
          // Fallback: use very safe distance (40km) and don't validate (just use it)
          const fallbackDistance = 40
          const fallbackLeft = calculateDestination(zoneCenter, bearingLeft, fallbackDistance)
          const fallbackRight = calculateDestination(zoneCenter, bearingRight, fallbackDistance)
          
          // Choose waypoint furthest from all zones
          let leftMinDist = Infinity
          let rightMinDist = Infinity
          for (const otherZone of avoidZones as Zone[]) {
            if (otherZone.coordinates && otherZone.coordinates.length >= 3) {
              leftMinDist = Math.min(leftMinDist, distanceToPolygon(fallbackLeft, otherZone.coordinates))
              rightMinDist = Math.min(rightMinDist, distanceToPolygon(fallbackRight, otherZone.coordinates))
            }
          }
          const fallbackWaypoint = leftMinDist > rightMinDist ? fallbackLeft : fallbackRight
          
          // Use Mapbox routing with fallback waypoint
          try {
            const fallbackCoords = `${segment.entry.lng},${segment.entry.lat};${fallbackWaypoint.lng},${fallbackWaypoint.lat};${segment.exit.lng},${segment.exit.lat}`
            const fallbackUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fallbackCoords}?geometries=geojson&access_token=${apiKey}`
            const fallbackResponse = await fetch(fallbackUrl)
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              if (fallbackData.routes && fallbackData.routes[0]) {
                const fallbackPath = fallbackData.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
                routeSegments.push(...fallbackPath.slice(1))
              } else {
                routeSegments.push(fallbackWaypoint)
                routeSegments.push(segment.exit)
              }
            } else {
              routeSegments.push(fallbackWaypoint)
              routeSegments.push(segment.exit)
            }
          } catch (error) {
            console.error('Error calculating fallback detour segment:', error)
            routeSegments.push(fallbackWaypoint)
            routeSegments.push(segment.exit)
          }
        }
        
        routeIndex = segment.exitIndex
      }
      
      // Add remaining route from last exit point to destination
      if (zoneSegments.length > 0) {
        const lastExitIndex = zoneSegments[zoneSegments.length - 1].exitIndex
        // Add route from last exit to destination
        if (lastExitIndex < originalRoute.length - 1) {
          try {
            const exitToDestCoords = `${originalRoute[lastExitIndex].lng},${originalRoute[lastExitIndex].lat};${destination.lng},${destination.lat}`
            const exitToDestUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${exitToDestCoords}?geometries=geojson&access_token=${apiKey}`
            const exitToDestResponse = await fetch(exitToDestUrl)
            if (exitToDestResponse.ok) {
              const exitToDestData = await exitToDestResponse.json()
              if (exitToDestData.routes && exitToDestData.routes[0]) {
                const exitToDestPath = exitToDestData.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
                // Skip first point to avoid duplicate
                routeSegments.push(...exitToDestPath.slice(1))
              }
            }
          } catch (error) {
            console.error('Error calculating exit to destination segment:', error)
            // Fallback: use original route points
            for (let i = lastExitIndex + 1; i < originalRoute.length; i++) {
              routeSegments.push(originalRoute[i])
            }
            routeSegments.push(destination)
          }
        } else {
          routeSegments.push(destination)
        }
      } else {
        // No zones, use original route
        for (let i = 1; i < originalRoute.length; i++) {
          routeSegments.push(originalRoute[i])
        }
        routeSegments.push(destination)
      }
      
      // Validate the final route doesn't intersect with any zones - 3km check
      let routeIsValid = true
      for (const zone of avoidZones as Zone[]) {
        if (zone.coordinates && zone.coordinates.length >= 3) {
          for (const routePoint of routeSegments) {
            const distToZone = distanceToPolygon(routePoint, zone.coordinates)
            if (distToZone <= 3) { // Must be at least 3km away
              routeIsValid = false
              console.error(`Route FAILED validation - intersects with zone ${zone.name} at distance ${distToZone.toFixed(2)}km`)
              break
            }
          }
          if (!routeIsValid) break
        }
      }
      
      if (!routeIsValid) {
        console.error('Route validation FAILED - route still intersects with redzones')
      }
      
      // If we have segments, return them as a combined route
      if (routeSegments.length > 0) {
        return NextResponse.json({
          routes: [{
            geometry: {
              coordinates: routeSegments.map(p => [p.lng, p.lat]),
              type: 'LineString'
            },
            distance: routeSegments.reduce((sum, p, i) => {
              if (i === 0) return 0
              return sum + calculateDistance(routeSegments[i - 1], p) * 1000 // Convert to meters
            }, 0),
            duration: 0
          }]
        })
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

    // Validate that the calculated route doesn't intersect with any redzones
    const routeCoordinates = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
    let routeIsValid = true
    
    for (const zone of avoidZones as Zone[]) {
      if (zone.coordinates && zone.coordinates.length >= 3) {
        for (const routePoint of routeCoordinates) {
          const distToZone = distanceToPolygon(routePoint, zone.coordinates)
          // Strict rule: route must be at least 3km away from any redzone
          if (distToZone <= 3) {
            routeIsValid = false
            console.warn(`Route intersects with zone ${zone.name} at distance ${distToZone.toFixed(2)}km`)
            break
          }
        }
        if (!routeIsValid) break
      }
    }
    
    // If route is invalid, try recalculating with even larger avoidance distances
    if (!routeIsValid && waypoints.length > 0) {
      console.log('Route validation failed, attempting recalculation with stricter parameters')
      
      // Increase avoidance distance and recalculate waypoints
      const stricterWaypoints: Array<{ lat: number; lng: number }> = []
      
      if (originalRoute && originalRoute.length > 0 && zoneSegments.length > 0) {
        for (const segment of zoneSegments) {
          const zoneCenter = {
            lat: segment.zone.coordinates.reduce((sum, c) => sum + c.lat, 0) / segment.zone.coordinates.length,
            lng: segment.zone.coordinates.reduce((sum, c) => sum + c.lng, 0) / segment.zone.coordinates.length
          }
          
          const routeBearing = calculateBearing(segment.entry, segment.exit)
          const avoidDistance = 35 // Increased to 35km for stricter avoidance
          const bearingLeft = (routeBearing - 90 + 360) % 360
          const bearingRight = (routeBearing + 90) % 360
          
          const waypointLeft = calculateDestination(zoneCenter, bearingLeft, avoidDistance)
          const waypointRight = calculateDestination(zoneCenter, bearingRight, avoidDistance)
          
          // Choose waypoint that's furthest from ALL zones
          let leftMinDist = Infinity
          let rightMinDist = Infinity
          
          for (const otherZone of avoidZones as Zone[]) {
            if (otherZone.coordinates && otherZone.coordinates.length >= 3) {
              const distLeft = distanceToPolygon(waypointLeft, otherZone.coordinates)
              const distRight = distanceToPolygon(waypointRight, otherZone.coordinates)
              leftMinDist = Math.min(leftMinDist, distLeft)
              rightMinDist = Math.min(rightMinDist, distRight)
            }
          }
          
          if (leftMinDist > rightMinDist) {
            stricterWaypoints.push(waypointLeft)
          } else {
            stricterWaypoints.push(waypointRight)
          }
        }
        
        // Recalculate route with stricter waypoints
        let stricterCoords = `${origin.lng},${origin.lat}`
        for (const waypoint of stricterWaypoints) {
          stricterCoords += `;${waypoint.lng},${waypoint.lat}`
        }
        stricterCoords += `;${destination.lng},${destination.lat}`
        
        const stricterUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${stricterCoords}?geometries=geojson&access_token=${apiKey}`
        const stricterResponse = await fetch(stricterUrl)
        
        if (stricterResponse.ok) {
          const stricterData = await stricterResponse.json()
          if (stricterData.routes && stricterData.routes.length > 0) {
            // Validate the stricter route
            const stricterRouteCoords = stricterData.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
            let stricterIsValid = true
            
            for (const zone of avoidZones as Zone[]) {
              if (zone.coordinates && zone.coordinates.length >= 3) {
                for (const routePoint of stricterRouteCoords) {
                  const distToZone = distanceToPolygon(routePoint, zone.coordinates)
                  if (distToZone <= 3) {
                    stricterIsValid = false
                    break
                  }
                }
                if (!stricterIsValid) break
              }
            }
            
            if (stricterIsValid) {
              console.log('Stricter route validation passed')
              return NextResponse.json(stricterData)
            }
          }
        }
      }
      
      console.error('Failed to calculate route that avoids all redzones')
      // Return the original route but log a warning
      return NextResponse.json(data)
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

