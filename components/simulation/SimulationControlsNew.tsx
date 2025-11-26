'use client'

import { JourneyStatus } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, RotateCcw, FastForward, Gauge, Clock, Navigation } from 'lucide-react'

interface SimulationControlsProps {
  isSimulating: boolean
  speed: number
  journeyStatus: JourneyStatus
  currentEtaMinutes?: number | null
  currentDistanceKm?: number | null
  simulationTime: number
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onJumpNearDestination: () => void
  onSpeedChange: (speed: number) => void
}

const SPEED_OPTIONS = [1, 2, 5, 10, 20, 50, 100]

export default function SimulationControls({
  isSimulating,
  speed,
  journeyStatus,
  currentEtaMinutes,
  currentDistanceKm,
  simulationTime,
  onStart,
  onPause,
  onReset,
  onJumpNearDestination,
  onSpeedChange,
}: SimulationControlsProps) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusVariant = (status: JourneyStatus): "default" | "secondary" | "destructive" | "outline" => {
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Controls</CardTitle>
            <CardDescription>Manage simulation</CardDescription>
          </div>
          <Badge variant={getStatusVariant(journeyStatus)}>
            {journeyStatus.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {!isSimulating ? (
            <Button onClick={onStart} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {journeyStatus === 'NOT_STARTED' ? 'Start' : 'Resume'}
            </Button>
          ) : (
            <Button onClick={onPause} variant="secondary" className="w-full">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          <Button onClick={onReset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {journeyStatus !== 'COMPLETED' && journeyStatus !== 'NEAR_DESTINATION' && (
          <Button onClick={onJumpNearDestination} variant="outline" className="w-full" size="sm">
            <FastForward className="h-4 w-4 mr-2" />
            Jump to Geofence
          </Button>
        )}

        <Separator />

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Sim Time
            </div>
            <span className="font-mono font-medium">{formatTime(simulationTime)}</span>
          </div>

          {currentEtaMinutes !== null && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <Navigation className="h-4 w-4 mr-2" />
                ETA
              </div>
              <span className="font-medium">{currentEtaMinutes.toFixed(1)} min</span>
            </div>
          )}

          {currentDistanceKm !== null && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <Gauge className="h-4 w-4 mr-2" />
                Distance
              </div>
              <span className="font-medium">{currentDistanceKm.toFixed(1)} km</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Speed</span>
            <Badge variant="outline">{speed}x</Badge>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {SPEED_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={speed === option ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-0"
                onClick={() => onSpeedChange(option)}
              >
                {option}x
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

