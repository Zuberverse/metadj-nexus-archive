import { NextRequest } from "next/server"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { POST as metadjaiPost } from "@/app/api/metadjai/route"
import { POST as metadjaiStreamPost } from "@/app/api/metadjai/stream/route"

const getEnvMock = vi.hoisted(() => vi.fn())
const checkRateLimitDistributedMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/env", () => ({
  getEnv: getEnvMock,
}))

vi.mock("@/lib/ai/rate-limiter", () => ({
  sanitizeMessages: (messages: unknown) => messages,
  getClientIdentifier: () => ({ id: "client-1", isFingerprint: false }),
  checkRateLimitDistributed: checkRateLimitDistributedMock,
  generateSessionId: () => "session-1",
  buildRateLimitResponse: (remainingMs: number) => ({
    error: "Rate limit exceeded",
    retryAfter: Math.ceil(remainingMs / 1000),
  }),
  SESSION_COOKIE_NAME: "metadjai-session",
  SESSION_COOKIE_MAX_AGE: 300,
  SESSION_COOKIE_PATH: "/",
  RATE_LIMIT_WINDOW_MS: 300_000,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock origin validation to allow all requests in tests
vi.mock("@/lib/validation/origin-validation", () => ({
  validateOrigin: () => ({ allowed: true, origin: "http://localhost:8100" }),
  buildOriginForbiddenResponse: vi.fn(),
}))

describe("MetaDJai routes", () => {
  beforeEach(() => {
    getEnvMock.mockReset()
    checkRateLimitDistributedMock.mockReset()
    checkRateLimitDistributedMock.mockResolvedValue({ allowed: true })
  })

  it("returns 503 when no AI providers are configured (non-streaming)", async () => {
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GOOGLE_API_KEY: "",
      XAI_API_KEY: "",
    })

    const request = new NextRequest("http://localhost/api/metadjai", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
      headers: { "content-type": "application/json" },
    })
    const response = await metadjaiPost(request)

    expect(response.status).toBe(503)
    expect(checkRateLimitDistributedMock).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid payloads (non-streaming)", async () => {
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "test-key",
      ANTHROPIC_API_KEY: "",
      GOOGLE_API_KEY: "",
      XAI_API_KEY: "",
    })

    const request = new NextRequest("http://localhost/api/metadjai", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
      headers: { "content-type": "application/json" },
    })
    const response = await metadjaiPost(request)

    expect(response.status).toBe(400)
  })

  it("returns 503 when no AI providers are configured (streaming)", async () => {
    getEnvMock.mockReturnValue({
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GOOGLE_API_KEY: "",
      XAI_API_KEY: "",
    })

    const request = new NextRequest("http://localhost/api/metadjai/stream", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
      headers: { "content-type": "application/json" },
    })
    const response = await metadjaiStreamPost(request)

    expect(response.status).toBe(503)
  })
})
