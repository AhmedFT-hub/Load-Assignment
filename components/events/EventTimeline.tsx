'use client'

import { useState } from 'react'
import { SimulationEvent } from '@/types'
import { format } from 'date-fns'

interface EventTimelineProps {
  events: SimulationEvent[]
}

export default function EventTimeline({ events }: EventTimelineProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'INFO':
        return 'bg-blue-100 text-blue-800'
      case 'TRACKING':
        return 'bg-purple-100 text-purple-800'
      case 'CALL':
        return 'bg-green-100 text-green-800'
      case 'WEBHOOK':
        return 'bg-teal-100 text-teal-800'
      case 'LOAD':
        return 'bg-indigo-100 text-indigo-800'
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      case 'STATE_CHANGE':
        return 'bg-orange-100 text-orange-800'
      case 'STOPPAGE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'INFO':
        return 'ℹ️'
      case 'TRACKING':
        return '📍'
      case 'CALL':
        return '📞'
      case 'WEBHOOK':
        return '🔔'
      case 'LOAD':
        return '📦'
      case 'ERROR':
        return '⚠️'
      case 'STATE_CHANGE':
        return '🔄'
      case 'STOPPAGE':
        return '⏸️'
      default:
        return '•'
    }
  }

  const toggleExpand = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Event Timeline</h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No events yet. Start simulation to see events.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              <div
                className="flex items-start gap-2 cursor-pointer"
                onClick={() => toggleExpand(event.id)}
              >
                <span className="text-lg">{getEventIcon(event.type)}</span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium">
                    {event.label}
                  </div>
                </div>
                
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  {expandedEventId === event.id ? '▼' : '▶'}
                </button>
              </div>

              {/* Expanded details */}
              {expandedEventId === event.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-2">Details:</div>
                    <pre className="bg-gray-50 rounded p-2 overflow-x-auto text-xs text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    <div>Event ID: {event.id}</div>
                    <div>Timestamp: {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}</div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

