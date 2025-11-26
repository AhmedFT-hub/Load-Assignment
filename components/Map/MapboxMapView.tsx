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
  nextLoadRoute?: {
    toPickup?: Array<{ lat: number; lng: number }>
    toDestination?: Array<{ lat: number; lng: number }>
  }
}

export default function MapboxMapView({
  origin,
  destination,
  truckPosition,
  truckHeading = 0,
  routePath = [],
  isStoppage = false,
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
            <Marker longitude={truckPosition.lng} latitude={truckPosition.lat}>
              <div
                className={`text-2xl ${isStoppage ? 'animate-pulse' : ''}`}
                style={{ transform: `rotate(${truckHeading}deg)` }}
              >
                🚚
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

