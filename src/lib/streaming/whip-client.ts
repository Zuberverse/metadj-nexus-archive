"use client"

import { logger } from "@/lib/logger"

export interface WHIPConnectionOptions {
  whipUrl: string
  stream: MediaStream
  iceServers?: RTCIceServer[]
  iceTransportPolicy?: "all" | "relay"
  connectionTimeout?: number
  iceGatheringTimeout?: number
  enableTrickleICE?: boolean
}

export interface WHIPConnectionState {
  state: "connecting" | "connected" | "failed" | "disconnected" | "closed"
  error?: string
  iceConnectionState?: RTCIceConnectionState
  iceGatheringState?: RTCIceGatheringState
  signallingState?: RTCSignalingState
}

export class WHIPClient {
  private peerConnection: RTCPeerConnection | null = null
  private whipResourceUrl: string | null = null
  private options: WHIPConnectionOptions
  private state: WHIPConnectionState = { state: "disconnected" }
  private onStateChange?: (state: WHIPConnectionState) => void
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null
  private iceGatheringTimeout: ReturnType<typeof setTimeout> | null = null
  private pendingCandidates: RTCIceCandidate[] = []
  private candidatePatchInProgress = false
  private abortController: AbortController | null = null
  private intentionalClose = false

  constructor(options: WHIPConnectionOptions) {
    // Default ICE servers - Google STUN is sufficient for most connections
    const defaultIceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
    ]

    this.options = {
      iceServers: defaultIceServers,
      iceTransportPolicy: "all",
      connectionTimeout: 45000,
      iceGatheringTimeout: 20000,
      enableTrickleICE: true,
      ...options,
    }
  }

  onConnectionStateChange(callback: (state: WHIPConnectionState) => void): void {
    this.onStateChange = callback
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection
  }

  private async fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeout: number) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    this.abortController = controller
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
      this.abortController = null
    }
  }

  async connect(): Promise<void> {
    if (this.peerConnection) {
      throw new Error("WHIP client already has an active connection")
    }

    this.intentionalClose = false
    logger.info("[Dream] WHIP starting connection...")
    this.updateState({ state: "connecting" })

    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.options.iceServers,
        iceTransportPolicy: this.options.iceTransportPolicy,
        iceCandidatePoolSize: 10, // Pre-gather candidates for faster connection
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      })
      logger.debug("[Dream] RTCPeerConnection created", { iceServers: this.options.iceServers?.map(s => typeof s.urls === 'string' ? s.urls : s.urls[0]) })

      this.setupPeerConnectionHandlers()

      // Validate stream before adding tracks
      const tracks = this.options.stream.getTracks()
      logger.debug("[Dream] Adding tracks", { tracks: tracks.map(t => ({ kind: t.kind, readyState: t.readyState, enabled: t.enabled })) })

      if (tracks.length === 0) {
        throw new Error("MediaStream has no tracks")
      }

      const videoTrack = tracks.find(t => t.kind === "video")
      if (videoTrack && videoTrack.readyState !== "live") {
        throw new Error(`Video track is not live (state: ${videoTrack.readyState})`)
      }

      // Monitor track state during connection
      tracks.forEach((track) => {
        this.peerConnection?.addTrack(track, this.options.stream)

        // Watch for track ending during connection
        track.onended = () => {
          logger.error("[Dream] Track ended during connection", { kind: track.kind })
          if (this.state.state === "connecting") {
            this.updateState({
              state: "failed",
              error: `${track.kind} track ended unexpectedly`,
            })
          }
        }
      })

      this.connectionTimeout = setTimeout(() => {
        this.handleConnectionTimeout()
      }, this.options.connectionTimeout!)

      logger.debug("[Dream] Creating offer...")
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      })
      logger.debug("[Dream] Offer created", { sdpLength: offer.sdp?.length })

      // Verify SDP has required attributes
      if (offer.sdp) {
        if (!offer.sdp.includes("a=group:BUNDLE")) {
          logger.warn("[Dream] SDP missing BUNDLE attribute")
        }
        if (!offer.sdp.includes("a=rtcp-mux")) {
          logger.warn("[Dream] SDP missing rtcp-mux")
        }
      }

      await this.peerConnection.setLocalDescription(offer)
      logger.debug("[Dream] Local description set")

      if (this.options.enableTrickleICE) {
        logger.debug("[Dream] Sending offer to WHIP (trickle ICE enabled)...")
        await this.sendOfferToWHIP(offer.sdp!)
      } else {
        logger.debug("[Dream] Waiting for ICE gathering...")
        await this.waitForICEGathering()
        const completeOffer = this.peerConnection.localDescription
        if (!completeOffer?.sdp) {
          throw new Error("Failed to get local description after ICE gathering")
        }
        await this.sendOfferToWHIP(completeOffer.sdp)
      }
      logger.info("[Dream] WHIP offer sent successfully")
    } catch (error) {
      logger.error("[Dream] WHIP connection error", { error: String(error) })
      this.updateState({
        state: "failed",
        error: error instanceof Error ? error.message : "Unknown connection error",
      })
      await this.cleanup()
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true

    // Clear reference and remove handlers BEFORE closing to prevent spurious events
    const pc = this.peerConnection
    this.peerConnection = null

    if (pc) {
      try {
        // Remove event handlers first
        pc.onconnectionstatechange = null
        pc.onicecandidate = null
        pc.onicegatheringstatechange = null
        pc.onicecandidateerror = null
        pc.oniceconnectionstatechange = null

        pc.getSenders().forEach((sender) => sender.track?.stop())
        pc.close()
      } catch {
        // ignore
      }
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    if (this.whipResourceUrl) {
      try {
        await fetch(this.whipResourceUrl, { method: "DELETE" })
      } catch {
        // ignore upstream cleanup errors
      }
    }

    await this.cleanup()
    this.updateState({ state: "closed" })
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.options.enableTrickleICE) {
        this.handleICECandidate(event.candidate)
      }
    }

    // ICE candidate errors (e.g., STUN lookup failures) are non-fatal and expected
    // during normal ICE probing - no logging needed as connections can still succeed

    this.peerConnection.onicegatheringstatechange = () => {
      if (!this.peerConnection) return
      const gatheringState = this.peerConnection.iceGatheringState
      logger.debug("[Dream] ICE gathering state", { gatheringState })
      if (gatheringState === "complete") {
        if (this.iceGatheringTimeout) {
          clearTimeout(this.iceGatheringTimeout)
          this.iceGatheringTimeout = null
        }
      }
      this.updateState({ ...this.state, iceGatheringState: gatheringState })
    }

    // ICE connection state for more detailed monitoring
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return
      const iceState = this.peerConnection.iceConnectionState
      logger.debug("[Dream] ICE connection state", { iceState })

      // Handle ICE failures that might not trigger connectionstatechange
      if (iceState === "failed") {
        logger.error("[Dream] ICE connection failed")
        if (this.state.state === "connecting") {
          this.updateState({
            state: "failed",
            error: "ICE connection failed - unable to establish peer connection",
          })
        }
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return
      const pcState = this.peerConnection.connectionState
      logger.debug("[Dream] RTCPeerConnection state", {
        state: pcState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      })

      if (pcState === "connected") {
        this.updateState({ state: "connected" })
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }
      } else if (pcState === "failed") {
        this.updateState({ state: "failed", error: "Peer connection failed" })
      } else if (pcState === "disconnected") {
        // Don't immediately fail - disconnected can be transient
        logger.warn("[Dream] Connection disconnected, may recover...")
        this.updateState({ state: "disconnected" })

        // Wait for potential recovery before declaring failure
        setTimeout(() => {
          if (this.peerConnection?.connectionState === "disconnected") {
            logger.info("[Dream] Connection still disconnected after timeout")
            // Could attempt ICE restart here if needed
          }
        }, 5000)
      } else if (pcState === "closed") {
        // Only emit closed if it wasn't intentional and we weren't already in a terminal state
        if (!this.intentionalClose && this.state.state === "connecting") {
          logger.warn("[Dream] WHIP connection closed unexpectedly during connection")
          this.updateState({ state: "closed", error: "Connection closed unexpectedly" })
        } else if (this.intentionalClose) {
          logger.info("[Dream] WHIP connection closed intentionally")
        }
      }
    }
  }

  private async sendOfferToWHIP(offerSdp: string): Promise<void> {
    logger.debug("[Dream] Sending SDP offer", { url: this.options.whipUrl })
    const response = await this.fetchWithTimeout(
      this.options.whipUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offerSdp,
      },
      this.options.connectionTimeout ?? 45000,
    )
    logger.debug("[Dream] WHIP response", { status: response.status, statusText: response.statusText })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      const snippet = text ? ` - ${text.slice(0, 160)}` : ""
      logger.error("[Dream] WHIP offer rejected", {
        status: response.status,
        statusText: response.statusText,
        url: this.options.whipUrl,
        snippet,
      })
      const statusDetail = response.statusText ? ` ${response.statusText}` : ""
      throw new Error(`WHIP offer failed: ${response.status}${statusDetail}${snippet}`)
    }

    const answerSdp = await response.text()
    this.whipResourceUrl = response.headers.get("Location")
    logger.debug("[Dream] Got answer SDP", { length: answerSdp.length, location: this.whipResourceUrl })

    if (!this.whipResourceUrl) {
      logger.warn("[Dream] WHIP server did not provide a Location header")
    }

    if (!this.peerConnection) {
      throw new Error("Peer connection missing after WHIP offer")
    }

    await this.peerConnection.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    })
    logger.debug("[Dream] Remote description set", { signalingState: this.peerConnection.signalingState })

    this.updateState({ state: "connecting", signallingState: this.peerConnection.signalingState })

    // If ICE candidates were gathered before we learned the WHIP resource URL (Location),
    // flush them immediately so we don't get stuck waiting for more candidate events.
    await this.flushPendingICECandidates()
  }

  private async flushPendingICECandidates(): Promise<void> {
    if (!this.options.enableTrickleICE) return
    if (!this.whipResourceUrl) return
    if (this.pendingCandidates.length === 0) return
    if (this.candidatePatchInProgress) return

    this.candidatePatchInProgress = true
    try {
      const toSend = this.pendingCandidates.splice(0, this.pendingCandidates.length)
      const sdpFragment = toSend
        .map((c) => c.toJSON())
        .map((c) => `a=${c.candidate}`)
        .join("\r\n")

      await this.fetchWithTimeout(
        this.whipResourceUrl,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/trickle-ice-sdpfrag" },
          body: sdpFragment,
        },
        this.options.connectionTimeout ?? 45000,
      ).catch(() => {
        this.options.enableTrickleICE = false
      })
    } finally {
      this.candidatePatchInProgress = false
    }
  }

  private async waitForICEGathering(): Promise<void> {
    if (!this.peerConnection) return
    if (this.peerConnection.iceGatheringState === "complete") {
      logger.debug("[Dream] ICE gathering already complete")
      return
    }

    logger.debug("[Dream] Waiting for ICE gathering to complete...")

    await new Promise<void>((resolve) => {
      const onStateChange = () => {
        if (!this.peerConnection) return
        logger.debug("[Dream] ICE gathering state changed", { state: this.peerConnection.iceGatheringState })
        if (this.peerConnection.iceGatheringState === "complete") {
          this.peerConnection.removeEventListener("icegatheringstatechange", onStateChange)
          if (this.iceGatheringTimeout) {
            clearTimeout(this.iceGatheringTimeout)
            this.iceGatheringTimeout = null
          }
          resolve()
        }
      }

      this.peerConnection?.addEventListener("icegatheringstatechange", onStateChange)

      // Per Daydream docs: "Don't hang forever; some browsers stay 'gathering' longer than you want."
      // Resolve with whatever candidates we have after timeout - don't reject
      this.iceGatheringTimeout = setTimeout(() => {
        logger.debug("[Dream] ICE gathering timeout - proceeding with available candidates")
        this.peerConnection?.removeEventListener("icegatheringstatechange", onStateChange)
        resolve() // Resolve, not reject - use whatever candidates we gathered
      }, this.options.iceGatheringTimeout)
    })
  }

  private async handleICECandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.whipResourceUrl) {
      this.pendingCandidates.push(candidate)
      return
    }

    this.pendingCandidates.push(candidate)

    if (this.candidatePatchInProgress) {
      return
    }

    this.candidatePatchInProgress = true
    try {
      const toSend = this.pendingCandidates.splice(0, this.pendingCandidates.length)
      const sdpFragment = toSend
        .map((c) => c.toJSON())
        .map((c) => `a=${c.candidate}`)
        .join("\r\n")

      await this.fetchWithTimeout(
        this.whipResourceUrl,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/trickle-ice-sdpfrag" },
          body: sdpFragment,
        },
        this.options.connectionTimeout ?? 45000,
      ).catch(() => {
        this.options.enableTrickleICE = false
      })
    } finally {
      this.candidatePatchInProgress = false
    }
  }

  private handleConnectionTimeout(): void {
    logger.error("[Dream] Connection timeout", { timeoutMs: this.options.connectionTimeout })
    this.updateState({ state: "failed", error: "Connection timed out" })
    void this.cleanup()
  }

  private updateState(next: WHIPConnectionState): void {
    // Don't let "closed" overwrite "failed" - preserve error context
    if (this.state.state === "failed" && next.state === "closed") {
      logger.debug("[Dream] Ignoring closed state - already in failed state")
      return
    }

    // Don't emit state changes after intentional close (except for the final closed)
    if (this.intentionalClose && next.state !== "closed") {
      return
    }

    this.state = next
    if (this.onStateChange) {
      this.onStateChange({ ...next })
    }
  }

  private async cleanup(): Promise<void> {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
    if (this.iceGatheringTimeout) {
      clearTimeout(this.iceGatheringTimeout)
      this.iceGatheringTimeout = null
    }

    // Clear reference and remove handlers BEFORE closing to prevent spurious events
    const pc = this.peerConnection
    this.peerConnection = null

    if (pc) {
      try {
        // Remove event handlers first
        pc.onconnectionstatechange = null
        pc.onicecandidate = null
        pc.onicegatheringstatechange = null
        pc.onicecandidateerror = null
        pc.oniceconnectionstatechange = null

        pc.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.onended = null
            sender.track.stop()
          }
        })
        pc.close()
      } catch {
        // ignore
      }
    }
    this.pendingCandidates = []
    this.candidatePatchInProgress = false
  }
}
