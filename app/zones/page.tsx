'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Zone, ZoneCategory } from '@/types'
import ZoneManager from '@/components/zones/ZoneManager'
import ZoneCreateDialog from '@/components/zones/ZoneCreateDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Plus } from 'lucide-react'

// Dynamically import Mapbox Map to avoid SSR issues
const MapboxMapView = dynamic(() => import('@/components/Map/MapboxMapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [isDrawingZone, setIsDrawingZone] = useState(false)
  const [drawingCoordinates, setDrawingCoordinates] = useState<Array<{ lat: number; lng: number }>>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/zones')
      if (!response.ok) {
        if (response.status === 500) {
          setZones([])
          return
        }
        throw new Error(`Failed to fetch zones: ${response.status}`)
      }
      const data = await response.json()
      setZones(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching zones:', error)
      setZones([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateZone = async (data: { name: string; category: ZoneCategory; description?: string }) => {
    try {
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          coordinates: drawingCoordinates,
        }),
      })

      if (!response.ok) throw new Error('Failed to create zone')

      await fetchZones()
      setDrawingCoordinates([])
      setIsDrawingZone(false)
    } catch (error) {
      console.error('Error creating zone:', error)
      alert('Failed to create zone')
    }
  }

  const handleDeleteZone = async (zoneId: string) => {
    await fetchZones()
  }

  const handleStartDrawing = () => {
    setIsDrawingZone(true)
    setDrawingCoordinates([])
    setSelectedZoneId(null)
  }

  const handleFinishDrawing = (coords: Array<{ lat: number; lng: number }>) => {
    setIsDrawingZone(false)
    setDrawingCoordinates(coords.length > 0 ? coords : [])
    if (coords.length === 0) {
      fetchZones()
    }
  }

  const handleCancelDrawing = () => {
    setIsDrawingZone(false)
    setDrawingCoordinates([])
  }

  const handleZoneSelect = (zone: Zone) => {
    setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Map Section */}
      <div className="flex-1 relative">
        <MapboxMapView
          zones={zones}
          isDrawingZone={isDrawingZone}
          drawingCoordinates={drawingCoordinates}
          onZoneComplete={(coords) => {
            setDrawingCoordinates(coords)
          }}
        />
      </div>

      {/* Sidebar */}
      <div className="w-96 border-l bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold">Zones</h2>
              <p className="text-sm text-muted-foreground">Manage risk zones on the map</p>
            </div>
            <Button size="sm" onClick={handleStartDrawing}>
              <Plus className="h-4 w-4 mr-2" />
              Draw Zone
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Drawing Instructions */}
            {isDrawingZone && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click on the map to draw a zone polygon
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {drawingCoordinates.length > 0 
                        ? `${drawingCoordinates.length} points clicked. Need at least 3 points.`
                        : 'Click at least 3 points to form a polygon'
                      }
                    </p>
                    <div className="flex gap-2 justify-center mt-3">
                      {drawingCoordinates.length >= 3 && (
                        <Button size="sm" onClick={() => handleFinishDrawing(drawingCoordinates)}>
                          Finish Drawing ({drawingCoordinates.length} points)
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleCancelDrawing}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zone Creation Dialog */}
            {!isDrawingZone && drawingCoordinates.length >= 3 && (
              <ZoneCreateDialog
                coordinates={drawingCoordinates}
                onSave={handleCreateZone}
                onCancel={handleCancelDrawing}
              />
            )}

            {/* Zones List */}
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading zones...</div>
            ) : (
              <ZoneManager
                zones={zones}
                onZoneSelect={handleZoneSelect}
                onZoneDelete={handleDeleteZone}
                selectedZoneId={selectedZoneId}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

