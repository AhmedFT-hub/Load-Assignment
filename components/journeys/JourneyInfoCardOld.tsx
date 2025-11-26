'use client'

import { Journey, Load } from '@/types'
import { format } from 'date-fns'

interface JourneyInfoCardProps {
  journey: Journey | null
  assignedLoad?: Load | null
}

export default function JourneyInfoCard({ journey, assignedLoad }: JourneyInfoCardProps) {
  if (!journey) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Current Trip & Load</h3>
        <p className="text-gray-500 text-center py-8">No journey selected</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Current Trip & Load</h3>
      
      {/* Journey info */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="font-medium text-gray-900">{journey.originCity}</span>
        </div>
        <div className="ml-1.5 border-l-2 border-gray-300 h-6"></div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="font-medium text-gray-900">{journey.destinationCity}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Driver:</span>
          <span className="font-medium text-gray-900">{journey.driverName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Phone:</span>
          <span className="font-medium text-gray-900">{journey.driverPhone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Vehicle:</span>
          <span className="font-medium text-gray-900">{journey.vehicleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Transporter:</span>
          <span className="font-medium text-gray-900">{journey.transporterName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fleet Type:</span>
          <span className="font-medium text-gray-900 capitalize">{journey.fleetType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Start Time:</span>
          <span className="font-medium text-gray-900">
            {format(new Date(journey.startTime), 'MMM dd, HH:mm')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Planned ETA:</span>
          <span className="font-medium text-gray-900">
            {format(new Date(journey.plannedETA), 'MMM dd, HH:mm')}
          </span>
        </div>
        {journey.notes && (
          <div className="pt-2 border-t">
            <span className="text-gray-600">Notes:</span>
            <p className="text-gray-900 mt-1">{journey.notes}</p>
          </div>
        )}
      </div>

      {/* Assigned load info */}
      {assignedLoad && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="mb-3">
            <div className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
              Next Load Assigned
            </div>
            <p className="text-xs text-gray-500 mt-1">
              (Will start after current delivery + unloading)
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup:</span>
              <span className="font-medium text-gray-900">{assignedLoad.pickupCity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Drop:</span>
              <span className="font-medium text-gray-900">{assignedLoad.dropCity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Commodity:</span>
              <span className="font-medium text-gray-900">{assignedLoad.commodity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rate:</span>
              <span className="font-medium text-gray-900">₹{assignedLoad.rate.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle Type:</span>
              <span className="font-medium text-gray-900">{assignedLoad.vehicleType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reporting Time:</span>
              <span className="font-medium text-gray-900">
                {format(new Date(assignedLoad.expectedReportingTime), 'MMM dd, HH:mm')}
              </span>
            </div>
            {assignedLoad.slaHours && (
              <div className="flex justify-between">
                <span className="text-gray-600">SLA:</span>
                <span className="font-medium text-gray-900">{assignedLoad.slaHours} hours</span>
              </div>
            )}
            {assignedLoad.specialInstructions && (
              <div className="pt-2">
                <span className="text-gray-600">Special Instructions:</span>
                <p className="text-gray-900 mt-1 text-xs">{assignedLoad.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

