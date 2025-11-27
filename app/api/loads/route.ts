import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { geocodeCity } from '@/lib/geocoding'

// GET /api/loads - List all loads with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const pickupCity = searchParams.get('pickupCity')
    const dropCity = searchParams.get('dropCity')
    const commodity = searchParams.get('commodity')
    const vehicleType = searchParams.get('vehicleType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    const where: any = {}
    
    if (pickupCity) {
      where.pickupCity = { contains: pickupCity, mode: 'insensitive' }
    }
    if (dropCity) {
      where.dropCity = { contains: dropCity, mode: 'insensitive' }
    }
    if (commodity) {
      where.commodity = { contains: commodity, mode: 'insensitive' }
    }
    if (vehicleType) {
      where.vehicleType = { contains: vehicleType, mode: 'insensitive' }
    }
    if (status) {
      where.status = status
    }
    
    // Free-text search
    if (search) {
      where.OR = [
        { pickupCity: { contains: search, mode: 'insensitive' } },
        { dropCity: { contains: search, mode: 'insensitive' } },
        { commodity: { contains: search, mode: 'insensitive' } },
        { vehicleType: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    const loads = await prisma.load.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(loads)
  } catch (error) {
    console.error('Error fetching loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads' },
      { status: 500 }
    )
  }
}

// POST /api/loads - Create a new load
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      pickupCity,
      dropCity,
      commodity,
      rate,
      expectedReportingTime,
      expectedUnloadingTime,
      mode,
      vehicleType,
      specialInstructions,
      slaHours,
    } = body
    
    // Validate required fields
    if (!pickupCity || !dropCity || !commodity || rate === undefined || 
        !expectedReportingTime || !mode || !vehicleType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Geocode pickup and drop locations
    let pickupCoords, dropCoords
    
    try {
      pickupCoords = await geocodeCity(pickupCity)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to geocode pickup city: ${pickupCity}` },
        { status: 400 }
      )
    }
    
    try {
      dropCoords = await geocodeCity(dropCity)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to geocode drop city: ${dropCity}` },
        { status: 400 }
      )
    }
    
    // Create load
    const load = await prisma.load.create({
      data: {
        pickupCity,
        dropCity,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropLat: dropCoords.lat,
        dropLng: dropCoords.lng,
        commodity,
        rate: parseFloat(rate),
        expectedReportingTime: new Date(expectedReportingTime),
        expectedUnloadingTime: expectedUnloadingTime ? new Date(expectedUnloadingTime) : null,
        mode,
        vehicleType,
        specialInstructions: specialInstructions || null,
        slaHours: slaHours ? parseInt(slaHours) : null,
        status: 'AVAILABLE',
      },
    })
    
    return NextResponse.json(load, { status: 201 })
  } catch (error) {
    console.error('Error creating load:', error)
    return NextResponse.json(
      { error: 'Failed to create load' },
      { status: 500 }
    )
  }
}



