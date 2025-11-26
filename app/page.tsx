'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Journey, SimulationEvent, CallLog, JourneyStatus } from '@/types'
import JourneySelector from '@/components/journeys/JourneySelector'
import SimulationControls from '@/components/simulation/SimulationControls'
import JourneyInfoCard from '@/components/journeys/JourneyInfoCard'
import CallStatusCard from '@/components/calls/CallStatusCard'
import EventTimeline from '@/components/events/EventTimeline'
import { convertMapboxCoordinates } from '@/lib/directions'
import {
  generateStoppages,
  interpolatePosition,
  calculateHeading,
  calculateRemainingDistance,
  calculateETA,
  checkForStoppage,
  updateProgress,
  Stoppage,
} from '@/lib/simulation'

// Dynamically import Mapbox Map to avoid SSR issues
const MapboxMapView = dynamic(() => import('@/components/Map/MapboxMapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

const BASE_SPEED_KMH = 60
const SIMULATION_TICK_MS = 1000
const NEAR_DESTINATION_THRESHOLD_MINUTES = 30
const UNLOADING_DURATION_SECONDS = 5

export default function Dashboard() {
  // Journey and simulation state
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0)
  const [simulationTime, setSimulationTime] = useState(0)
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }>>([])
  const [totalDistanceKm, setTotalDistanceKm] = useState(0)
  const [truckPosition, setTruckPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [truckHeading, setTruckHeading] = useState(0)
  const [currentEtaMinutes, setCurrentEtaMinutes] = useState<number | null>(null)
  const [currentDistanceKm, setCurrentDistanceKm] = useState<number | null>(null)
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>('NOT_STARTED')
  const [stoppages, setStoppages] = useState<Stoppage[]>([])
  const [currentStoppage, setCurrentStoppage] = useState<Stoppage | null>(null)
  const [stoppageTimer, setStoppageTimer] = useState<number | null>(null)
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [isWaitingForCall, setIsWaitingForCall] = useState(false)
  const [nearDestinationTriggered, setNearDestinationTriggered] = useState(false)

  const simulationInterval = useRef<NodeJS.Timeout | null>(null)
  const lastTickTime = useRef<number>(Date.now())

  // Fetch journey details and initialize route
  const loadJourney = useCallback(async (journey: Journey) => {
    try {
      // Fetch full journey details
      const response = await fetch(`/api/journeys/${journey.id}`)
      const fullJourney = await response.json()
      
      setSelectedJourney(fullJourney)
      setJourneyStatus(fullJourney.status)
      setEvents(fullJourney.simulationEvents || [])
      setCallLogs(fullJourney.callLogs || [])
      
      // Fetch route from Mapbox Directions API
      const directionsResponse = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: fullJourney.originLat, lng: fullJourney.originLng },
          destination: { lat: fullJourney.destinationLat, lng: fullJourney.destinationLng },
        }),
      })
      
      if (!directionsResponse.ok) {
        throw new Error('Failed to fetch directions')
      }
      
      const directionsData = await directionsResponse.json()
      const route = directionsData.routes[0]
      
      // Convert Mapbox coordinates to our format
      const path = convertMapboxCoordinates(route.geometry.coordinates)
      setRoutePath(path)
      
      // Set total distance (Mapbox returns meters)
      const distanceKm = route.distance / 1000
      setTotalDistanceKm(distanceKm)
      
      // Generate stoppages
      const newStoppages = generateStoppages(2)
      setStoppages(newStoppages)
      
      // Reset simulation state
      setProgress(0)
      setSimulationTime(0)
      setTruckPosition({ lat: fullJourney.originLat, lng: fullJourney.originLng })
      setCurrentEtaMinutes(calculateETA(distanceKm, BASE_SPEED_KMH, speed))
      setCurrentDistanceKm(distanceKm)
      setNearDestinationTriggered(false)
      
      // Add event
      await addEvent({
        type: 'INFO',
        label: 'Journey loaded for simulation',
        details: {
          origin: fullJourney.originCity,
          destination: fullJourney.destinationCity,
          distanceKm: distanceKm.toFixed(1),
        },
      })
    } catch (error) {
      console.error('Error loading journey:', error)
      alert('Failed to load journey. Please check console for details.')
    }
  }, [speed])

  const addEvent = async (event: { type: string; label: string; details: any }) => {
    if (!selectedJourney) return
    
    try {
      const response = await fetch(`/api/journeys/${selectedJourney.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      
      if (response.ok) {
        const newEvent = await response.json()
        setEvents(prev => [newEvent, ...prev])
      }
    } catch (error) {
      console.error('Error adding event:', error)
    }
  }

  // Simulation tick
  const simulationTick = useCallback(async () => {
    if (!selectedJourney || !isSimulating || routePath.length === 0) return

    const now = Date.now()
    const deltaSeconds = (now - lastTickTime.current) / 1000
    lastTickTime.current = now

    setSimulationTime(prev => prev + deltaSeconds * speed)

    // Check for stoppage
    const stoppage = checkForStoppage(progress, stoppages)
    if (stoppage && !stoppage.triggered) {
      // Start stoppage
      stoppage.triggered = true
      setCurrentStoppage(stoppage)
      setStoppageTimer(stoppage.duration)
      setJourneyStatus('STOPPAGE')
      
      await addEvent({
        type: 'STOPPAGE',
        label: 'Stoppage started',
        details: {
          position: truckPosition,
          durationSeconds: stoppage.duration,
        },
      })
      
      return
    }

    // Handle active stoppage
    if (currentStoppage && stoppageTimer !== null) {
      const newTimer = stoppageTimer - deltaSeconds * speed
      if (newTimer <= 0) {
        // End stoppage
        setCurrentStoppage(null)
        setStoppageTimer(null)
        setJourneyStatus('IN_TRANSIT')
        
        await addEvent({
          type: 'STOPPAGE',
          label: 'Stoppage ended',
          details: { position: truckPosition },
        })
      } else {
        setStoppageTimer(newTimer)
      }
      return
    }

    // Update progress
    const newProgress = updateProgress(progress, deltaSeconds, totalDistanceKm, speed, BASE_SPEED_KMH)
    setProgress(newProgress)

    // Calculate position and heading
    const position = interpolatePosition(routePath, newProgress)
    const nextProgress = Math.min(newProgress + 0.001, 1)
    const nextPosition = interpolatePosition(routePath, nextProgress)
    const heading = calculateHeading(position, nextPosition)

    setTruckPosition(position)
    setTruckHeading(heading)

    // Calculate remaining distance and ETA
    const remainingDist = calculateRemainingDistance(routePath, newProgress, totalDistanceKm)
    const eta = calculateETA(remainingDist, BASE_SPEED_KMH, speed)

    setCurrentDistanceKm(remainingDist)
    setCurrentEtaMinutes(eta)

    // Update journey in backend
    await fetch(`/api/journeys/${selectedJourney.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentEtaMinutes: eta,
        currentDistanceToDestKm: remainingDist,
        status: journeyStatus,
      }),
    })

    // Check for near destination trigger
    if (eta < NEAR_DESTINATION_THRESHOLD_MINUTES && !nearDestinationTriggered && journeyStatus === 'IN_TRANSIT') {
      setNearDestinationTriggered(true)
      setJourneyStatus('NEAR_DESTINATION')
      
      await addEvent({
        type: 'STATE_CHANGE',
        label: `ETA now ${eta.toFixed(1)} min - near destination threshold triggered`,
        details: { etaMinutes: eta, position },
      })

      // Trigger call for load assignment
      triggerCallForLoad()
    }

    // Check for arrival at destination
    if (newProgress >= 1) {
      setIsSimulating(false)
      setJourneyStatus('UNLOADING')
      
      await addEvent({
        type: 'STATE_CHANGE',
        label: 'Arrived at destination - unloading started',
        details: { position: selectedJourney.destinationCity },
      })

      // Start unloading timer
      setTimeout(async () => {
        await addEvent({
          type: 'STATE_CHANGE',
          label: 'Unloading completed',
          details: {},
        })

        // Check if there's an assigned load
        if (selectedJourney.assignedLoadId) {
          await addEvent({
            type: 'INFO',
            label: 'Starting next load journey',
            details: { loadId: selectedJourney.assignedLoadId },
          })
          // TODO: Implement next load route simulation
        } else {
          setJourneyStatus('COMPLETED')
          await fetch(`/api/journeys/${selectedJourney.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'COMPLETED' }),
          })
        }
      }, UNLOADING_DURATION_SECONDS * 1000)
    }
  }, [
    selectedJourney,
    isSimulating,
    routePath,
    progress,
    speed,
    totalDistanceKm,
    journeyStatus,
    stoppages,
    currentStoppage,
    stoppageTimer,
    truckPosition,
    nearDestinationTriggered,
  ])

  const triggerCallForLoad = async () => {
    if (!selectedJourney || isWaitingForCall) return

    setIsWaitingForCall(true)

    try {
      const response = await fetch(`/api/journeys/${selectedJourney.id}/trigger-call`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setCallLogs(prev => [data.callLog, ...prev])
        await addEvent({
          type: 'CALL',
          label: `Call initiated for load: ${data.load.pickupCity} → ${data.load.dropCity}`,
          details: data,
        })
      } else {
        await addEvent({
          type: 'ERROR',
          label: data.error || 'Failed to initiate call',
          details: data,
        })
      }
    } catch (error) {
      console.error('Error triggering call:', error)
    } finally {
      setIsWaitingForCall(false)
    }
  }

  // Simulation controls
  const handleStart = () => {
    if (!selectedJourney) return
    
    setIsSimulating(true)
    if (journeyStatus === 'NOT_STARTED') {
      setJourneyStatus('IN_TRANSIT')
      addEvent({
        type: 'STATE_CHANGE',
        label: 'Journey started',
        details: { origin: selectedJourney.originCity },
      })
    }
    lastTickTime.current = Date.now()
  }

  const handlePause = () => {
    setIsSimulating(false)
  }

  const handleReset = async () => {
    setIsSimulating(false)
    setProgress(0)
    setSimulationTime(0)
    setJourneyStatus('NOT_STARTED')
    setCurrentStoppage(null)
    setStoppageTimer(null)
    setNearDestinationTriggered(false)
    
    if (selectedJourney) {
      setTruckPosition({ lat: selectedJourney.originLat, lng: selectedJourney.originLng })
      setCurrentEtaMinutes(calculateETA(totalDistanceKm, BASE_SPEED_KMH, speed))
      setCurrentDistanceKm(totalDistanceKm)
      
      // Reset stoppages
      const newStoppages = generateStoppages(2)
      setStoppages(newStoppages)
      
      await fetch(`/api/journeys/${selectedJourney.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'NOT_STARTED',
          currentEtaMinutes: null,
          currentDistanceToDestKm: null,
        }),
      })

      await addEvent({
        type: 'INFO',
        label: 'Simulation reset',
        details: {},
      })
    }
  }

  const handleJumpNearDestination = () => {
    const targetProgress = 0.85 // Jump to 85% of route
    setProgress(targetProgress)
    
    const position = interpolatePosition(routePath, targetProgress)
    setTruckPosition(position)
    
    const remainingDist = calculateRemainingDistance(routePath, targetProgress, totalDistanceKm)
    const eta = calculateETA(remainingDist, BASE_SPEED_KMH, speed)
    
    setCurrentDistanceKm(remainingDist)
    setCurrentEtaMinutes(eta)
    
    addEvent({
      type: 'INFO',
      label: 'Jumped near destination',
      details: { progress: targetProgress, etaMinutes: eta },
    })
  }

  // Setup simulation interval
  useEffect(() => {
    if (isSimulating) {
      simulationInterval.current = setInterval(simulationTick, SIMULATION_TICK_MS)
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current)
        simulationInterval.current = null
      }
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current)
      }
    }
  }, [isSimulating, simulationTick])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Map */}
      <div className="w-3/5 h-full">
        <MapboxMapView
          origin={selectedJourney ? { lat: selectedJourney.originLat, lng: selectedJourney.originLng } : undefined}
          destination={selectedJourney ? { lat: selectedJourney.destinationLat, lng: selectedJourney.destinationLng } : undefined}
          truckPosition={truckPosition || undefined}
          truckHeading={truckHeading}
          routePath={routePath}
          isStoppage={journeyStatus === 'STOPPAGE'}
        />
      </div>

      {/* Right Panel - Controls and Info */}
      <div className="w-2/5 h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Load Assignment Agent</h1>
          <div className="flex gap-2">
            <a
              href="/journeys"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Manage Journeys
            </a>
            <a
              href="/loads"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Manage Loads
            </a>
          </div>
        </div>

        <JourneySelector
          onSelectJourney={loadJourney}
          selectedJourneyId={selectedJourney?.id}
        />

        {selectedJourney && (
          <>
            <SimulationControls
              isSimulating={isSimulating}
              speed={speed}
              journeyStatus={journeyStatus}
              currentEtaMinutes={currentEtaMinutes}
              currentDistanceKm={currentDistanceKm}
              simulationTime={Math.floor(simulationTime)}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onJumpNearDestination={handleJumpNearDestination}
              onSpeedChange={setSpeed}
            />

            <JourneyInfoCard
              journey={selectedJourney}
              assignedLoad={selectedJourney.assignedLoad}
            />

            <CallStatusCard
              callLogs={callLogs}
              isWaitingForResponse={isWaitingForCall}
            />

            <EventTimeline events={events} />
          </>
        )}
      </div>
    </div>
  )
}

