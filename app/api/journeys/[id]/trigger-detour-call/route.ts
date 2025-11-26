import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initiateCall } from '@/lib/ringgClient'

// POST /api/journeys/[id]/trigger-detour-call - Trigger detour call for redzone
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { zoneId, zoneName, currentPosition } = body

    const journey = await prisma.journey.findUnique({
      where: { id: params.id },
    })

    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }

    // Create a call log for detour call
    const callLog = await prisma.callLog.create({
      data: {
        journeyId: journey.id,
        loadId: '', // No load for detour calls
        status: 'INITIATED',
        outcome: 'UNKNOWN',
        rawRequestPayload: {
          type: 'detour',
          zoneId,
          zoneName,
          currentPosition,
        },
      },
    })

    // Initiate call via Ringg.ai for detour
    const ringgResponse = await initiateCall({
      journeyId: journey.id,
      loadId: '', // No load ID for detour
      driverName: journey.driverName,
      driverPhone: journey.driverPhone,
      vehicleNumber: journey.vehicleNumber,
      currentLocation: currentPosition ? { lat: currentPosition.lat, lng: currentPosition.lng } : undefined,
    })

    // Update call log with Ringg response
    const rawPayload = callLog.rawRequestPayload as any || {}
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        ringgCallId: ringgResponse.callId,
        rawRequestPayload: {
          ...rawPayload,
          ringgCallId: ringgResponse.callId,
        },
      },
    })

    // Store detour call metadata in journey (we'll use a custom field or event)
    await prisma.simulationEvent.create({
      data: {
        journeyId: journey.id,
        type: 'CALL',
        label: `Detour call initiated for redzone: ${zoneName}`,
        details: {
          zoneId,
          zoneName,
          callLogId: callLog.id,
          ringgCallId: ringgResponse.callId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      callLog,
      ringgResponse,
      zoneId,
      zoneName,
    })
  } catch (error) {
    console.error('Error triggering detour call:', error)
    return NextResponse.json(
      { error: 'Failed to trigger detour call' },
      { status: 500 }
    )
  }
}

