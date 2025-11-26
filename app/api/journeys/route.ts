import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { geocodeCity } from '@/lib/geocoding'

// GET /api/journeys - List all journeys with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const originCity = searchParams.get('originCity')
    const destinationCity = searchParams.get('destinationCity')
    const driverName = searchParams.get('driverName')
    const vehicleNumber = searchParams.get('vehicleNumber')
    const transporterName = searchParams.get('transporterName')
    const status = searchParams.get('status')
    
    const where: any = {}
    
    if (originCity) {
      where.originCity = { contains: originCity, mode: 'insensitive' }
    }
    if (destinationCity) {
      where.destinationCity = { contains: destinationCity, mode: 'insensitive' }
    }
    if (driverName) {
      where.driverName = { contains: driverName, mode: 'insensitive' }
    }
    if (vehicleNumber) {
      where.vehicleNumber = { contains: vehicleNumber, mode: 'insensitive' }
    }
    if (transporterName) {
      where.transporterName = { contains: transporterName, mode: 'insensitive' }
    }
    if (status) {
      where.status = status
    }
    
    const journeys = await prisma.journey.findMany({
      where,
      include: {
        assignedLoad: true,
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(journeys)
  } catch (error) {
    console.error('Error fetching journeys:', error)
    // Return empty array instead of error object to prevent frontend errors
    return NextResponse.json([])
  }
}

// POST /api/journeys - Create a new journey
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      originCity,
      destinationCity,
      driverName,
      driverPhone,
      vehicleNumber,
      startTime,
      plannedETA,
      fleetType,
      transporterName,
      notes,
    } = body
    
    // Validate required fields
    if (!originCity || !destinationCity || !driverName || !driverPhone || 
        !vehicleNumber || !startTime || !plannedETA || !fleetType || !transporterName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Geocode origin and destination
    let originCoords, destinationCoords
    
    try {
      originCoords = await geocodeCity(originCity)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to geocode origin city: ${originCity}` },
        { status: 400 }
      )
    }
    
    try {
      destinationCoords = await geocodeCity(destinationCity)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to geocode destination city: ${destinationCity}` },
        { status: 400 }
      )
    }
    
    // Create journey
    const journey = await prisma.journey.create({
      data: {
        originCity,
        destinationCity,
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        destinationLat: destinationCoords.lat,
        destinationLng: destinationCoords.lng,
        driverName,
        driverPhone,
        vehicleNumber,
        startTime: new Date(startTime),
        plannedETA: new Date(plannedETA),
        fleetType,
        transporterName,
        notes: notes || null,
        status: 'NOT_STARTED',
      },
    })
    
    // Log creation event
    await prisma.simulationEvent.create({
      data: {
        journeyId: journey.id,
        type: 'INFO',
        label: 'Journey created',
        details: {
          message: `Journey from ${originCity} to ${destinationCity} created`,
          driver: driverName,
          vehicle: vehicleNumber,
        },
      },
    })
    
    return NextResponse.json(journey, { status: 201 })
  } catch (error) {
    console.error('Error creating journey:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to create journey',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

