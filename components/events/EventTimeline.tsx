'use client'

import { SimulationEvent } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Info, MapPin, Phone, Bell, Package, AlertTriangle, Activity, AlertCircle } from 'lucide-react'

interface EventTimelineProps {
  events: SimulationEvent[]
}

export default function EventTimeline({ events }: EventTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'INFO':
        return Info
      case 'TRACKING':
        return MapPin
      case 'CALL':
        return Phone
      case 'WEBHOOK':
        return Bell
      case 'LOAD':
        return Package
      case 'ERROR':
        return AlertTriangle
      case 'STATE_CHANGE':
        return Activity
      case 'STOPPAGE':
        return AlertCircle
      default:
        return Info
    }
  }

  const getEventVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'ERROR':
        return 'destructive'
      case 'STATE_CHANGE':
      case 'CALL':
        return 'default'
      case 'STOPPAGE':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'ERROR':
        return 'text-destructive'
      case 'STATE_CHANGE':
      case 'CALL':
        return 'text-primary'
      case 'STOPPAGE':
        return 'text-yellow-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Event Timeline</CardTitle>
        <CardDescription>{events.length} events recorded</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-4">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No events yet</p>
              </div>
            ) : (
              events.map((event, index) => {
                const Icon = getEventIcon(event.type)
                const isLatest = index === 0

                return (
                  <div
                    key={event.id}
                    className={`relative flex gap-3 ${isLatest ? 'pb-3 border-b' : ''}`}
                  >
                    {/* Timeline line */}
                    {index !== events.length - 1 && (
                      <div className="absolute left-[11px] top-8 w-0.5 h-full bg-border" />
                    )}

                    {/* Icon */}
                    <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-background ${
                      isLatest ? 'border-primary' : 'border-border'
                    }`}>
                      <Icon className={`h-3 w-3 ${getEventColor(event.type)}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none">{event.label}</p>
                        </div>
                        <Badge variant={getEventVariant(event.type)} className="text-xs flex-shrink-0">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), 'HH:mm:ss')}
                      </p>
                      {event.details && Object.keys(event.details).length > 0 && (
                        <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key} className="flex gap-1">
                              <span className="font-medium">{key}:</span>
                              <span className="truncate">{JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}



