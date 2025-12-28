"use client"

import { useMemo } from "react"
import Image from "next/image"
import clsx from "clsx"
import { SendHorizontal } from "lucide-react"
import type { MetaDjAiWelcomeDetails } from "@/types/metadjai"

interface WelcomeStarter {
  title: string
  description: string
  prompt: string
}

interface MetaDjAiWelcomeStateProps {
  starters: WelcomeStarter[]
  onSelectStarter: (prompt: string) => void
  isDisabled: boolean
  cooldownLabel: string | null
}

/**
 * MetaDjAiWelcomeState - Initial welcome screen for MetaDJai chat
 *
 * Displays brand identity, suggested conversation starters, and handles
 * rate limit cooldown states.
 */
export function MetaDjAiWelcomeState({
  starters,
  onSelectStarter,
  isDisabled,
  cooldownLabel,
}: MetaDjAiWelcomeStateProps) {
  const { headline } = useMemo(() => buildWelcomeCopy(), [])

  return (
    <div className="flex flex-col gap-6 text-white mt-2">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-16 h-16 shrink-0 rounded-full overflow-hidden border-2 border-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.4)] mb-3">
          <Image
            src="/images/avatars/metadj-pfp.png"
            alt="MetaDJai"
            width={64}
            height={64}
            className="object-cover"
            priority
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gradient-hero mb-3 text-pop">
          {headline}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[1100px]:gap-2.5 max-w-2xl mx-auto w-full">
        {starters.map((starter) => (
          <button
            key={starter.title}
            type="button"
            onClick={() => onSelectStarter(starter.prompt)}
            disabled={isDisabled}
            className={clsx(
              "group relative flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/2 px-4 py-2 min-[1100px]:py-3 text-left transition-all duration-300",
              "hover:border-purple-500/40 hover:bg-purple-500/10 hover:shadow-[0_0_25px_rgba(168,85,247,0.1)] focus-ring",
              isDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 group-hover:text-purple-300 transition-colors">{starter.title}</p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                <SendHorizontal className="h-3 w-3 text-purple-300" />
              </div>
            </div>
            <p className="hidden min-[1100px]:block text-sm text-white/80 group-hover:text-white transition-colors leading-relaxed">{starter.description}</p>
          </button>
        ))}
      </div>

      {isDisabled && cooldownLabel && (
        <p className="text-center text-xs text-white/70">Cooling down... {cooldownLabel}</p>
      )}
    </div>
  )
}

function buildWelcomeCopy() {
  return {
    headline: "MetaDJai",
  }
}

export function buildWelcomeStarters(details?: MetaDjAiWelcomeDetails | null): WelcomeStarter[] {
  const trackLabel = details?.nowPlayingTitle
    ? `${details.nowPlayingTitle}${details?.nowPlayingArtist ? ` by ${details.nowPlayingArtist}` : ""}`
    : null
  const hasCollection = !!details?.collectionTitle
  const collectionLabel = details?.collectionTitle ?? "Featured blends"
  const hasAnyMusic = trackLabel || hasCollection

  const exploreSongPrompt = trackLabel
    ? `Let's explore ${trackLabel} together. Share what this track evokes—the mood, the story it tells, and one unexpected creative direction it inspires. Then ask what it stirs in me. Keep each insight on its own line.`
    : hasCollection
      ? `Let's explore ${collectionLabel} together. Share what this collection evokes—the mood, the arc it suggests, and one unexpected creative direction it inspires. Then ask what draws me to it. Keep each insight on its own line.`
      : `I notice no music is playing yet—that's the perfect blank canvas. Ask me what mood or feeling I want to explore, then guide me toward finding the right soundtrack. Suggest how to browse collections or discover tracks that match my creative headspace. Keep each suggestion on its own line.`

  const exploreSongDescription = hasAnyMusic
    ? "Dive deeper into what's filling the air. Let the music guide our conversation."
    : "No music playing yet? Let's find the perfect soundtrack for this moment."

  return [
    {
      title: "Spark My Imagination",
      description: "Ignite unexpected creative directions. Let's discover what wants to emerge.",
      prompt: "Ask me one evocative question to unlock my imagination. Then offer three surprising creative sparks—unexpected angles, wild connections, or hidden possibilities. Keep each spark on its own line with a bold label.",
    },
    {
      title: "Explore An Idea",
      description: "Bring something brewing in your mind. I'll help you shape it.",
      prompt: "Ask me what idea is on my mind. Then reflect it back with fresh perspective—one insight I might have missed, one question to push it further, and one small experiment to try. Use line breaks between pieces.",
    },
    {
      title: "Create A Vision",
      description: "Transform thoughts into something tangible. From concept to clarity.",
      prompt: "Ask me what I want to bring to life. Help me articulate the vision clearly—the essence, the feeling it should evoke, and three concrete elements that would make it real. Format each element on its own line.",
    },
    {
      title: "Explore What’s Playing",
      description: exploreSongDescription,
      prompt: exploreSongPrompt,
    },
  ]
}

export function buildNoTrackStarters(nowPlayingTitle?: string, nowPlayingArtist?: string, collectionTitle?: string): WelcomeStarter[] {
  const hasCollection = !!collectionTitle
  const collectionLabel = collectionTitle ?? "Featured blends"

  const exploreSongPrompt = hasCollection
    ? `Let's explore ${collectionLabel} together. Share what this collection evokes—the mood, the arc it suggests, and one unexpected creative direction it inspires. Then ask what draws me to it. Keep each insight on its own line.`
    : `I notice no music is playing yet—that's the perfect blank canvas. Ask me what mood or feeling I want to explore, then guide me toward finding the right soundtrack. Suggest how to browse collections or discover tracks that match my creative headspace. Keep each suggestion on its own line.`

  const exploreSongDescription = hasCollection
    ? "Dive deeper into what's filling the air. Let the music guide our conversation."
    : "No music playing yet? Let's find the perfect soundtrack for this moment."

  return [
    {
      title: "Spark My Imagination",
      description: "Ignite unexpected creative directions. Let's discover what wants to emerge.",
      prompt: "Ask me one evocative question to unlock my imagination. Then offer three surprising creative sparks—unexpected angles, wild connections, or hidden possibilities. Keep each spark on its own line with a bold label.",
    },
    {
      title: "Explore An Idea",
      description: "Bring something brewing in your mind. I'll help you shape it.",
      prompt: "Ask me what idea is on my mind. Then reflect it back with fresh perspective—one insight I might have missed, one question to push it further, and one small experiment to try. Use line breaks between pieces.",
    },
    {
      title: "Create A Vision",
      description: "Transform thoughts into something tangible. From concept to clarity.",
      prompt: "Ask me what I want to bring to life. Help me articulate the vision clearly—the essence, the feeling it should evoke, and three concrete elements that would make it real. Format each element on its own line.",
    },
    {
      title: "Explore What’s Playing",
      description: exploreSongDescription,
      prompt: exploreSongPrompt,
    },
  ]
}
