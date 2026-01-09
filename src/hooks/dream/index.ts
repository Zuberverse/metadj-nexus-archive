/**
 * Dream Hook Module Index
 *
 * Organizes Daydream AI video integration hooks into focused modules.
 *
 * Module Structure:
 * - use-dream.ts (main) - Primary hook for stream lifecycle
 * - use-dream-countdown.ts - Warmup countdown timer management
 * - use-dream-status-poll.ts - Stream status polling logic
 * - use-dream-prompt-sync.ts - Runtime prompt synchronization
 *
 * Usage:
 * ```tsx
 * import { useDream } from "@/hooks/use-dream"
 * // or import focused hooks for testing/composition:
 * import { useDreamCountdown } from "@/hooks/dream"
 * ```
 *
 * @module hooks/dream
 */

export { useDreamCountdown } from "../use-dream-countdown"
export { useDreamStatusPoll } from "../use-dream-status-poll"
export { useDreamPromptSync } from "../use-dream-prompt-sync"

// Types re-exported for convenience
export type { DaydreamStatus } from "@/types/daydream.types"
