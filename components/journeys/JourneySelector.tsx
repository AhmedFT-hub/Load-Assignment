'use client'

import { useState, useEffect } from 'react'
import { Journey } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Calendar, Truck, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JourneySelectorProps {
  onSelectJourney: (journey: Journey) => void
  selectedJourneyId?: string | null
}

export default function JourneySelector({ onSelectJourney, selectedJourneyId }: JourneySelectorProps) {
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    originCity: '',
    destinationCity: '',
    driverName: '',
    vehicleNumber: '',
    transporterName: '',
    status: '',
  })

  useEffect(() => {
    fetchJourneys()
  }, [filters])

  const fetchJourneys = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      
      const response = await fetch(`/api/journeys?${params.toString()}`)
      const data = await response.json()
      setJourneys(data)
    } catch (error) {
      console.error('Error fetching journeys:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'IN_TRANSIT':
        return 'default'
      case 'NEAR_DESTINATION':
        return 'secondary'
      case 'STOPPAGE':
        return 'destructive'
      case 'COMPLETED':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Select Journey</CardTitle>
        <CardDescription>Choose a journey to simulate</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compact Filters */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Filter by origin..."
            value={filters.originCity}
            onChange={(e) => setFilters({ ...filters, originCity: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <input
            type="text"
            placeholder="Filter by destination..."
            value={filters.destinationCity}
            onChange={(e) => setFilters({ ...filters, destinationCity: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Journey list */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            ) : journeys.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No journeys found</div>
            ) : (
              journeys.map((journey) => (
                <Card
                  key={journey.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedJourneyId === journey.id && "ring-2 ring-primary"
                  )}
                  onClick={() => onSelectJourney(journey)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {journey.originCity} → {journey.destinationCity}
                      </div>
                      <Badge variant={getStatusVariant(journey.status)} className="text-xs">
                        {journey.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {journey.driverName}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Truck className="h-3 w-3" />
                        {journey.vehicleNumber}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(journey.plannedETA), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                    {selectedJourneyId !== journey.id && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectJourney(journey)
                        }}
                      >
                        Simulate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

