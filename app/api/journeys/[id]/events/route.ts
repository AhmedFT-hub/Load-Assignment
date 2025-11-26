import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/journeys/[id]/events - Get all events for a journey
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const events = await prisma.simulationEvent.findMany({
      where: { journeyId: params.id },
      orderBy: { timestamp: 'desc' },
    })
    
    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// POST /api/journeys/[id]/events - Create a new simulation event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const event = await prisma.simulationEvent.create({
      data: {
        journeyId: params.id,
        type: body.type,
        label: body.label,
        details: body.details || {},
      },
    })
    
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

