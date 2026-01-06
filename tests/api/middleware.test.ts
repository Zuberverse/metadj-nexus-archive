import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import proxy from "@/proxy"

describe("proxy middleware", () => {
  it("sets CSP with a nonce and required directives", async () => {
    const request = new NextRequest("http://localhost/")
    const response = await proxy(request)

    const csp = response.headers.get("Content-Security-Policy")
    expect(csp).toBeTruthy()
    expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/)
    expect(csp).toContain("style-src-attr 'unsafe-inline'")
  })

  it("sets core security headers on all responses", async () => {
    const request = new NextRequest("http://localhost/")
    const response = await proxy(request)

    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("Permissions-Policy")).toContain("camera=(self)")
  })
})
