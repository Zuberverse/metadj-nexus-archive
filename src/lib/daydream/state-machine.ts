/**
 * Daydream Stream State Machine
 *
 * Defines the formal state machine for Daydream AI video streaming.
 * Used by the useDream hook to ensure valid state transitions.
 *
 * ## State Diagram
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                                                         │
 * │    ┌──────┐     start     ┌───────────┐               │
 * │    │ idle │──────────────>│ countdown │               │
 * │    └──────┘               └─────┬─────┘               │
 * │       ▲                         │                      │
 * │       │                         │ countdown ends       │
 * │       │                         ▼                      │
 * │       │                  ┌────────────┐                │
 * │       │ stop             │ connecting │────┐           │
 * │       │                  └──────┬─────┘    │           │
 * │       │                         │          │ error     │
 * │       │                         │ WHIP     │           │
 * │       │                         │ success  │           │
 * │       │                         ▼          ▼           │
 * │       │                  ┌───────────┐  ┌───────┐      │
 * │       └──────────────────│ streaming │  │ error │      │
 * │                          └───────────┘  └───┬───┘      │
 * │                               │             │          │
 * │                               │ stop/error  │ stop     │
 * │                               ▼             │          │
 * │                          ┌──────┐           │          │
 * │                          │ idle │<──────────┘          │
 * │                          └──────┘                      │
 * │                                                         │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * ## States
 *
 * - **idle**: Initial state, ready to start
 * - **countdown**: Warm-up countdown before stream becomes visible
 * - **connecting**: Creating stream and establishing WHIP connection
 * - **streaming**: Active stream with video flowing
 * - **error**: Error occurred, can retry or stop
 *
 * @module lib/daydream/state-machine
 */

/**
 * Valid state machine states
 */
export type DreamState = 'idle' | 'countdown' | 'connecting' | 'streaming' | 'error'

/**
 * Events that can trigger state transitions
 */
export type DreamEvent =
  | { type: 'START' }
  | { type: 'COUNTDOWN_END' }
  | { type: 'WHIP_CONNECTED' }
  | { type: 'STREAM_ACTIVE' }
  | { type: 'ERROR'; message: string }
  | { type: 'STOP' }
  | { type: 'RETRY' }

/**
 * Valid state transitions
 */
export const STATE_TRANSITIONS: Record<DreamState, DreamEvent['type'][]> = {
  idle: ['START'],
  countdown: ['COUNTDOWN_END', 'ERROR', 'STOP'],
  connecting: ['WHIP_CONNECTED', 'STREAM_ACTIVE', 'ERROR', 'STOP'],
  streaming: ['ERROR', 'STOP'],
  error: ['RETRY', 'STOP'],
}

/**
 * Compute the next state given current state and event
 *
 * @param currentState - Current state
 * @param event - Event to process
 * @returns Next state or null if transition is invalid
 */
export function getNextState(currentState: DreamState, event: DreamEvent): DreamState | null {
  const validEvents = STATE_TRANSITIONS[currentState]

  if (!validEvents.includes(event.type)) {
    return null // Invalid transition
  }

  switch (event.type) {
    case 'START':
      return 'countdown'
    case 'COUNTDOWN_END':
      return 'connecting'
    case 'WHIP_CONNECTED':
    case 'STREAM_ACTIVE':
      return 'streaming'
    case 'ERROR':
      return 'error'
    case 'STOP':
      return 'idle'
    case 'RETRY':
      return 'countdown'
    default:
      return null
  }
}

/**
 * Check if a state transition is valid
 *
 * @param from - Source state
 * @param to - Target state
 * @returns true if transition is valid
 */
export function isValidTransition(from: DreamState, to: DreamState): boolean {
  // Map target states back to events that produce them
  const eventForState: Record<DreamState, DreamEvent['type'][]> = {
    idle: ['STOP'],
    countdown: ['START', 'RETRY'],
    connecting: ['COUNTDOWN_END'],
    streaming: ['WHIP_CONNECTED', 'STREAM_ACTIVE'],
    error: ['ERROR'],
  }

  const validEvents = STATE_TRANSITIONS[from]
  const eventsForTarget = eventForState[to]

  return eventsForTarget.some((event) => validEvents.includes(event))
}

/**
 * State machine context for debugging
 */
export interface DreamStateMachineContext {
  state: DreamState
  streamId?: string
  playbackId?: string
  whipUrl?: string
  playbackUrl?: string
  message?: string
  countdownRemaining?: number
  lastTransition?: {
    from: DreamState
    to: DreamState
    event: DreamEvent['type']
    timestamp: number
  }
}

/**
 * Create initial state machine context
 */
export function createInitialContext(): DreamStateMachineContext {
  return {
    state: 'idle',
  }
}

/**
 * Log a state transition for debugging
 *
 * @param from - Source state
 * @param to - Target state
 * @param event - Event that triggered transition
 * @param logger - Logger instance
 */
export function logTransition(
  from: DreamState,
  to: DreamState,
  event: DreamEvent['type'],
  logger: { debug: (msg: string, ctx?: Record<string, unknown>) => void }
): void {
  const isValid = isValidTransition(from, to)
  logger.debug(`[Dream State Machine] ${from} -> ${to}`, {
    event,
    valid: isValid,
    timestamp: Date.now(),
  })
}
