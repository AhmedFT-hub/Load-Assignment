'use client'

import { useEffect, useState, useCallback } from 'react'
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629, // Center of India
}

interface GoogleMapViewProps {
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

export default function GoogleMapView({
  origin,
  destination,
  truckPosition,
  truckHeading = 0,
  routePath = [],
  isStoppage = false,
  nextLoadRoute,
}: GoogleMapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  // Auto-fit bounds when route changes
  useEffect(() => {
    if (!map) return

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    if (origin) {
      bounds.extend(origin)
      hasPoints = true
    }
    if (destination) {
      bounds.extend(destination)
      hasPoints = true
    }
    if (routePath.length > 0) {
      routePath.forEach(point => bounds.extend(point))
      hasPoints = true
    }

    if (hasPoints) {
      map.fitBounds(bounds)
    }
  }, [map, origin, destination, routePath])

  // Truck icon with rotation
  const getTruckIcon = () => {
    if (typeof window === 'undefined') return undefined

    return {
      path: 'M17.5,14.33L13.5,10.33V6.67L17.5,2.67L21.5,6.67V10.33M20,8.33L17.5,5.83L15,8.33V9.67L17.5,12.17L20,9.67M23,11.67V15.67L21,17.67H18.5V16.83H17.5V17.67H15V16.83H14V17.67H11.5L9.5,15.67V11.67L11.5,9.67H23M13,13.5A1.17,1.17 0 0,1 14.17,14.67A1.17,1.17 0 0,1 13,15.83A1.17,1.17 0 0,1 11.83,14.67A1.17,1.17 0 0,1 13,13.5M21.5,13.5A1.17,1.17 0 0,1 22.67,14.67A1.17,1.17 0 0,1 21.5,15.83A1.17,1.17 0 0,1 20.33,14.67A1.17,1.17 0 0,1 21.5,13.5Z',
      fillColor: isStoppage ? '#ef4444' : '#2563eb',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.5,
      anchor: new google.maps.Point(17, 10),
      rotation: truckHeading,
    }
  }

  return (
    <div className="w-full h-full relative">
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={truckPosition || origin || defaultCenter}
          zoom={6}
          onLoad={onLoad}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {/* Origin marker */}
          {origin && (
            <Marker
              position={origin}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              }}
              title="Origin"
            />
          )}

          {/* Destination marker */}
          {destination && (
            <Marker
              position={destination}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
              }}
              title="Destination"
            />
          )}

          {/* Current route */}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#2563eb',
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          )}

          {/* Next load route - to pickup */}
          {nextLoadRoute?.toPickup && nextLoadRoute.toPickup.length > 0 && (
            <Polyline
              path={nextLoadRoute.toPickup}
              options={{
                strokeColor: '#10b981',
                strokeOpacity: 0.6,
                strokeWeight: 3,
                strokePattern: 'dashed',
              }}
            />
          )}

          {/* Next load route - to destination */}
          {nextLoadRoute?.toDestination && nextLoadRoute.toDestination.length > 0 && (
            <Polyline
              path={nextLoadRoute.toDestination}
              options={{
                strokeColor: '#f59e0b',
                strokeOpacity: 0.6,
                strokeWeight: 3,
                strokePattern: 'dashed',
              }}
            />
          )}

          {/* Truck marker */}
          {truckPosition && (
            <>
              <Marker
                position={truckPosition}
                icon={getTruckIcon()}
                title="Truck"
              />
              
              {/* Stoppage indicator */}
              {isStoppage && (
                <Marker
                  position={truckPosition}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#ef4444',
                    fillOpacity: 0.3,
                    strokeColor: '#ef4444',
                    strokeWeight: 2,
                    scale: 25,
                  }}
                />
              )}
            </>
          )}
        </GoogleMap>
      </LoadScript>
      
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

