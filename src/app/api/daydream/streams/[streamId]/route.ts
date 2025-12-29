import { NextResponse } from "next/server"
import { getActiveStream, getClientIdentifier, endStream } from "@/lib/daydream/stream-limiter"
import { daydreamFetch, parseJson, jsonError } from "../../utils"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
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

    // Clear rate limiter so user can create new stream immediately
    await endStream(clientId, streamId)

    // Per official Daydream OpenAPI: DELETE /v1/streams?id={id}
    const upstream = await daydreamFetch(`/v1/streams?id=${encodeURIComponent(streamId)}`, {
      method: "DELETE",
    })

    if (!upstream.ok && upstream.status !== 404 && upstream.status !== 405) {
      const body = await parseJson(upstream)
      return NextResponse.json(
        { error: "Failed to delete Daydream stream", details: body },
        { status: upstream.status },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("Daydream delete timed out", 504)
    }
    const message = error instanceof Error ? error.message : "Unexpected error"
    return jsonError(message, 500)
  }
}
