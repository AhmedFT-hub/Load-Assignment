/**
 * Ringg.ai API client for initiating calls
 */

export interface RinggCallRequest {
  journeyId: string
  loadId: string
  driverName: string
  driverPhone: string
  vehicleNumber: string
  currentLocation?: { lat: number; lng: number }
  etaMinutes?: number
  // Load details for custom_args_values
  pickupCity?: string
  dropCity?: string
  commodity?: string
  rate?: number
  companyName?: string
  appointmentDate?: string
}

export interface RinggDetourCallRequest {
  driverName: string
  driverPhone: string
  zoneName?: string
  currentPosition?: { lat: number; lng: number }
}

export interface RinggCallResponse {
  success: boolean
  callId?: string
  message?: string
  error?: string
}

/**
 * Initiate a call via Ringg.ai API (for load assignment)
 * Uses the production API endpoint format with X-API-KEY authentication
 * @param request - Call request details
 * @returns Promise with call response
 */
export async function initiateCall(
  request: RinggCallRequest
): Promise<RinggCallResponse> {
  const apiKey = process.env.RINGG_API_KEY
  const fromNumber = process.env.RINGG_FROM_NUMBER
  const agentId = process.env.RINGG_LOAD_AGENT_ID || process.env.RINGG_AGENT_ID // Use load-specific agent ID if available
  const endpoint = process.env.RINGG_CALL_ENDPOINT || 'https://prod-api.ringg.ai/ca/api/v0/calling/outbound/individual'

  console.log('Checking Ringg environment variables for load assignment call...')
  console.log('RINGG_API_KEY:', apiKey ? 'SET' : 'NOT SET')
  console.log('RINGG_FROM_NUMBER:', fromNumber ? 'SET' : 'NOT SET')
  console.log('RINGG_LOAD_AGENT_ID or RINGG_AGENT_ID:', agentId ? 'SET' : 'NOT SET')

  if (!apiKey) {
    const error = 'RINGG_API_KEY is not configured'
    console.error(error)
    throw new Error(error)
  }

  if (!fromNumber) {
    const error = 'RINGG_FROM_NUMBER is not configured'
    console.error(error)
    throw new Error(error)
  }

  if (!agentId) {
    const error = 'RINGG_LOAD_AGENT_ID or RINGG_AGENT_ID is not configured'
    console.error(error)
    throw new Error(error)
  }

  // Format phone number (ensure it starts with +)
  const mobileNumber = request.driverPhone.startsWith('+') 
    ? request.driverPhone 
    : `+${request.driverPhone}`

  // Format from number (ensure it starts with +)
  const formattedFromNumber = fromNumber.startsWith('+')
    ? fromNumber
    : `+${fromNumber}`

  // Get current time in UTC for call scheduling
  // Format as ISO 8601 without timezone (naive datetime) - API requires format like "2025-11-24T15:30:00"
  // Schedule 30 seconds in the future to ensure it's always in the future (accounts for API processing time and timezone interpretation)
  const now = new Date()
  const futureTime = new Date(now.getTime() + 30 * 1000) // Add 30 seconds buffer
  // Convert to UTC time string and format as ISO without timezone
  // The API interprets this as UTC time, so we use UTC directly
  const scheduledAt = futureTime.toISOString().replace('Z', '').slice(0, 19) // Remove 'Z' and milliseconds: "2025-11-27T03:30:00"

  // Format appointment date (use provided date or default to tomorrow)
  const appointmentDate = request.appointmentDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Build custom_args_values for load assignment
  const customArgsValues: Record<string, string> = {
    company_name: request.companyName || 'Freight Logistics',
    appointment_date: appointmentDate,
    product_name: request.commodity || 'Freight Load',
  }
  
  // Add load-specific details if available
  if (request.pickupCity && request.dropCity) {
    customArgsValues.pickup_city = request.pickupCity
    customArgsValues.drop_city = request.dropCity
  }
  
  if (request.rate) {
    customArgsValues.rate = `₹${request.rate.toLocaleString('en-IN')}`
  }

  const payload = {
    name: request.driverName.toUpperCase(),
    mobile_number: mobileNumber,
    agent_id: agentId,
    from_number: formattedFromNumber,
    custom_args_values: customArgsValues,
    call_config: {
      idle_timeout_warning: 10,
      idle_timeout_end: 15,
      max_call_length: 240, // 4 minutes for load assignment calls
      call_retry_config: {
        retry_count: 3,
        retry_busy: 30,
        retry_not_picked: 30,
        retry_failed: 30,
      },
      call_time: {
        call_start_time: '08:00',
        call_end_time: '07:59',
        timezone: 'Asia/Kolkata',
        scheduled_at: scheduledAt,
      },
    },
  }

  try {
    console.log('Initiating load assignment call to:', endpoint)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey, // Use X-API-KEY for this endpoint
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log('Ringg API response status:', response.status)
    console.log('Ringg API response:', responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // If response is not JSON, return error
      return {
        success: false,
        error: `Invalid response format: ${responseText.substring(0, 200)}`,
      }
    }

    if (!response.ok) {
      console.error('Ringg API error:', data)
      return {
        success: false,
        error: data.error || data.message || data.detail || `API error: ${response.status} ${response.statusText}`,
      }
    }

    // Extract call ID from response (adjust based on actual response structure)
    const callId = data.call_id || data.callId || data.id || data.data?.call_id || data.data?.id

    if (!callId) {
      console.warn('No call ID found in response:', data)
    }

    return {
      success: true,
      callId: callId,
      message: data.message || 'Load assignment call initiated successfully',
    }
  } catch (error) {
    console.error('Failed to initiate load assignment call:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Ringg client error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    })
    
    return {
      success: false,
      error: `Failed to initiate call: ${errorMessage}`,
    }
  }
}

/**
 * Initiate a detour/redzone call via Ringg.ai API
 * Uses the production API endpoint format with X-API-KEY authentication
 * @param request - Detour call request details
 * @returns Promise with call response
 */
export async function initiateDetourCall(
  request: RinggDetourCallRequest
): Promise<RinggCallResponse> {
  const apiKey = process.env.RINGG_API_KEY
  const fromNumber = process.env.RINGG_FROM_NUMBER
  const agentId = process.env.RINGG_AGENT_ID
  const endpoint = process.env.RINGG_DETOUR_ENDPOINT || 'https://prod-api.ringg.ai/ca/api/v0/calling/outbound/individual'

  console.log('Checking Ringg environment variables...')
  console.log('RINGG_API_KEY:', apiKey ? 'SET' : 'NOT SET')
  console.log('RINGG_FROM_NUMBER:', fromNumber ? 'SET' : 'NOT SET')
  console.log('RINGG_AGENT_ID:', agentId ? 'SET' : 'NOT SET')

  if (!apiKey) {
    const error = 'RINGG_API_KEY is not configured'
    console.error(error)
    throw new Error(error)
  }

  if (!fromNumber) {
    const error = 'RINGG_FROM_NUMBER is not configured'
    console.error(error)
    throw new Error(error)
  }

  if (!agentId) {
    const error = 'RINGG_AGENT_ID is not configured'
    console.error(error)
    throw new Error(error)
  }

  // Format phone number (ensure it starts with +)
  const mobileNumber = request.driverPhone.startsWith('+') 
    ? request.driverPhone 
    : `+${request.driverPhone}`

  // Format from number (ensure it starts with +)
  const formattedFromNumber = fromNumber.startsWith('+')
    ? fromNumber
    : `+${fromNumber}`

  // Get current time in UTC for call scheduling
  // Format as ISO 8601 without timezone (naive datetime) - API requires format like "2025-11-24T15:30:00"
  // Schedule 30 seconds in the future to ensure it's always in the future (accounts for API processing time and timezone interpretation)
  const now = new Date()
  const futureTime = new Date(now.getTime() + 30 * 1000) // Add 30 seconds buffer
  // Convert to UTC time string and format as ISO without timezone
  // The API interprets this as UTC time, so we use UTC directly
  const scheduledAt = futureTime.toISOString().replace('Z', '').slice(0, 19) // Remove 'Z' and milliseconds: "2025-11-27T03:30:00"

  // Build custom_args_values (only include defined values)
  const customArgsValues: Record<string, string> = {
    callee_name: request.driverName.toUpperCase(),
    mobile_number: mobileNumber,
    zone_name: request.zoneName || 'Redzone',
  }
  
  // Add current_position only if provided
  if (request.currentPosition) {
    customArgsValues.current_position = `${request.currentPosition.lat},${request.currentPosition.lng}`
  }

  const payload = {
    name: request.driverName.toUpperCase(),
    mobile_number: mobileNumber,
    agent_id: agentId,
    from_number: formattedFromNumber,
    custom_args_values: customArgsValues,
    call_config: {
      idle_timeout_warning: 10,
      idle_timeout_end: 15,
      max_call_length: 300,
      call_retry_config: {
        retry_count: 3,
        retry_busy: 30,
        retry_not_picked: 30,
        retry_failed: 30,
      },
      call_time: {
        call_start_time: '08:00',
        call_end_time: '07:59',
        timezone: 'Asia/Kolkata',
        scheduled_at: scheduledAt,
      },
    },
  }

  try {
    console.log('Initiating detour call to:', endpoint)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log('Ringg API response status:', response.status)
    console.log('Ringg API response:', responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // If response is not JSON, return error
      return {
        success: false,
        error: `Invalid response format: ${responseText.substring(0, 200)}`,
      }
    }

    if (!response.ok) {
      console.error('Ringg API error:', data)
      return {
        success: false,
        error: data.error || data.message || data.detail || `API error: ${response.status} ${response.statusText}`,
      }
    }

    // Extract call ID from response (adjust based on actual response structure)
    const callId = data.call_id || data.callId || data.id || data.data?.call_id || data.data?.id

    if (!callId) {
      console.warn('No call ID found in response:', data)
    }

    return {
      success: true,
      callId: callId,
      message: data.message || 'Detour call initiated successfully',
    }
  } catch (error) {
    console.error('Failed to initiate detour call:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Ringg client error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    })
    
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to initiate detour call: ${errorMessage}`,
      }
    }
    return {
      success: false,
      error: `Failed to initiate detour call: ${String(error)}`,
    }
  }
}

/**
 * Verify Ringg webhook signature (if webhook secret is configured)
 * @param payload - Raw webhook payload
 * @param signature - Signature from webhook header
 * @returns True if signature is valid or no secret configured
 */
export function verifyWebhookSignature(
  payload: string,
  signature?: string
): boolean {
  const webhookSecret = process.env.RINGG_WEBHOOK_SECRET

  // If no webhook secret is configured, skip verification
  if (!webhookSecret) {
    return true
  }

  // If secret is configured but no signature provided, reject
  if (!signature) {
    return false
  }

  // TODO: Implement actual signature verification based on Ringg's method
  // This is a placeholder - update based on Ringg.ai's documentation
  // For now, just do a basic check
  return signature.length > 0
}

