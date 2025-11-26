/**
 * Simulation utilities for journey tracking and movement
 */

export interface Stoppage {
  position: number // Position along the route (0-1)
  duration: number // Duration in seconds
  triggered: boolean
}

export interface SimulationState {
  progress: number // 0-1 along the route
  currentPosition: { lat: number; lng: number }
  heading: number // Bearing in degrees
  remainingDistanceKm: number
  etaMinutes: number
  isMoving: boolean
  stoppages: Stoppage[]
}

/**
 * Generate random stoppages for a journey
 * @param count - Number of stoppages to generate
 * @returns Array of stoppage definitions
 */
export function generateStoppages(count: number = 2): Stoppage[] {
  const stoppages: Stoppage[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate stoppage between 20% and 80% of the route
    const position = 0.2 + Math.random() * 0.6
    // Duration between 10 and 20 seconds
    const duration = 10 + Math.random() * 10
    
    stoppages.push({
      position,
      duration,
      triggered: false,
    })
  }
  
  // Sort by position
  return stoppages.sort((a, b) => a.position - b.position)
}

/**
 * Interpolate position along a polyline path
 * @param points - Array of lat/lng points
 * @param progress - Progress value (0-1)
 * @returns Interpolated position
 */
export function interpolatePosition(
  points: Array<{ lat: number; lng: number }>,
  progress: number
): { lat: number; lng: number } {
  if (points.length === 0) {
    throw new Error('Cannot interpolate with empty points array')
  }
  
  if (progress <= 0) return points[0]
  if (progress >= 1) return points[points.length - 1]
  
  // Calculate total distance
  const distances: number[] = [0]
  let totalDistance = 0
  
  for (let i = 1; i < points.length; i++) {
    const dist = calculateSimpleDistance(points[i - 1], points[i])
    totalDistance += dist
    distances.push(totalDistance)
  }
  
  // Find target distance
  const targetDistance = progress * totalDistance
  
  // Find segment
  for (let i = 1; i < distances.length; i++) {
    if (targetDistance <= distances[i]) {
      const segmentStart = distances[i - 1]
      const segmentEnd = distances[i]
      const segmentProgress = (targetDistance - segmentStart) / (segmentEnd - segmentStart)
      
      const p1 = points[i - 1]
      const p2 = points[i]
      
      return {
        lat: p1.lat + (p2.lat - p1.lat) * segmentProgress,
        lng: p1.lng + (p2.lng - p1.lng) * segmentProgress,
      }
    }
  }
  
  return points[points.length - 1]
}

/**
 * Calculate simple Euclidean distance (for interpolation)
 * Note: This is approximate for geographic coordinates but faster than Haversine
 * For better accuracy, we should use Haversine, but for route interpolation this is usually sufficient
 */
function calculateSimpleDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const dLat = p2.lat - p1.lat
  const dLng = p2.lng - p1.lng
  // Scale longitude by latitude to account for Earth's curvature
  const latMid = (p1.lat + p2.lat) / 2
  const latScale = Math.cos(latMid * Math.PI / 180)
  return Math.sqrt(dLat * dLat + (dLng * latScale) * (dLng * latScale))
}

/**
 * Calculate heading between current and next position
 * @param current - Current position
 * @param next - Next position
 * @returns Heading in degrees (0-360)
 */
export function calculateHeading(
  current: { lat: number; lng: number },
  next: { lat: number; lng: number }
): number {
  const dLng = next.lng - current.lng
  const dLat = next.lat - current.lat
  
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return (angle + 360) % 360
}

/**
 * Calculate remaining distance along path
 * @param points - Full path points
 * @param progress - Current progress (0-1)
 * @returns Remaining distance in km
 */
export function calculateRemainingDistance(
  points: Array<{ lat: number; lng: number }>,
  progress: number,
  totalDistanceKm: number
): number {
  return totalDistanceKm * (1 - progress)
}

/**
 * Calculate ETA based on remaining distance and speed
 * @param remainingDistanceKm - Remaining distance in km
 * @param baseSpeedKmh - Base speed in km/h (default 60)
 * @param speedMultiplier - Simulation speed multiplier
 * @returns ETA in minutes
 */
export function calculateETA(
  remainingDistanceKm: number,
  baseSpeedKmh: number = 60,
  speedMultiplier: number = 1
): number {
  const adjustedSpeed = baseSpeedKmh * speedMultiplier
  const etaHours = remainingDistanceKm / adjustedSpeed
  return etaHours * 60 // Convert to minutes
}

/**
 * Check if truck should be in stoppage
 * @param progress - Current progress
 * @param stoppages - Array of stoppages
 * @returns Active stoppage or null
 */
export function checkForStoppage(
  progress: number,
  stoppages: Stoppage[]
): Stoppage | null {
  // Check if we're near any untriggered stoppage (within 0.5% of route)
  for (const stoppage of stoppages) {
    if (!stoppage.triggered && Math.abs(progress - stoppage.position) < 0.005) {
      return stoppage
    }
  }
  return null
}

/**
 * Update simulation progress
 * @param currentProgress - Current progress (0-1)
 * @param deltaTimeSeconds - Time elapsed in seconds
 * @param totalDistanceKm - Total route distance
 * @param speedMultiplier - Speed multiplier
 * @param baseSpeedKmh - Base speed in km/h
 * @returns New progress value
 */
export function updateProgress(
  currentProgress: number,
  deltaTimeSeconds: number,
  totalDistanceKm: number,
  speedMultiplier: number = 1,
  baseSpeedKmh: number = 60
): number {
  const adjustedSpeed = baseSpeedKmh * speedMultiplier
  const distanceTraveledKm = (adjustedSpeed / 3600) * deltaTimeSeconds
  const progressDelta = distanceTraveledKm / totalDistanceKm
  
  // Ensure progress doesn't skip too much (especially important for detour routes)
  // Cap the maximum progress increment to ensure we hit all path points
  const maxProgressDelta = 0.01 // Maximum 1% progress per tick
  const cappedProgressDelta = Math.min(progressDelta, maxProgressDelta)
  
  return Math.min(currentProgress + cappedProgressDelta, 1)
}

