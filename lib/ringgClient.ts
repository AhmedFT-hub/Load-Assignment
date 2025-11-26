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
 * @param request - Call request details
 * @returns Promise with call response
 */
export async function initiateCall(
  request: RinggCallRequest
): Promise<RinggCallResponse> {
  const apiKey = process.env.RINGG_API_KEY
  const endpoint = process.env.RINGG_CALL_ENDPOINT || 'https://api.ringg.ai/v1/calls'

  if (!apiKey) {
    throw new Error('RINGG_API_KEY is not configured')
  }

  const payload = {
    phone: request.driverPhone,
    metadata: {
      journeyId: request.journeyId,
      loadId: request.loadId,
      driverName: request.driverName,
      vehicleNumber: request.vehicleNumber,
      currentLocation: request.currentLocation,
      etaMinutes: request.etaMinutes,
    },
    // Note: No script text - script is managed in Ringg dashboard
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `API error: ${response.status}`,
      }
    }

    return {
      success: true,
      callId: data.callId || data.id,
      message: data.message || 'Call initiated successfully',
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to initiate call: ${error.message}`,
      }
    }
    return {
      success: false,
      error: 'Failed to initiate call: Unknown error',
    }
  }
}

/**
 * Initiate a detour/redzone call via Ringg.ai API
 * Uses the production API endpoint format
 * @param request - Detour call request details
 * @returns Promise with call response
 */
export async function initiateDetourCall(
  request: RinggDetourCallRequest
): Promise<RinggCallResponse> {
  const apiToken = process.env.RINGG_API_TOKEN || process.env.RINGG_API_KEY
  const fromNumberId = process.env.RINGG_FROM_NUMBER_ID
  const agentId = process.env.RINGG_AGENT_ID
  const endpoint = process.env.RINGG_DETOUR_ENDPOINT || 'https://prod-api.ringg.ai/ca/api/v0/calling/outbound/individual'

  if (!apiToken) {
    throw new Error('RINGG_API_TOKEN or RINGG_API_KEY is not configured')
  }

  if (!fromNumberId) {
    throw new Error('RINGG_FROM_NUMBER_ID is not configured')
  }

  if (!agentId) {
    throw new Error('RINGG_AGENT_ID is not configured')
  }

  // Format phone number (ensure it starts with +)
  const mobileNumber = request.driverPhone.startsWith('+') 
    ? request.driverPhone 
    : `+${request.driverPhone}`

  const payload = {
    name: request.driverName.toUpperCase(),
    from_number_id: fromNumberId,
    agent_id: agentId,
    custom_args_values: {
      callee_name: request.driverName.toUpperCase(),
      mobile_number: mobileNumber,
      zone_name: request.zoneName || 'Redzone',
      current_position: request.currentPosition 
        ? `${request.currentPosition.lat},${request.currentPosition.lng}` 
        : undefined,
    },
    mobile_number: mobileNumber,
  }

  try {
    console.log('Initiating detour call to:', endpoint)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json, text/plain, */*',
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
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to initiate detour call: ${error.message}`,
      }
    }
    return {
      success: false,
      error: 'Failed to initiate detour call: Unknown error',
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

