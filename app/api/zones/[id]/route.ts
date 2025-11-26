import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ZONE_COLORS: Record<string, string> = {
  THEFT: '#dc2626',
  PILFERAGE: '#ea580c',
  STOPPAGE: '#fbbf24',
  HIGH_RISK: '#991b1b',
  ACCIDENT_PRONE: '#7c2d12',
  TRAFFIC_CONGESTION: '#ca8a04',
  CUSTOM: '#6366f1',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const zone = await prisma.zone.findUnique({
      where: { id: params.id },
    })

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...zone,
      color: zone.color || ZONE_COLORS[zone.category] || ZONE_COLORS.CUSTOM,
    })
  } catch (error) {
    console.error('Error fetching zone:', error)
    return NextResponse.json(
      { error: 'Failed to fetch zone' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, category, coordinates, description, color } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (category) updateData.category = category
    if (coordinates) updateData.coordinates = coordinates
    if (description !== undefined) updateData.description = description
    if (color) updateData.color = color

    const zone = await prisma.zone.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      ...zone,
      color: zone.color || ZONE_COLORS[zone.category] || ZONE_COLORS.CUSTOM,
    })
  } catch (error) {
    console.error('Error updating zone:', error)
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.zone.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting zone:', error)
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    )
  }
}


