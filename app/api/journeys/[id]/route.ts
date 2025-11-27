import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/journeys/[id] - Get a single journey by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: params.id },
      include: {
        assignedLoad: true,
        callLogs: {
          include: {
            load: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        simulationEvents: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    })
    
    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(journey)
  } catch (error) {
    console.error('Error fetching journey:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journey' },
      { status: 500 }
    )
  }
}

// PATCH /api/journeys/[id] - Update journey status and simulation data
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const journey = await prisma.journey.update({
      where: { id: params.id },
      data: body,
    })
    
    return NextResponse.json(journey)
  } catch (error) {
    console.error('Error updating journey:', error)
    return NextResponse.json(
      { error: 'Failed to update journey' },
      { status: 500 }
    )
  }
}

// DELETE /api/journeys/[id] - Delete a journey
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.journey.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journey:', error)
    return NextResponse.json(
      { error: 'Failed to delete journey' },
      { status: 500 }
    )
  }
}



