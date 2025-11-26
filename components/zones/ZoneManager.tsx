'use client'

import { useState, useEffect } from 'react'
import { Zone, ZoneCategory } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Edit, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZoneManagerProps {
  zones: Zone[]
  onZoneSelect?: (zone: Zone) => void
  onZoneDelete?: (zoneId: string) => void
  selectedZoneId?: string | null
}

const CATEGORY_COLORS: Record<ZoneCategory, string> = {
  THEFT: 'bg-red-500',
  PILFERAGE: 'bg-orange-500',
  STOPPAGE: 'bg-yellow-500',
  HIGH_RISK: 'bg-red-700',
  ACCIDENT_PRONE: 'bg-orange-700',
  TRAFFIC_CONGESTION: 'bg-amber-600',
  CUSTOM: 'bg-indigo-500',
}

const CATEGORY_LABELS: Record<ZoneCategory, string> = {
  THEFT: 'Theft',
  PILFERAGE: 'Pilferage',
  STOPPAGE: 'Stoppage',
  HIGH_RISK: 'High Risk',
  ACCIDENT_PRONE: 'Accident Prone',
  TRAFFIC_CONGESTION: 'Traffic Congestion',
  CUSTOM: 'Custom',
}

export default function ZoneManager({
  zones,
  onZoneSelect,
  onZoneDelete,
  selectedZoneId,
}: ZoneManagerProps) {
  const handleDelete = async (zoneId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this zone?')) {
      try {
        await fetch(`/api/zones/${zoneId}`, { method: 'DELETE' })
        onZoneDelete?.(zoneId)
      } catch (error) {
        console.error('Error deleting zone:', error)
        alert('Failed to delete zone')
      }
    }
  }

  return (
    <div className="space-y-2">
      {zones.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No zones created yet
        </div>
      ) : (
        zones.map((zone) => (
          <div
            key={zone.id}
            className={cn(
              "rounded-lg border p-3 cursor-pointer transition-all hover:bg-accent/50",
              selectedZoneId === zone.id && "border-primary bg-accent"
            )}
            onClick={() => onZoneSelect?.(zone)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    CATEGORY_COLORS[zone.category]
                  )}
                />
                <span className="font-medium text-sm">{zone.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[zone.category]}
              </Badge>
            </div>
            {zone.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {zone.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {zone.coordinates.length} points
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => handleDelete(zone.id, e)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

