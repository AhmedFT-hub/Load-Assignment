import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/ringgClient'

// POST /api/ringg/webhook - Handle Ringg.ai webhook callbacks
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-ringg-signature')
    const rawBody = await request.text()
    
    // Verify webhook signature if configured
    if (!verifyWebhookSignature(rawBody, signature || undefined)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }
    
    const payload = JSON.parse(rawBody)
    
    // Extract call outcome from payload
    // This structure may vary based on Ringg.ai's actual webhook format
    const {
      callId,
      status,
      outcome,
      metadata,
    } = payload
    
    // Find the call log by ringgCallId
    const callLog = await prisma.callLog.findFirst({
      where: {
        ringgCallId: callId || payload.id,
      },
      include: {
        journey: true,
        load: true,
      },
    })
    
    if (!callLog) {
      console.error('Call log not found for Ringg call ID:', callId)
      return NextResponse.json(
        { error: 'Call log not found' },
        { status: 404 }
      )
    }
    
    // Map webhook outcome to our enum
    let mappedOutcome: 'ACCEPTED' | 'REJECTED' | 'NO_ANSWER' | 'FAILED' | 'BUSY' | 'UNKNOWN' = 'UNKNOWN'
    
    if (outcome) {
      const outcomeStr = outcome.toLowerCase()
      if (outcomeStr.includes('accept') || outcomeStr.includes('success')) {
        mappedOutcome = 'ACCEPTED'
      } else if (outcomeStr.includes('reject') || outcomeStr.includes('decline')) {
        mappedOutcome = 'REJECTED'
      } else if (outcomeStr.includes('no_answer') || outcomeStr.includes('no answer')) {
        mappedOutcome = 'NO_ANSWER'
      } else if (outcomeStr.includes('busy')) {
        mappedOutcome = 'BUSY'
      } else if (outcomeStr.includes('fail')) {
        mappedOutcome = 'FAILED'
      }
    }
    
    // Update call log
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status: 'COMPLETED',
        outcome: mappedOutcome,
        rawWebhookPayload: payload,
      },
    })
    
    // Log webhook event
    await prisma.simulationEvent.create({
      data: {
        journeyId: callLog.journeyId,
        type: 'WEBHOOK',
        label: `Call outcome: ${mappedOutcome}`,
        details: {
          callLogId: callLog.id,
          loadId: callLog.loadId,
          outcome: mappedOutcome,
          rawPayload: payload,
        },
      },
    })
    
    // Check if this is a detour call (no loadId)
    const rawPayload = callLog.rawRequestPayload as any
    const isDetourCall = (!callLog.loadId || callLog.loadId === '') || 
      (rawPayload && typeof rawPayload === 'object' && 'type' in rawPayload && rawPayload.type === 'detour')

    // Handle outcome
    if (mappedOutcome === 'ACCEPTED') {
      if (isDetourCall) {
        // Detour call accepted - log event (frontend will handle route calculation)
        const zoneId = rawPayload?.zoneId || ''
        const zoneName = rawPayload?.zoneName || 'Unknown zone'
        await prisma.simulationEvent.create({
          data: {
            journeyId: callLog.journeyId,
            type: 'CALL',
            label: `Driver accepted detour`,
            details: {
              zoneId,
              zoneName,
              outcome: mappedOutcome,
            },
          },
        })
      } else {
        // Load assignment call accepted
        if (callLog.loadId) {
          await prisma.load.update({
            where: { id: callLog.loadId },
            data: { status: 'ASSIGNED' },
          })
          
          await prisma.journey.update({
            where: { id: callLog.journeyId },
            data: { assignedLoadId: callLog.loadId },
          })
          
          await prisma.simulationEvent.create({
            data: {
              journeyId: callLog.journeyId,
              type: 'LOAD',
              label: `Driver accepted load`,
              details: {
                loadId: callLog.loadId,
                pickupCity: callLog.load?.pickupCity,
                dropCity: callLog.load?.dropCity,
                commodity: callLog.load?.commodity,
                rate: callLog.load?.rate,
              },
            },
          })
        }
      }
    } else {
      // Rejected/no answer/failed/busy
      if (isDetourCall) {
        // Detour call rejected - log event
        const zoneId = rawPayload?.zoneId || ''
        const zoneName = rawPayload?.zoneName || 'Unknown zone'
        await prisma.simulationEvent.create({
          data: {
            journeyId: callLog.journeyId,
            type: 'CALL',
            label: `Detour call ${mappedOutcome.toLowerCase().replace('_', ' ')}`,
            details: {
              zoneId,
              zoneName,
              outcome: mappedOutcome,
            },
          },
        })
      } else {
        // Load assignment call rejected
        if (callLog.loadId) {
          await prisma.load.update({
            where: { id: callLog.loadId },
            data: { status: 'AVAILABLE' },
          })
          
          await prisma.simulationEvent.create({
            data: {
              journeyId: callLog.journeyId,
              type: 'CALL',
              label: `Call ${mappedOutcome.toLowerCase().replace('_', ' ')} for load`,
              details: {
                loadId: callLog.loadId,
                outcome: mappedOutcome,
              },
            },
          })
        }
      }
    }
    
    return NextResponse.json({ success: true, outcome: mappedOutcome })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

