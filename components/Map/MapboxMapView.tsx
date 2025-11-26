'use client'

import { useEffect, useRef, useState } from 'react'
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

interface MapboxMapViewProps {
  origin?: { lat: number; lng: number }
  destination?: { lat: number; lng: number }
  truckPosition?: { lat: number; lng: number }
  truckHeading?: number
  routePath?: Array<{ lat: number; lng: number }>
  isStoppage?: boolean
  isInGeofence?: boolean
  nextLoadRoute?: {
    toPickup?: Array<{ lat: number; lng: number }>
    toDestination?: Array<{ lat: number; lng: number }>
  }
}

// Helper function to create a circle (geofence) around a point
function createGeoJSONCircle(center: { lat: number; lng: number }, radiusInKm: number, points: number = 64) {
  const coords = {
    latitude: center.lat,
    longitude: center.lng,
  }

  const km = radiusInKm
  const ret = []
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
  const distanceY = km / 110.574

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI)
    const x = distanceX * Math.cos(theta)
    const y = distanceY * Math.sin(theta)

    ret.push([coords.longitude + x, coords.latitude + y])
  }
  ret.push(ret[0])

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [ret],
    },
    properties: {},
  }
}

export default function MapboxMapView({
  origin,
  destination,
  truckPosition,
  truckHeading = 0,
  routePath = [],
  isStoppage = false,
  isInGeofence = false,
  nextLoadRoute,
}: MapboxMapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 4,
  })

  // Auto-fit bounds when route changes
  useEffect(() => {
    if (!mapRef.current || routePath.length === 0) return

    const bounds: [[number, number], [number, number]] = [
      [
        Math.min(...routePath.map(p => p.lng)),
        Math.min(...routePath.map(p => p.lat))
      ],
      [
        Math.max(...routePath.map(p => p.lng)),
        Math.max(...routePath.map(p => p.lat))
      ]
    ]

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    })
  }, [routePath])

  // Convert route path to GeoJSON
  const routeGeoJSON = routePath.length > 0 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: routePath.map(p => [p.lng, p.lat]),
    },
  } : null

  // Next load route - to pickup
  const toPickupGeoJSON = nextLoadRoute?.toPickup && nextLoadRoute.toPickup.length > 0 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: nextLoadRoute.toPickup.map(p => [p.lng, p.lat]),
    },
  } : null

  // Next load route - to destination
  const toDestinationGeoJSON = nextLoadRoute?.toDestination && nextLoadRoute.toDestination.length > 0 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: nextLoadRoute.toDestination.map(p => [p.lng, p.lat]),
    },
  } : null

  // 10km geofence around destination
  const destinationGeofence = destination ? createGeoJSONCircle(destination, 10) : null

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={mapboxToken}
      >
        {/* Origin marker */}
        {origin && (
          <Marker longitude={origin.lng} latitude={origin.lat}>
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg" />
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker longitude={destination.lng} latitude={destination.lat}>
            <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg" />
          </Marker>
        )}

        {/* 10km Geofence around destination */}
        {destinationGeofence && (
          <Source id="destination-geofence" type="geojson" data={destinationGeofence}>
            <Layer
              id="geofence-fill"
              type="fill"
              paint={{
                'fill-color': isInGeofence ? '#f59e0b' : '#3b82f6',
                'fill-opacity': isInGeofence ? 0.15 : 0.1,
              }}
            />
            <Layer
              id="geofence-outline"
              type="line"
              paint={{
                'line-color': isInGeofence ? '#f59e0b' : '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.5,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Current route */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                'line-color': '#2563eb',
                'line-width': 4,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* Next load route - to pickup */}
        {toPickupGeoJSON && (
          <Source id="route-to-pickup" type="geojson" data={toPickupGeoJSON}>
            <Layer
              id="route-to-pickup-layer"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 3,
                'line-opacity': 0.6,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Next load route - to destination */}
        {toDestinationGeoJSON && (
          <Source id="route-to-destination" type="geojson" data={toDestinationGeoJSON}>
            <Layer
              id="route-to-destination-layer"
              type="line"
              paint={{
                'line-color': '#f59e0b',
                'line-width': 3,
                'line-opacity': 0.6,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Truck marker */}
        {truckPosition && (
          <>
            <Marker 
              longitude={truckPosition.lng} 
              latitude={truckPosition.lat}
              anchor="center"
            >
              <div
                className={`${isStoppage ? 'animate-pulse' : ''}`}
                style={{ 
                  transform: `rotate(${truckHeading}deg)`,
                  transformOrigin: 'center center',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 40 60" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}
                >
                  {/* TOP VIEW TRUCK - Front points UP (North at 0°) */}
                  
                  {/* Cargo/trailer area (back) */}
                  <rect x="8" y="20" width="24" height="35" rx="2" fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5"/>
                  
                  {/* Cargo details/lines */}
                  <line x1="12" y1="25" x2="28" y2="25" stroke="#1e40af" strokeWidth="0.8" opacity="0.5"/>
                  <line x1="12" y1="35" x2="28" y2="35" stroke="#1e40af" strokeWidth="0.8" opacity="0.5"/>
                  <line x1="12" y1="45" x2="28" y2="45" stroke="#1e40af" strokeWidth="0.8" opacity="0.5"/>
                  
                  {/* Truck cabin (front) */}
                  <path 
                    d="M 10 20 L 8 15 Q 8 8 12 5 L 28 5 Q 32 8 32 15 L 30 20 Z" 
                    fill="#2563eb" 
                    stroke="#1e40af" 
                    strokeWidth="1.5"
                  />
                  
                  {/* Windshield */}
                  <ellipse cx="20" cy="12" rx="8" ry="5" fill="#93c5fd" opacity="0.8"/>
                  <line x1="20" y1="7" x2="20" y2="17" stroke="#1e40af" strokeWidth="0.8" opacity="0.3"/>
                  
                  {/* Side mirrors */}
                  <rect x="4" y="14" width="3" height="4" rx="1" fill="#1e40af" stroke="#fff" strokeWidth="0.5"/>
                  <rect x="33" y="14" width="3" height="4" rx="1" fill="#1e40af" stroke="#fff" strokeWidth="0.5"/>
                  
                  {/* Front wheels */}
                  <rect x="6" y="16" width="3" height="6" rx="1.5" fill="#1f2937" stroke="#fff" strokeWidth="0.8"/>
                  <rect x="31" y="16" width="3" height="6" rx="1.5" fill="#1f2937" stroke="#fff" strokeWidth="0.8"/>
                  
                  {/* Rear wheels */}
                  <rect x="6" y="48" width="3" height="6" rx="1.5" fill="#1f2937" stroke="#fff" strokeWidth="0.8"/>
                  <rect x="31" y="48" width="3" height="6" rx="1.5" fill="#1f2937" stroke="#fff" strokeWidth="0.8"/>
                  
                  {/* Direction indicator - arrow on top of cabin */}
                  <path 
                    d="M 20 2 L 23 6 L 21 6 L 21 8 L 19 8 L 19 6 L 17 6 Z" 
                    fill="#fbbf24" 
                    stroke="#fff" 
                    strokeWidth="0.5"
                  />
                </svg>
              </div>
            </Marker>

            {/* Stoppage indicator */}
            {isStoppage && (
              <Marker longitude={truckPosition.lng} latitude={truckPosition.lat}>
                <div className="w-16 h-16 bg-red-500 rounded-full opacity-30 animate-ping" />
              </Marker>
            )}
          </>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Origin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span>Current Route</span>
          </div>
          {destination && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full border-2 ${isInGeofence ? 'border-orange-500 bg-orange-100' : 'border-blue-600 bg-blue-100'}`}></div>
              <span className={isInGeofence ? 'text-orange-600 font-semibold' : ''}>
                10km Geofence {isInGeofence && '(Inside)'}
              </span>
            </div>
          )}
          {isStoppage && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-red-600 font-semibold">Stoppage</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

