/**
 * Dream Hooks
 *
 * Extracted hooks for Daydream AI video integration.
 * These hooks are composed by the main use-dream.ts hook.
 *
 * @module hooks/dream
 */

export { useWhipConnection } from "./use-whip-connection"
export type { UseWhipConnectionOptions, UseWhipConnectionReturn } from "./use-whip-connection"

export { useStatusPoll } from "./use-dream-status-poll"
export type { UseStatusPollOptions, UseStatusPollReturn } from "./use-dream-status-poll"

export { usePromptSync } from "./use-dream-prompt-sync"
export type { UsePromptSyncOptions, UsePromptSyncReturn } from "./use-dream-prompt-sync"
