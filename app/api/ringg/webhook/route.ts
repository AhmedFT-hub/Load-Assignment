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
    
    // Handle outcome
    if (mappedOutcome === 'ACCEPTED') {
      // Update load status to ASSIGNED
      await prisma.load.update({
        where: { id: callLog.loadId },
        data: { status: 'ASSIGNED' },
      })
      
      // Assign load to journey
      await prisma.journey.update({
        where: { id: callLog.journeyId },
        data: { assignedLoadId: callLog.loadId },
      })
      
      // Log acceptance event
      await prisma.simulationEvent.create({
        data: {
          journeyId: callLog.journeyId,
          type: 'LOAD',
          label: `Driver accepted load`,
          details: {
            loadId: callLog.loadId,
            pickupCity: callLog.load.pickupCity,
            dropCity: callLog.load.dropCity,
            commodity: callLog.load.commodity,
            rate: callLog.load.rate,
          },
        },
      })
    } else {
      // For rejected/no answer/failed/busy, mark load as back to AVAILABLE
      // or EXHAUSTED depending on your business logic
      await prisma.load.update({
        where: { id: callLog.loadId },
        data: { status: 'AVAILABLE' }, // Make it available for next attempt
      })
      
      // Log rejection event
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
      
      // Automatically trigger next call attempt
      // We'll do this by signaling the frontend or having a separate background job
      // For now, we just log it and let the frontend handle retry
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

