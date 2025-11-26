import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/loads/[id] - Get a single load by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const load = await prisma.load.findUnique({
      where: { id: params.id },
    })
    
    if (!load) {
      return NextResponse.json(
        { error: 'Load not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(load)
  } catch (error) {
    console.error('Error fetching load:', error)
    return NextResponse.json(
      { error: 'Failed to fetch load' },
      { status: 500 }
    )
  }
}

// PATCH /api/loads/[id] - Update a load
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const load = await prisma.load.update({
      where: { id: params.id },
      data: body,
    })
    
    return NextResponse.json(load)
  } catch (error) {
    console.error('Error updating load:', error)
    return NextResponse.json(
      { error: 'Failed to update load' },
      { status: 500 }
    )
  }
}

// DELETE /api/loads/[id] - Delete a load
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.load.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting load:', error)
    return NextResponse.json(
      { error: 'Failed to delete load' },
      { status: 500 }
    )
  }
}


