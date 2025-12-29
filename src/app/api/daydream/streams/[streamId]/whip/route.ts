import { getActiveStream, getClientIdentifier } from "@/lib/daydream/stream-limiter"
import { logger } from "@/lib/logger"
import { getDaydreamConfig } from "../../../utils"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Maximum allowed WHIP payload size (64KB).
 * SDP payloads are typically 1-4KB; 64KB provides headroom for ICE candidates.
 */
const MAX_WHIP_BODY_SIZE = 64 * 1024

const DEFAULT_ALLOWED_HOSTS = [
  "daydream.live",
  "sdaydream.live",
  "livepeer.com",
  "livepeer.studio",
  "livepeer.cloud",
  "lp-playback.studio",
]

function getAllowedHosts() {
  const { allowedHosts } = getDaydreamConfig()
  const merged = allowedHosts.length > 0 ? allowedHosts : DEFAULT_ALLOWED_HOSTS
  return merged
}

function isAllowedHost(hostname: string) {
  const hosts = getAllowedHosts()
  if (hosts.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`))) return true
  const { allowDevWhip } = getDaydreamConfig()
  if (!allowDevWhip) return false
  return hostname === "localhost" || hostname === "127.0.0.1"
}

function enforceHttps(url: URL) {
  if (url.protocol === "http:" && isAllowedHost(url.hostname)) {
    return new URL(url.toString().replace(/^http:/, "https:"))
  }
  return url
}

function resolveResource(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("resource")?.trim()
  if (!raw) throw new Response("Missing resource URL", { status: 400 })
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Response("Invalid resource URL", { status: 400 })
  }

  const { allowDevWhip } = getDaydreamConfig()
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1"
  if (url.protocol !== "https:") {
    if (url.protocol === "http:" && isAllowedHost(url.hostname)) {
      url = enforceHttps(url)
    } else if (!(allowDevWhip && isLocal && url.protocol === "http:")) {
      throw new Response("Only HTTPS WHIP endpoints are allowed", { status: 400 })
    }
  }

  if (!isAllowedHost(url.hostname)) {
    throw new Response("Forbidden WHIP host", { status: 403 })
  }

  return url
}

function buildProxyLocation(origin: string, streamId: string, upstreamLocation: string, base: URL) {
  const absolute = enforceHttps(new URL(upstreamLocation, base)).toString()
  return `${origin}/api/daydream/streams/${encodeURIComponent(streamId)}/whip?resource=${encodeURIComponent(absolute)}`
}

async function assertStreamOwnership(req: NextRequest, streamId: string) {
  const { id: clientId } = getClientIdentifier(req)
  const activeStream = await getActiveStream(clientId)
  if (!activeStream || activeStream.streamId !== streamId) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("[Dream] WHIP session mismatch", {
        clientId,
        streamId,
        activeStreamId: activeStream?.streamId,
      })
    }
    throw new Response("Stream not owned by active session", { status: 403 })
  }
}

async function proxyRequest(
  req: NextRequest,
  ctx: { params: Promise<{ streamId: string }> },
  method: "POST" | "PATCH" | "DELETE",
) {
  // NOTE: We intentionally do NOT add an Authorization header here.
  // The WHIP URL from Daydream/Livepeer is pre-signed with a stream-specific token
  // embedded in the URL path (e.g., stk_xxx). Adding a Bearer token with the API key
  // causes auth conflicts and 401/403 errors.
  const { streamId } = await ctx.params
  if (!streamId) {
    throw new Response("Missing streamId", { status: 400 })
  }
  await assertStreamOwnership(req, streamId)
  const target = resolveResource(req)

  const headers: Record<string, string> = {
    Accept: "application/sdp",
  }
  if (method !== "DELETE") {
    headers["Content-Type"] =
      method === "PATCH"
        ? req.headers.get("content-type") || "application/trickle-ice-sdpfrag"
        : "application/sdp"
  }

  const body = method === "DELETE" ? undefined : await req.text()
  if ((method === "POST" || method === "PATCH") && (!body || body.trim().length === 0)) {
    throw new Response("Missing WHIP payload", { status: 400 })
  }
  if (body && body.length > MAX_WHIP_BODY_SIZE) {
    throw new Response("Payload too large", { status: 413 })
  }

  const upstream = await fetch(target, { method, headers, body })

  if (process.env.NODE_ENV !== "production") {
    // Lightweight debug logging for local dev - avoids leaking payloads
    logger.debug("[Dream] WHIP proxy request", { method, host: target.hostname, path: target.pathname, status: upstream.status })
  }

  if (method === "DELETE") {
    if (upstream.ok || upstream.status === 404 || upstream.status === 405) {
      return new Response(null, { status: 204 })
    }
    const text = await upstream.text().catch(() => "")
    return new Response(text, { status: upstream.status })
  }

  const responseHeaders: HeadersInit = {
    "Content-Type": upstream.headers.get("Content-Type") || "application/sdp",
  }

  // Forward Link headers - these contain ICE server info per WHIP spec (RFC 8840)
  // Format: <turn:host>; rel="ice-server"; username="xxx"; credential="yyy"
  const linkHeader = upstream.headers.get("Link")
  if (linkHeader) {
    responseHeaders["Link"] = linkHeader
  }

  const location = upstream.headers.get("Location")
  if (location) {
    const origin = req.nextUrl.origin.replace("0.0.0.0", "localhost")
    responseHeaders["Location"] = buildProxyLocation(origin, streamId, location, target)
  }

  const text = await upstream.text()
  return new Response(text, { status: upstream.status, headers: responseHeaders })
}

export const POST = async (req: NextRequest, ctx: { params: Promise<{ streamId: string }> }) => {
  try {
    return await proxyRequest(req, ctx, "POST")
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : "Unexpected error"
    return new Response(message, { status: 500 })
  }
}

// Some tooling/browser fetches this route with GET (e.g., network probing),
// which would otherwise surface a noisy 405 in the console. WHIP itself uses
// POST/PATCH/DELETE, so GET/HEAD are safe no-ops.
export const GET = async () => new Response(null, { status: 204 })
export const HEAD = GET

export const PATCH = async (req: NextRequest, ctx: { params: Promise<{ streamId: string }> }) => {
  try {
    return await proxyRequest(req, ctx, "PATCH")
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : "Unexpected error"
    return new Response(message, { status: 500 })
  }
}

export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ streamId: string }> }) => {
  try {
    return await proxyRequest(req, ctx, "DELETE")
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : "Unexpected error"
    return new Response(message, { status: 500 })
  }
}
