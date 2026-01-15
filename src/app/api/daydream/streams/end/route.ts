import { NextResponse } from "next/server"
import { getClientIdentifier, endStream } from "@/lib/daydream/stream-limiter"
import { getMaxRequestSize, readRequestBodyWithLimit } from "@/lib/validation/request-size"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * End a user's active stream (client-side notification)
 * This releases the single-stream lock so they can create a new one
 * Supports both regular JSON requests and sendBeacon (text/plain)
 */
export async function POST(request: NextRequest) {
  try {
    const { id: clientId } = getClientIdentifier(request)

    // Parse body - supports both JSON and text/plain (from sendBeacon)
    let streamId: string | undefined
    try {
      const bodyResult = await readRequestBodyWithLimit(
        request,
        getMaxRequestSize(request.nextUrl.pathname)
      )
      if (!bodyResult.ok) {
        return bodyResult.response
      }
      const text = bodyResult.body
      if (text) {
        const body = JSON.parse(text)
        streamId = body.streamId
      }
    } catch {
      // No body or invalid JSON is fine - just clear any active stream
    }

    const ended = await endStream(clientId, streamId)

    if (ended) {
      return NextResponse.json({ success: true, message: "Stream ended" })
    }

    return NextResponse.json(
      { success: true, message: "No active stream found" },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
