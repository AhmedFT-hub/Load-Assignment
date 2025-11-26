import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initiateCall } from '@/lib/ringgClient'
import { calculateDistance } from '@/lib/directions'

// POST /api/journeys/[id]/trigger-call - Trigger call for nearest available load
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: params.id },
      include: {
        callLogs: {
          where: {
            outcome: 'ACCEPTED',
          },
        },
      },
    })
    
    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }
    
    // Check if a load is already accepted
    if (journey.assignedLoadId) {
      return NextResponse.json(
        { error: 'Journey already has an assigned load' },
        { status: 400 }
      )
    }
    
    // Get IDs of loads that have been offered but not accepted
    const exhaustedLoadIds = await prisma.callLog.findMany({
      where: {
        journeyId: journey.id,
        outcome: { in: ['REJECTED', 'NO_ANSWER', 'FAILED', 'BUSY'] },
      },
      select: { loadId: true },
    })
    
    const exhaustedIds = exhaustedLoadIds.map(cl => cl.loadId)
    
    // Find available loads not yet offered to this journey
    const availableLoads = await prisma.load.findMany({
      where: {
        status: 'AVAILABLE',
        id: {
          notIn: exhaustedIds,
        },
      },
    })
    
    if (availableLoads.length === 0) {
      await prisma.simulationEvent.create({
        data: {
          journeyId: journey.id,
          type: 'ERROR',
          label: 'No available loads',
          details: {
            message: 'No available loads found for this journey',
          },
        },
      })
      
      return NextResponse.json(
        { error: 'No available loads found' },
        { status: 404 }
      )
    }
    
    // Find nearest load by distance from destination to pickup
    let nearestLoad = availableLoads[0]
    let minDistance = calculateDistance(
      { lat: journey.destinationLat, lng: journey.destinationLng },
      { lat: nearestLoad.pickupLat, lng: nearestLoad.pickupLng }
    )
    
    for (const load of availableLoads.slice(1)) {
      const distance = calculateDistance(
        { lat: journey.destinationLat, lng: journey.destinationLng },
        { lat: load.pickupLat, lng: load.pickupLng }
      )
      
      if (distance < minDistance) {
        minDistance = distance
        nearestLoad = load
      }
    }
    
    // Update load status to OFFERED
    await prisma.load.update({
      where: { id: nearestLoad.id },
      data: { status: 'OFFERED' },
    })
    
    // Create call log entry
    const callRequestPayload = {
      journeyId: journey.id,
      loadId: nearestLoad.id,
      driverName: journey.driverName,
      driverPhone: journey.driverPhone,
      vehicleNumber: journey.vehicleNumber,
      currentEtaMinutes: journey.currentEtaMinutes,
    }
    
    const callLog = await prisma.callLog.create({
      data: {
        journeyId: journey.id,
        loadId: nearestLoad.id,
        status: 'INITIATED',
        outcome: 'UNKNOWN',
        rawRequestPayload: callRequestPayload,
      },
    })
    
    // Log event
    await prisma.simulationEvent.create({
      data: {
        journeyId: journey.id,
        type: 'CALL',
        label: `Call initiated for load ${nearestLoad.id}`,
        details: {
          loadId: nearestLoad.id,
          pickupCity: nearestLoad.pickupCity,
          dropCity: nearestLoad.dropCity,
          commodity: nearestLoad.commodity,
          rate: nearestLoad.rate,
          distanceToPickupKm: minDistance,
        },
      },
    })
    
    // Initiate call via Ringg.ai
    const ringgResponse = await initiateCall({
      journeyId: journey.id,
      loadId: nearestLoad.id,
      driverName: journey.driverName,
      driverPhone: journey.driverPhone,
      vehicleNumber: journey.vehicleNumber,
      etaMinutes: journey.currentEtaMinutes || undefined,
    })
    
    // Update call log with Ringg response
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        ringgCallId: ringgResponse.callId,
      },
    })
    
    if (!ringgResponse.success) {
      await prisma.simulationEvent.create({
        data: {
          journeyId: journey.id,
          type: 'ERROR',
          label: 'Call initiation failed',
          details: {
            error: ringgResponse.error,
            loadId: nearestLoad.id,
          },
        },
      })
    }
    
    return NextResponse.json({
      success: true,
      callLog,
      load: nearestLoad,
      ringgResponse,
    })
  } catch (error) {
    console.error('Error triggering call:', error)
    return NextResponse.json(
      { error: 'Failed to trigger call' },
      { status: 500 }
    )
  }
}

