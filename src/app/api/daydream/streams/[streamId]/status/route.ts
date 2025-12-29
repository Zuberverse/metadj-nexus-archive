import { NextResponse } from "next/server"
import { getActiveStream, getClientIdentifier } from "@/lib/daydream/stream-limiter"
import { daydreamFetch, parseJson, jsonError } from "../../../utils"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  try {
    const { streamId } = await params
    if (!streamId) {
      return NextResponse.json({ error: "Missing streamId" }, { status: 400 })
    }

    const { id: clientId } = getClientIdentifier(request)
    const activeStream = await getActiveStream(clientId)
    if (!activeStream || activeStream.streamId !== streamId) {
      return NextResponse.json({ error: "Stream not owned by active session" }, { status: 403 })
    }

    const upstream = await daydreamFetch(`/v1/streams/${encodeURIComponent(streamId)}/status`, {
      method: "GET",
    })
    const body = await parseJson(upstream)

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Daydream status", details: body },
        { status: upstream.status },
      )
    }

    return NextResponse.json(body)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("Daydream status request timed out", 504)
    }
    const message = error instanceof Error ? error.message : "Unexpected error"
    return jsonError(message, 500)
  }
}
