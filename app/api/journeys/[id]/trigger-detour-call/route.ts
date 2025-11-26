import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initiateDetourCall } from '@/lib/ringgClient'

// POST /api/journeys/[id]/trigger-detour-call - Trigger detour call for redzone
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('trigger-detour-call API called with params:', params.id)
    const body = await request.json()
    console.log('Request body:', body)
    const { zoneId, zoneName, currentPosition } = body

    const journey = await prisma.journey.findUnique({
      where: { id: params.id },
    })

    if (!journey) {
      console.error('Journey not found:', params.id)
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }

    console.log('Journey found:', journey.id, 'Driver:', journey.driverName, 'Phone:', journey.driverPhone)

    // Create a call log for detour call
    // Note: loadId is required, so we need to create a dummy load or use a placeholder
    // For detour calls, we'll use a special placeholder load ID
    const DUMMY_LOAD_ID = 'detour-call-placeholder'
    
    // Check if dummy load exists, if not create it
    let dummyLoad = await prisma.load.findUnique({
      where: { id: DUMMY_LOAD_ID },
    })
    
    if (!dummyLoad) {
      try {
        dummyLoad = await prisma.load.create({
          data: {
            id: DUMMY_LOAD_ID,
            pickupCity: 'N/A',
            pickupLat: 0,
            pickupLng: 0,
            dropCity: 'N/A',
            dropLat: 0,
            dropLng: 0,
            commodity: 'Detour Call',
            rate: 0,
            expectedReportingTime: new Date(),
            mode: 'N/A',
            vehicleType: 'N/A',
            status: 'EXHAUSTED',
          },
        })
      } catch (error) {
        console.error('Error creating dummy load:', error)
        // If creation fails, try to continue anyway
      }
    }
    
    const callLog = await prisma.callLog.create({
      data: {
        journeyId: journey.id,
        loadId: DUMMY_LOAD_ID, // Use placeholder for detour calls
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

    // Initiate call via Ringg.ai for detour using the detour-specific endpoint
    console.log('Initiating Ringg call with:', {
      driverName: journey.driverName,
      driverPhone: journey.driverPhone,
      zoneName,
      currentPosition,
    })
    
    let ringgResponse
    try {
      ringgResponse = await initiateDetourCall({
        driverName: journey.driverName,
        driverPhone: journey.driverPhone,
        zoneName: zoneName,
        currentPosition: currentPosition ? { lat: currentPosition.lat, lng: currentPosition.lng } : undefined,
      })
      console.log('Ringg response received:', ringgResponse)
    } catch (ringgError) {
      console.error('Ringg call threw an exception:', ringgError)
      const errorMessage = ringgError instanceof Error ? ringgError.message : String(ringgError)
      console.error('Error message:', errorMessage)
      throw new Error(`Ringg API call failed: ${errorMessage}`)
    }

    // Check if call was successful
    if (!ringgResponse.success) {
      console.error('Ringg call failed:', ringgResponse.error)
      // Update call log with error
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: 'COMPLETED',
          outcome: 'FAILED',
          rawRequestPayload: {
            ...(callLog.rawRequestPayload as any || {}),
            error: ringgResponse.error,
          },
        },
      })

      return NextResponse.json({
        success: false,
        error: ringgResponse.error || 'Failed to initiate call',
        callLog,
      }, { status: 500 })
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger detour call',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

