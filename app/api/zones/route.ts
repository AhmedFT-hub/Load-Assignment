import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ZONE_COLORS: Record<string, string> = {
  THEFT: '#dc2626', // red
  PILFERAGE: '#ea580c', // orange
  STOPPAGE: '#fbbf24', // yellow
  HIGH_RISK: '#991b1b', // dark red
  ACCIDENT_PRONE: '#7c2d12', // dark orange
  TRAFFIC_CONGESTION: '#ca8a04', // amber
  CUSTOM: '#6366f1', // indigo
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category: category as any } : {}

    const zones = await prisma.zone.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Add colors to zones
    const zonesWithColors = zones.map(zone => ({
      ...zone,
      color: zone.color || ZONE_COLORS[zone.category] || ZONE_COLORS.CUSTOM,
    }))

    return NextResponse.json(zonesWithColors)
  } catch (error: any) {
    console.error('Error fetching zones:', error)
    
    // If table doesn't exist yet, return empty array
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return NextResponse.json([])
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch zones', details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, coordinates, description, color } = body

    if (!name || !category || !coordinates || !Array.isArray(coordinates)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, coordinates' },
        { status: 400 }
      )
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        category: category as any,
        coordinates,
        description,
        color: color || ZONE_COLORS[category] || ZONE_COLORS.CUSTOM,
      },
    })

    return NextResponse.json(zone, { status: 201 })
  } catch (error: any) {
    console.error('Error creating zone:', error)
    
    // If table doesn't exist yet
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Zones table not initialized. Please run database migration.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create zone', details: error?.message },
      { status: 500 }
    )
  }
}

