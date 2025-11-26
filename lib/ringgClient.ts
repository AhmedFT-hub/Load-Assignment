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

export interface RinggCallResponse {
  success: boolean
  callId?: string
  message?: string
  error?: string
}

/**
 * Initiate a call via Ringg.ai API
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

