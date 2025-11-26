import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/journeys/[id]/detour-status - Check detour call status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: params.id },
      include: {
        callLogs: {
          where: {
            rawRequestPayload: {
              path: ['type'],
              equals: 'detour',
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }

    // Find latest detour call (check by empty loadId or type in payload)
    const latestDetourCall = journey.callLogs.find(call => {
      if (!call.loadId || call.loadId === '') return true
      const payload = call.rawRequestPayload as any
      return payload && typeof payload === 'object' && payload.type === 'detour'
    })

    if (!latestDetourCall) {
      return NextResponse.json({ status: 'pending' })
    }

    // Check if call was accepted (outcome = ACCEPTED)
    if (latestDetourCall.outcome === 'ACCEPTED') {
      return NextResponse.json({ status: 'accepted', callLog: latestDetourCall })
    }

    if (latestDetourCall.outcome === 'REJECTED' || latestDetourCall.outcome === 'NO_ANSWER') {
      return NextResponse.json({ status: 'rejected', callLog: latestDetourCall })
    }

    return NextResponse.json({ status: 'pending', callLog: latestDetourCall })
  } catch (error) {
    console.error('Error checking detour status:', error)
    return NextResponse.json(
      { error: 'Failed to check detour status' },
      { status: 500 }
    )
  }
}

