"use client"

/**
 * MetaDJai Personalize Popover
 *
 * Settings panel for customizing MetaDJai response behavior.
 * Includes style profiles and detailed preference controls.
 */

import { useState, type RefObject } from "react"
import clsx from "clsx"
import { X } from "lucide-react"
import { MAX_PERSONALIZATION_LENGTH } from "@/lib/ai/limits"
import {
  PERSONALIZATION_FORMAT_OPTIONS,
  PERSONALIZATION_LENGTH_OPTIONS,
  PERSONALIZATION_PROFILES,
  PERSONALIZATION_TONE_OPTIONS,
} from "@/lib/ai/personalization"
import type { MetaDjAiPersonalizationState } from "@/types/metadjai.types"

interface MetaDjAiPersonalizePopoverProps {
  /** Ref for focus trap */
  popoverRef: RefObject<HTMLDivElement | null>
  /** Whether the popover is in panel mode (vs overlay) */
  isPanel: boolean
  /** Current personalization settings */
  personalization: MetaDjAiPersonalizationState
  /** Toggle personalization on/off */
  onPersonalizationToggle: (enabled: boolean) => void
  /** Update a personalization setting */
  onPersonalizationUpdate: (update: Partial<MetaDjAiPersonalizationState>) => void
  /** Callback to close the popover */
  onClose: () => void
}

export function MetaDjAiPersonalizePopover({
  popoverRef,
  isPanel,
  personalization,
  onPersonalizationToggle,
  onPersonalizationUpdate,
  onClose,
}: MetaDjAiPersonalizePopoverProps) {
  const [personalizeTab, setPersonalizeTab] = useState<"style" | "profile">("style")

  return (
    <div
      ref={popoverRef}
      className={clsx(
        "absolute top-14 bottom-16 z-100 rounded-3xl border border-white/20 bg-(--bg-surface-elevated)/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl flex flex-col overflow-hidden",
        isPanel ? "left-2 right-2" : "left-1/2 -translate-x-1/2 max-w-2xl w-[calc(100%-1rem)]"
      )}
    >
      <div className="relative mb-3 flex items-center justify-end shrink-0">
        <p className="absolute left-1/2 -translate-x-1/2 text-center text-sm font-heading font-semibold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
          Customize
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition hover:text-white hover:bg-white/10 focus-ring-glow"
          aria-label="Close personalize"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shrink-0">
        <div>
          <p className="text-sm font-semibold text-white">Personalize responses</p>
          <p className="text-xs text-white/60">Apply a profile + optional notes.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={personalization.enabled}
          aria-label="Toggle personalization"
          onClick={() => onPersonalizationToggle(!personalization.enabled)}
          className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center focus-ring-glow"
        >
          <span
            className={clsx(
              "absolute h-6 w-11 rounded-full border transition",
              personalization.enabled
                ? "border-cyan-400/60 bg-cyan-500/30"
                : "border-white/20 bg-white/10"
            )}
          />
          <span
            className={clsx(
              "absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform",
              personalization.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      <div className="mt-3 flex justify-center shrink-0">
        <div
          role="tablist"
          aria-label="Personalize sections"
          className="flex w-full max-w-md items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 p-1"
        >
          <button
            type="button"
            role="tab"
            id="personalize-tab-style"
            aria-selected={personalizeTab === "style"}
            aria-controls="personalize-panel-style"
            onClick={() => setPersonalizeTab("style")}
            className={clsx(
              "flex-1 rounded-full border border-transparent px-4 py-2 text-center text-sm font-heading font-semibold uppercase tracking-[0.2em] transition focus-ring-glow",
              personalizeTab === "style" ? "bg-white/10 border-white/20" : "hover:bg-white/8"
            )}
          >
            <span
              className={clsx(
                "block",
                personalizeTab === "style"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200"
                  : "text-white/60"
              )}
            >
              Style
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="personalize-tab-profile"
            aria-selected={personalizeTab === "profile"}
            aria-controls="personalize-panel-profile"
            onClick={() => setPersonalizeTab("profile")}
            className={clsx(
              "flex-1 rounded-full border border-transparent px-4 py-2 text-center text-sm font-heading font-semibold uppercase tracking-[0.2em] transition focus-ring-glow",
              personalizeTab === "profile" ? "bg-white/10 border-white/20" : "hover:bg-white/8"
            )}
          >
            <span
              className={clsx(
                "block",
                personalizeTab === "profile"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200"
                  : "text-white/60"
              )}
            >
              Profile
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0">
        {/* Style Tab Panel */}
        <div
          role="tabpanel"
          id="personalize-panel-style"
          aria-labelledby="personalize-tab-style"
          hidden={personalizeTab !== "style"}
          className="h-full overflow-y-auto pr-1 scrollbar-hide"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {PERSONALIZATION_PROFILES.map((profile) => {
              const isActive = profile.id === personalization.profileId
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onPersonalizationUpdate({ profileId: profile.id })}
                  aria-pressed={isActive}
                  className={clsx(
                    "group flex flex-col gap-1.5 rounded-2xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-cyan-400/60 bg-cyan-500/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/8"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{profile.label}</span>
                    {isActive && <span className="text-[10px] text-cyan-200/80">Active</span>}
                  </div>
                  <span className="text-[11px] text-white/60 group-hover:text-white/80">{profile.description}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Profile Tab Panel */}
        <div
          role="tabpanel"
          id="personalize-panel-profile"
          aria-labelledby="personalize-tab-profile"
          hidden={personalizeTab !== "profile"}
          className="h-full"
        >
          <div className="h-full space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 px-3 py-3 pr-1 scrollbar-hide">
            {/* Response Length */}
            <fieldset>
              <legend className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                Response length
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {PERSONALIZATION_LENGTH_OPTIONS.map((option) => {
                  const isActive = personalization.responseLength === option.id
                  return (
                    <label
                      key={option.id}
                      className={clsx(
                        "group flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all",
                        isActive
                          ? "border-cyan-400/60 bg-cyan-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/8"
                      )}
                    >
                      <input
                        type="radio"
                        name="metadjai-length"
                        value={option.id}
                        checked={isActive}
                        onChange={() => onPersonalizationUpdate({ responseLength: option.id })}
                        className="sr-only"
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{option.label}</span>
                      <span className="text-[11px] text-white/60 group-hover:text-white/80">{option.description}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Response Format */}
            <fieldset>
              <legend className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                Response format
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PERSONALIZATION_FORMAT_OPTIONS.map((option) => {
                  const isActive = personalization.responseFormat === option.id
                  return (
                    <label
                      key={option.id}
                      className={clsx(
                        "group flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all",
                        isActive
                          ? "border-purple-400/60 bg-purple-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/8"
                      )}
                    >
                      <input
                        type="radio"
                        name="metadjai-format"
                        value={option.id}
                        checked={isActive}
                        onChange={() => onPersonalizationUpdate({ responseFormat: option.id })}
                        className="sr-only"
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{option.label}</span>
                      <span className="text-[11px] text-white/60 group-hover:text-white/80">{option.description}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Tone */}
            <fieldset>
              <legend className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                Tone
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PERSONALIZATION_TONE_OPTIONS.map((option) => {
                  const isActive = personalization.tone === option.id
                  return (
                    <label
                      key={option.id}
                      className={clsx(
                        "group flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all",
                        isActive
                          ? "border-indigo-400/60 bg-indigo-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/8"
                      )}
                    >
                      <input
                        type="radio"
                        name="metadjai-tone"
                        value={option.id}
                        checked={isActive}
                        onChange={() => onPersonalizationUpdate({ tone: option.id })}
                        className="sr-only"
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{option.label}</span>
                      <span className="text-[11px] text-white/60 group-hover:text-white/80">{option.description}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Profile Fields */}
            <div className="space-y-3">
              <div>
                <label htmlFor="metadjai-profile-name" className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                  Name
                </label>
                <input
                  id="metadjai-profile-name"
                  type="text"
                  value={personalization.displayName}
                  onChange={(event) => onPersonalizationUpdate({ displayName: event.target.value })}
                  maxLength={80}
                  placeholder="How should MetaDJai address you?"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div>
                <label htmlFor="metadjai-profile-interests" className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                  Interests
                </label>
                <textarea
                  id="metadjai-profile-interests"
                  value={personalization.interests}
                  onChange={(event) => onPersonalizationUpdate({ interests: event.target.value })}
                  rows={2}
                  maxLength={240}
                  placeholder="Music, visuals, strategy, tech, etc."
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div>
                <label htmlFor="metadjai-profile-projects" className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                  Current projects
                </label>
                <textarea
                  id="metadjai-profile-projects"
                  value={personalization.currentProjects}
                  onChange={(event) => onPersonalizationUpdate({ currentProjects: event.target.value })}
                  rows={2}
                  maxLength={240}
                  placeholder="What are you building right now?"
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <div>
                <label htmlFor="metadjai-personalize-notes" className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-white/70">
                  Additional guidance
                </label>
                <textarea
                  id="metadjai-personalize-notes"
                  value={personalization.customInstructions}
                  onChange={(event) => onPersonalizationUpdate({ customInstructions: event.target.value })}
                  rows={3}
                  maxLength={MAX_PERSONALIZATION_LENGTH}
                  placeholder="Example: Keep it concise. Ask one clarifying question. Focus on product planning."
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
                <div className="mt-1 flex items-center justify-end text-[10px] text-muted-accessible">
                  <span>{personalization.customInstructions.length}/{MAX_PERSONALIZATION_LENGTH}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!personalization.enabled && (
        <p className="mt-3 text-[11px] text-muted-accessible">
          Turn on Personalize to apply these preferences.
        </p>
      )}
    </div>
  )
}
