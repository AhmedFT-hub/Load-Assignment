'use client'

import { useState, useEffect } from 'react'
import { Zone, ZoneCategory } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import ZoneManager from './ZoneManager'
import ZoneCreateDialog from './ZoneCreateDialog'
import { Plus, MapPin } from 'lucide-react'

interface ZonesTabProps {
  onZoneSelect?: (zone: Zone) => void
  selectedZoneId?: string | null
  onStartDrawing?: () => void
  onFinishDrawing?: (coordinates: Array<{ lat: number; lng: number }>) => void
  drawingCoordinates?: Array<{ lat: number; lng: number }>
  isDrawing?: boolean
}

export default function ZonesTab({ 
  onZoneSelect, 
  selectedZoneId,
  onStartDrawing,
  onFinishDrawing,
  drawingCoordinates = [],
  isDrawing = false,
}: ZonesTabProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/zones')
      const data = await response.json()
      setZones(data)
    } catch (error) {
      console.error('Error fetching zones:', error)
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
      onFinishDrawing?.([])
    } catch (error) {
      console.error('Error creating zone:', error)
      alert('Failed to create zone')
    }
  }

  const handleDeleteZone = async (zoneId: string) => {
    await fetchZones()
  }

  const handleStartDrawing = () => {
    onStartDrawing?.()
  }

  const handleCancelDrawing = () => {
    onFinishDrawing?.([])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Zones</h3>
          <p className="text-xs text-muted-foreground">Manage risk zones on the map</p>
        </div>
        <Button size="sm" onClick={handleStartDrawing}>
          <Plus className="h-4 w-4 mr-2" />
          Draw Zone
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading zones...</div>
      ) : (
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <ZoneManager
            zones={zones}
            onZoneSelect={onZoneSelect}
            onZoneDelete={handleDeleteZone}
            selectedZoneId={selectedZoneId}
          />
        </ScrollArea>
      )}

      {isDrawing && drawingCoordinates.length < 3 && (
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
                  <Button size="sm" onClick={() => onFinishDrawing?.(drawingCoordinates)}>
                    Finish Drawing
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

      {!isDrawing && drawingCoordinates.length >= 3 && (
        <ZoneCreateDialog
          coordinates={drawingCoordinates}
          onSave={handleCreateZone}
          onCancel={handleCancelDrawing}
        />
      )}
    </div>
  )
}

