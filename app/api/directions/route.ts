import { NextRequest, NextResponse } from 'next/server'
import { getDirections } from '@/lib/directions'

// POST /api/directions - Get directions from Google Directions API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, destination } = body

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      )
    }

    const result = await getDirections({ origin, destination })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting directions:', error)
    return NextResponse.json(
      { error: 'Failed to get directions' },
      { status: 500 }
    )
  }
}

