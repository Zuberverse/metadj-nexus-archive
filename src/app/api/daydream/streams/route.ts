import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { parseCreateStreamPayload, formatZodError } from "@/lib/daydream/schemas"
import {
  getClientIdentifier,
  checkStreamCreation,
  registerStream,
  buildStreamLimitResponse,
  DAYDREAM_SESSION_COOKIE_NAME,
  DAYDREAM_SESSION_COOKIE_MAX_AGE,
} from "@/lib/daydream/stream-limiter"
import { getMaxRequestSize, readJsonBodyWithLimit } from "@/lib/validation/request-size"
import { daydreamFetch, parseJson, jsonError, getDaydreamConfig } from "../utils"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, publicEnabled } = getDaydreamConfig()
    if (!apiKey || !publicEnabled) {
      return NextResponse.json(
        { error: "Daydream is not enabled" },
        { status: 403 },
      )
    }

    // Get client identifier for rate limiting
    const { id: clientId, isFingerprint } = getClientIdentifier(request)

    // Check if user can create a stream (single-stream + rate limit)
    const check = await checkStreamCreation(clientId)
    if (!check.allowed) {
      const errorBody = buildStreamLimitResponse(check.error!, check.retryAfterMs || 0, check.activeStreamId)
      const response = NextResponse.json(errorBody, { status: 429 })

      // Set retry-after header if applicable
      if (check.retryAfterMs && check.retryAfterMs > 0) {
        response.headers.set("Retry-After", String(Math.ceil(check.retryAfterMs / 1000)))
      }

      return response
    }

    // Parse and validate payload
    const bodyResult = await readJsonBodyWithLimit<Record<string, unknown>>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    )
    if (!bodyResult.ok) {
      return bodyResult.response
    }
    const rawPayload = bodyResult.data
    let payload
    try {
      payload = parseCreateStreamPayload(rawPayload)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid stream configuration", details: formatZodError(error) },
          { status: 400 },
        )
      }
      throw error
    }

    const upstream = await daydreamFetch("/v1/streams", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const body = await parseJson(upstream)

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to create Daydream stream", details: body },
        { status: upstream.status },
      )
    }

    // Register the stream for single-stream enforcement
    const streamId = body.id || body.streamId || body.stream_id
    if (streamId) {
      await registerStream(clientId, streamId)
    }

    // Build success response
    const response = NextResponse.json(body, { status: 201 })

    // Set session cookie if using fingerprint
    if (isFingerprint) {
      // Persist the computed fingerprint id as a stable session identifier so
      // subsequent requests (delete/end) use the same limiter key.
      response.cookies.set(DAYDREAM_SESSION_COOKIE_NAME, clientId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: DAYDREAM_SESSION_COOKIE_MAX_AGE,
        path: "/api/daydream",
      })
    }

    return response
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("Daydream request timed out", 504)
    }
    const message = error instanceof Error ? error.message : "Unexpected error"
    return jsonError(message, 500)
  }
}
