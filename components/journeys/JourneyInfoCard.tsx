'use client'

import { Journey, Load } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MapPin, Phone, Truck, User, Building2, Calendar, Clock, Package, IndianRupee, FileText } from 'lucide-react'

interface JourneyInfoCardProps {
  journey: Journey | null
  assignedLoad?: Load | null
}

export default function JourneyInfoCard({ journey, assignedLoad }: JourneyInfoCardProps) {
  if (!journey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journey Details</CardTitle>
          <CardDescription>No journey selected</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Journey Details</CardTitle>
        <CardDescription>Current trip information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="font-medium text-sm">{journey.originCity}</span>
          </div>
          <div className="ml-1 border-l-2 border-muted h-4"></div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="font-medium text-sm">{journey.destinationCity}</span>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <User className="h-3.5 w-3.5 mr-2" />
              Driver
            </div>
            <span className="font-medium">{journey.driverName}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Phone className="h-3.5 w-3.5 mr-2" />
              Phone
            </div>
            <span className="font-medium font-mono">{journey.driverPhone}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Truck className="h-3.5 w-3.5 mr-2" />
              Vehicle
            </div>
            <span className="font-medium font-mono">{journey.vehicleNumber}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 mr-2" />
              Transporter
            </div>
            <span className="font-medium">{journey.transporterName}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 mr-2" />
              Started
            </div>
            <span className="font-medium">{format(new Date(journey.startTime), 'MMM dd, HH:mm')}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3.5 w-3.5 mr-2" />
              Planned ETA
            </div>
            <span className="font-medium">{format(new Date(journey.plannedETA), 'MMM dd, HH:mm')}</span>
          </div>
        </div>

        {/* Assigned load */}
        {assignedLoad && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-xs">
                  Next Load Assigned
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mr-2" />
                    Pickup
                  </div>
                  <span className="font-medium">{assignedLoad.pickupCity}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mr-2" />
                    Drop
                  </div>
                  <span className="font-medium">{assignedLoad.dropCity}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Package className="h-3.5 w-3.5 mr-2" />
                    Commodity
                  </div>
                  <span className="font-medium">{assignedLoad.commodity}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <IndianRupee className="h-3.5 w-3.5 mr-2" />
                    Rate
                  </div>
                  <span className="font-medium">₹{assignedLoad.rate.toLocaleString()}</span>
                </div>

                {assignedLoad.specialInstructions && (
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1.5" />
                      Instructions
                    </div>
                    <p className="text-xs text-foreground pl-5">{assignedLoad.specialInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}


