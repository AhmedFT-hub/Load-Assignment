// Shared TypeScript types for the application

export type JourneyStatus = 
  | 'NOT_STARTED'
  | 'IN_TRANSIT'
  | 'NEAR_DESTINATION'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'STOPPAGE'
  | 'AT_RISK'

export type LoadStatus = 'AVAILABLE' | 'OFFERED' | 'ASSIGNED' | 'EXHAUSTED'

export type CallStatus = 'INITIATED' | 'COMPLETED'

export type CallOutcome = 
  | 'ACCEPTED'
  | 'REJECTED'
  | 'NO_ANSWER'
  | 'FAILED'
  | 'BUSY'
  | 'UNKNOWN'

export type EventType =
  | 'INFO'
  | 'TRACKING'
  | 'CALL'
  | 'WEBHOOK'
  | 'LOAD'
  | 'ERROR'
  | 'STATE_CHANGE'
  | 'STOPPAGE'

export interface Journey {
  id: string
  originCity: string
  destinationCity: string
  originLat: number
  originLng: number
  destinationLat: number
  destinationLng: number
  driverName: string
  driverPhone: string
  vehicleNumber: string
  startTime: string | Date
  plannedETA: string | Date
  fleetType: string
  transporterName: string
  notes?: string | null
  status: JourneyStatus
  currentEtaMinutes?: number | null
  currentDistanceToDestKm?: number | null
  assignedLoadId?: string | null
  assignedLoad?: Load | null
  createdAt: string | Date
  updatedAt: string | Date
  callLogs?: CallLog[]
  simulationEvents?: SimulationEvent[]
}

export interface Load {
  id: string
  pickupCity: string
  pickupLat: number
  pickupLng: number
  dropCity: string
  dropLat: number
  dropLng: number
  commodity: string
  rate: number
  expectedReportingTime: string | Date
  expectedUnloadingTime?: string | Date | null
  mode: string
  vehicleType: string
  specialInstructions?: string | null
  slaHours?: number | null
  status: LoadStatus
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CallLog {
  id: string
  journeyId: string
  loadId: string
  load?: Load
  ringgCallId?: string | null
  status: CallStatus
  outcome: CallOutcome
  rawRequestPayload: any
  rawWebhookPayload?: any | null
  createdAt: string | Date
  updatedAt: string | Date
}

export interface SimulationEvent {
  id: string
  journeyId: string
  timestamp: string | Date
  type: EventType
  label: string
  details: any
  createdAt: string | Date
}

export type ZoneCategory = 
  | 'THEFT'
  | 'PILFERAGE'
  | 'STOPPAGE'
  | 'HIGH_RISK'
  | 'ACCIDENT_PRONE'
  | 'TRAFFIC_CONGESTION'
  | 'CUSTOM'

export interface Zone {
  id: string
  name: string
  category: ZoneCategory
  coordinates: Array<{ lat: number; lng: number }>
  description?: string | null
  color?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

