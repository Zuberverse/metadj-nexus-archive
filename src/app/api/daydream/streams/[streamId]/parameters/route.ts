import { NextResponse } from "next/server"
import { getActiveStream, getClientIdentifier } from "@/lib/daydream/stream-limiter"
import { getMaxRequestSize, readJsonBodyWithLimit } from "@/lib/validation/request-size"
import { daydreamFetch, jsonError } from "../../../utils"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * PATCH /api/daydream/streams/:streamId/parameters
 * Pass-through to Daydream to update stream parameters (prompt, guidance, etc).
 * Used by MetaDJ Nexus to re-assert the initial prompt payload after stream creation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  try {
    const { streamId } = await params
    if (!streamId) {
      return NextResponse.json({ error: "Missing streamId" }, { status: 400 })
    }

    const { id: clientId } = getClientIdentifier(request)
    const activeStream = getActiveStream(clientId)
    if (!activeStream || activeStream.streamId !== streamId) {
      return NextResponse.json({ error: "Stream not owned by active session" }, { status: 403 })
    }

    // Accept either { pipeline, params: {...} } or a raw params object
    const bodyResult = await readJsonBodyWithLimit<Record<string, unknown>>(
      request,
      getMaxRequestSize(request.nextUrl.pathname),
      { allowEmpty: true }
    )
    if (!bodyResult.ok) {
      return bodyResult.response
    }
    const incoming = bodyResult.data ?? {}

    // Daydream PATCH (per official OpenAPI) expects: { pipeline, params }.
    // In practice, we accept a few client shapes and normalize them:
    // - { pipeline: "streamdiffusion", params: {...} } (preferred)
    // - { params: {...} } (accepted)
    // - {...} (flat params object)
    const record =
      incoming && typeof incoming === "object"
        ? (incoming as Record<string, unknown>)
        : {}

    const pipeline = typeof record.pipeline === "string" ? record.pipeline : "streamdiffusion"

    const paramsValue = record.params ?? record.pipeline_params
    const paramsObject =
      paramsValue && typeof paramsValue === "object"
        ? (paramsValue as Record<string, unknown>)
        : record

    const payload = { pipeline, params: paramsObject }

    const upstream = await daydreamFetch(`/v1/streams/${encodeURIComponent(streamId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })

    // If fetch failed deeply (network), JSON parsing might fail if we don't read text first
    // For error debugging, read text first
    const responseText = await upstream.text()

    let body
    try {
      body = JSON.parse(responseText)
    } catch {
      body = { raw: responseText }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to update Daydream parameters", code: body?.code || "UNKNOWN", status: upstream.status, details: body },
        { status: upstream.status },
      )
    }

    return NextResponse.json(body)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("Daydream parameters request timed out", 504)
    }
    const message = error instanceof Error ? error.message : "Unexpected error"
    return jsonError(message, 500)
  }
}
