'use client'

import { useState, useEffect } from 'react'
import { Journey } from '@/types'
import { format } from 'date-fns'

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

  const getStatusBadgeColor = (status: string) => {
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
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Select Journey</h3>
      
      {/* Filters */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Filter by origin..."
          value={filters.originCity}
          onChange={(e) => setFilters({ ...filters, originCity: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by destination..."
          value={filters.destinationCity}
          onChange={(e) => setFilters({ ...filters, destinationCity: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by driver..."
          value={filters.driverName}
          onChange={(e) => setFilters({ ...filters, driverName: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by vehicle..."
          value={filters.vehicleNumber}
          onChange={(e) => setFilters({ ...filters, vehicleNumber: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="NEAR_DESTINATION">Near Destination</option>
          <option value="UNLOADING">Unloading</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Journey list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : journeys.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No journeys found</div>
        ) : (
          journeys.map((journey) => (
            <div
              key={journey.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedJourneyId === journey.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
              onClick={() => onSelectJourney(journey)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-sm text-gray-900">
                  {journey.originCity} → {journey.destinationCity}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeColor(journey.status)}`}>
                  {journey.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-0.5">
                <div>Driver: {journey.driverName}</div>
                <div>Vehicle: {journey.vehicleNumber}</div>
                <div>ETA: {format(new Date(journey.plannedETA), 'MMM dd, HH:mm')}</div>
              </div>
              {selectedJourneyId !== journey.id && (
                <button
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectJourney(journey)
                  }}
                >
                  Simulate Journey
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

