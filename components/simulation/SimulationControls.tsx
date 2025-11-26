'use client'

import { JourneyStatus } from '@/types'

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

const SPEED_OPTIONS = [1, 2, 3, 5, 10, 20]

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

  const getStatusBadgeColor = (status: JourneyStatus) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800'
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800'
      case 'NEAR_DESTINATION':
        return 'bg-yellow-100 text-yellow-800'
      case 'UNLOADING':
        return 'bg-purple-100 text-purple-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'STOPPAGE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Simulation Controls</h3>
      
      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        {!isSimulating ? (
          <button
            onClick={onStart}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {journeyStatus === 'NOT_STARTED' ? 'Start Simulation' : 'Resume'}
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Pause
          </button>
        )}
        
        <button
          onClick={onReset}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      <button
        onClick={onJumpNearDestination}
        disabled={journeyStatus === 'COMPLETED' || journeyStatus === 'NEAR_DESTINATION'}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mb-4"
      >
        Jump Near Destination
      </button>

      {/* Speed control */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Speed: {speed}x
        </label>
        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SPEED_OPTIONS.map(s => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>
      </div>

      {/* Status display */}
      <div className="space-y-3 border-t pt-4">
        <div>
          <span className="text-sm text-gray-600">Simulation Time:</span>
          <div className="text-xl font-mono font-semibold text-gray-900">
            {formatTime(simulationTime)}
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-600">Journey Status:</span>
          <div className="mt-1">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(journeyStatus)}`}>
              {journeyStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {currentEtaMinutes !== null && currentEtaMinutes !== undefined && (
          <div>
            <span className="text-sm text-gray-600">Current ETA:</span>
            <div className="text-lg font-semibold text-gray-900">
              {currentEtaMinutes.toFixed(1)} min
            </div>
          </div>
        )}

        {currentDistanceKm !== null && currentDistanceKm !== undefined && (
          <div>
            <span className="text-sm text-gray-600">Remaining Distance:</span>
            <div className="text-lg font-semibold text-gray-900">
              {currentDistanceKm.toFixed(1)} km
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

