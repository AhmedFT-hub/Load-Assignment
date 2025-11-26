'use client'

import { useState, useEffect } from 'react'
import { Journey } from '@/types'
import { format } from 'date-fns'
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
      
      if (!response.ok) {
        console.error('Failed to fetch journeys:', response.status, response.statusText)
        setJourneys([])
        return
      }
      
      const data = await response.json()
      
      // Ensure data is an array (handle error responses)
      if (Array.isArray(data)) {
        setJourneys(data)
      } else if (data.error) {
        console.error('API error:', data.error)
        setJourneys([])
      } else {
        console.error('API returned non-array data:', data)
        setJourneys([])
      }
    } catch (error) {
      console.error('Error fetching journeys:', error)
      setJourneys([])
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
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Select Journey</h3>
        <p className="text-xs text-muted-foreground">Choose a journey to simulate</p>
      </div>

      {/* Journey list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-3 pb-3">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            ) : journeys.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No journeys found</div>
            ) : (
              journeys.map((journey) => (
                <div
                  key={journey.id}
                  className={cn(
                    "rounded-lg border p-3 cursor-pointer transition-all hover:bg-accent/50",
                    selectedJourneyId === journey.id && "border-primary bg-accent"
                  )}
                  onClick={() => onSelectJourney(journey)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="line-clamp-1">{journey.originCity} → {journey.destinationCity}</span>
                    </div>
                    <Badge variant={getStatusVariant(journey.status)} className="text-xs flex-shrink-0 ml-2">
                      {journey.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{journey.driverName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Truck className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{journey.vehicleNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {format(new Date(journey.plannedETA), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                  {selectedJourneyId !== journey.id && (
                    <Button
                      size="sm"
                      className="w-full h-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectJourney(journey)
                      }}
                    >
                      Simulate
                    </Button>
                  )}
                </div>
              ))
            )}
        </div>
      </ScrollArea>
    </div>
  )
}

