'use client'

import { useEffect, useRef, useState } from 'react'
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import MapPinCard from './MapPinCard'
import { Zone } from '@/types'

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

interface MapboxMapViewProps {
  origin?: { lat: number; lng: number }
  destination?: { lat: number; lng: number }
  truckPosition?: { lat: number; lng: number }
  truckHeading?: number
  routePath?: Array<{ lat: number; lng: number }>
  completedPath?: Array<{ lat: number; lng: number }>
  isStoppage?: boolean
  isInGeofence?: boolean
  nextLoadPickup?: { lat: number; lng: number }
  nextLoadDrop?: { lat: number; lng: number }
  nextLoadRoute?: {
    toPickup?: Array<{ lat: number; lng: number }>
    toDestination?: Array<{ lat: number; lng: number }>
  }
  alerts?: Array<{
    id: string
    position: { lat: number; lng: number }
    title: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
    show: boolean
  }>
  onAlertClose?: (id: string) => void
  zones?: Zone[]
  isDrawingZone?: boolean
  onZoneComplete?: (coordinates: Array<{ lat: number; lng: number }>) => void
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
  completedPath = [],
  isStoppage = false,
  isInGeofence = false,
  nextLoadPickup,
  nextLoadDrop,
  nextLoadRoute,
  alerts = [],
  onAlertClose,
  zones = [],
  isDrawingZone = false,
  onZoneComplete,
}: MapboxMapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 4,
  })
  const [drawingPoints, setDrawingPoints] = useState<Array<{ lat: number; lng: number }>>([])

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

  // Convert route path to GeoJSON (full planned route - dotted)
  const routeGeoJSON = routePath.length > 0 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: routePath.map(p => [p.lng, p.lat]),
    },
  } : null

  // Completed path GeoJSON (solid line showing progress)
  const completedGeoJSON = completedPath.length > 1 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: completedPath.map(p => [p.lng, p.lat]),
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

  // Convert zones to GeoJSON
  const zonesGeoJSON = zones.map(zone => ({
    type: 'Feature' as const,
    properties: {
      id: zone.id,
      name: zone.name,
      category: zone.category,
      color: zone.color,
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[...zone.coordinates.map(p => [p.lng, p.lat]), zone.coordinates[0] ? [zone.coordinates[0].lng, zone.coordinates[0].lat] : []]],
    },
  }))

  // Drawing polygon GeoJSON
  const drawingPolygonGeoJSON = drawingPoints.length >= 3 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[...drawingPoints.map(p => [p.lng, p.lat]), drawingPoints[0] ? [drawingPoints[0].lng, drawingPoints[0].lat] : []]],
    },
  } : null

  // Handle map click for zone drawing
  const handleMapClick = (e: any) => {
    if (!isDrawingZone) return
    
    const { lng, lat } = e.lngLat
    const newPoints = [...drawingPoints, { lat, lng }]
    setDrawingPoints(newPoints)
    
    // If we have at least 3 points, allow completion
    if (newPoints.length >= 3 && onZoneComplete) {
      // Don't auto-complete, let user finish manually
    }
  }

  // Reset drawing when mode changes
  useEffect(() => {
    if (!isDrawingZone) {
      setDrawingPoints([])
    }
  }, [isDrawingZone])

  return (
    <div className="w-full h-full relative">
      {isDrawingZone && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          Click on map to draw zone polygon. Click 3+ points, then click "Finish" button.
        </div>
      )}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={mapboxToken}
        cursor={isDrawingZone ? 'crosshair' : 'default'}
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

        {/* Next load pickup marker */}
        {nextLoadPickup && (
          <Marker longitude={nextLoadPickup.lng} latitude={nextLoadPickup.lat}>
            <div className="relative">
              <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                Next Pickup
              </div>
            </div>
          </Marker>
        )}

        {/* Next load drop marker */}
        {nextLoadDrop && (
          <Marker longitude={nextLoadDrop.lng} latitude={nextLoadDrop.lat}>
            <div className="relative">
              <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                Next Drop
              </div>
            </div>
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

        {/* Zones */}
        {zonesGeoJSON.map((zoneGeoJSON, index) => {
          const zone = zones[index]
          const color = zone.color || '#6366f1'
          return (
            <Source key={zone.id} id={`zone-${zone.id}`} type="geojson" data={zoneGeoJSON}>
              <Layer
                id={`zone-fill-${zone.id}`}
                type="fill"
                paint={{
                  'fill-color': color,
                  'fill-opacity': 0.2,
                }}
              />
              <Layer
                id={`zone-outline-${zone.id}`}
                type="line"
                paint={{
                  'line-color': color,
                  'line-width': 2,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )
        })}

        {/* Drawing polygon */}
        {drawingPolygonGeoJSON && (
          <Source id="drawing-polygon" type="geojson" data={drawingPolygonGeoJSON}>
            <Layer
              id="drawing-polygon-fill"
              type="fill"
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.15,
              }}
            />
            <Layer
              id="drawing-polygon-outline"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Drawing points */}
        {isDrawingZone && drawingPoints.map((point, index) => (
          <Marker key={index} longitude={point.lng} latitude={point.lat}>
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
          </Marker>
        ))}

        {/* Planned route (dotted) - remaining path */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 4,
                'line-opacity': 0.85,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Completed path (solid) - already traveled */}
        {completedGeoJSON && (
          <Source id="completed-route" type="geojson" data={completedGeoJSON}>
            <Layer
              id="completed-route-layer"
              type="line"
              paint={{
                'line-color': '#2563eb',
                'line-width': 5,
                'line-opacity': 1,
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

        {/* Map Pin Alert Cards */}
        {alerts.map((alert) => (
          <MapPinCard
            key={alert.id}
            position={alert.position}
            title={alert.title}
            message={alert.message}
            type={alert.type}
            show={alert.show}
            onClose={() => onAlertClose?.(alert.id)}
          />
        ))}
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
            <div className="w-8 h-0.5 bg-blue-600"></div>
            <span>Traveled Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-blue-300"></div>
            <span>Planned Route</span>
          </div>
          {destination && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full border-2 ${isInGeofence ? 'border-orange-500 bg-orange-100' : 'border-blue-600 bg-blue-100'}`}></div>
              <span className={isInGeofence ? 'text-orange-600 font-semibold' : ''}>
                10km Geofence {isInGeofence && '(Inside)'}
              </span>
            </div>
          )}
          {(nextLoadRoute?.toPickup || nextLoadRoute?.toDestination) && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-green-500"></div>
                <span className="text-green-700">To Next Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-orange-500"></div>
                <span className="text-orange-700">To Next Drop</span>
              </div>
            </>
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

