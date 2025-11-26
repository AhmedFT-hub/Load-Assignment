'use client'

import { CallLog } from '@/types'
import { format } from 'date-fns'

interface CallStatusCardProps {
  callLogs: CallLog[]
  isWaitingForResponse?: boolean
}

export default function CallStatusCard({ callLogs, isWaitingForResponse }: CallStatusCardProps) {
  const latestCall = callLogs[0]

  const getOutcomeBadgeColor = (outcome: string) => {
    switch (outcome) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'NO_ANSWER':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'BUSY':
        return 'bg-orange-100 text-orange-800'
      case 'UNKNOWN':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Call Status</h3>
      
      {isWaitingForResponse && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-yellow-800 font-medium">
              Waiting for Ringg.ai response...
            </span>
          </div>
        </div>
      )}

      {!latestCall && !isWaitingForResponse ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No calls initiated yet
        </div>
      ) : latestCall ? (
        <div className="space-y-4">
          {/* Latest call */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-gray-900">Latest Call</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getOutcomeBadgeColor(latestCall.outcome)}`}>
                {latestCall.outcome.replace('_', ' ')}
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs text-gray-600">
              {latestCall.load && (
                <div>
                  <span className="font-medium">Load:</span> {latestCall.load.pickupCity} → {latestCall.load.dropCity}
                </div>
              )}
              {latestCall.ringgCallId && (
                <div>
                  <span className="font-medium">Call ID:</span> {latestCall.ringgCallId}
                </div>
              )}
              <div>
                <span className="font-medium">Status:</span> {latestCall.status}
              </div>
              <div>
                <span className="font-medium">Time:</span> {format(new Date(latestCall.createdAt), 'MMM dd, HH:mm:ss')}
              </div>
            </div>
          </div>

          {/* Recent calls */}
          {callLogs.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Attempts</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {callLogs.slice(1).map((call) => (
                  <div key={call.id} className="border border-gray-200 rounded p-2 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">
                        {format(new Date(call.createdAt), 'HH:mm:ss')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getOutcomeBadgeColor(call.outcome)}`}>
                        {call.outcome.replace('_', ' ')}
                      </span>
                    </div>
                    {call.load && (
                      <div className="text-gray-600">
                        {call.load.pickupCity} → {call.load.dropCity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Summary */}
      {callLogs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Attempts:</span>
              <span className="font-medium text-gray-900">{callLogs.length}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Accepted:</span>
              <span className="font-medium text-green-600">
                {callLogs.filter(c => c.outcome === 'ACCEPTED').length}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Rejected/Failed:</span>
              <span className="font-medium text-red-600">
                {callLogs.filter(c => ['REJECTED', 'FAILED', 'NO_ANSWER', 'BUSY'].includes(c.outcome)).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

