"use client"

import React, { memo, useMemo, forwardRef, useCallback } from "react"
import Image from "next/image"
import clsx from "clsx"
import { Copy, Search, HelpCircle, Sparkles, Library, RotateCcw, ChevronLeft, ChevronRight, Square, CheckSquare, Globe, Play, Pause, SkipForward, SkipBack, ListMusic, Check, X, Music } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { usePlayer } from "@/contexts/PlayerContext"
import { usePlaylist } from "@/contexts/PlaylistContext"
import { useQueue } from "@/contexts/QueueContext"
import { useToast } from "@/contexts/ToastContext"
import { useUI } from "@/contexts/UIContext"
import { trackIndex } from "@/lib/music/data"
import type { MetaDjAiMessage, PlaybackProposal, QueueSetProposal, UiProposal, PlaylistProposal } from "@/types/metadjai.types"

/**
 * Tool display configuration for showing which tool is being used
 */
const TOOL_DISPLAY: Record<string, { label: string; icon: typeof Search }> = {
  searchCatalog: { label: "Searching catalog", icon: Search },
  getPlatformHelp: { label: "Checking platform info", icon: HelpCircle },
  getRecommendations: { label: "Finding recommendations", icon: Sparkles },
  getZuberantContext: { label: "Searching knowledge base", icon: Library },
  web_search: { label: "Searching the web", icon: Globe },
  proposePlayback: { label: "Thinking about music...", icon: Sparkles },
  proposeQueueSet: { label: "Lining up the queue...", icon: ListMusic },
  proposePlaylist: { label: "Curating a playlist...", icon: Music },
  proposeSurface: { label: "Preparing a suggestion...", icon: Sparkles },
}

type MarkdownNode = {
  type?: string
  value?: string
  children?: MarkdownNode[]
}

interface MessageItemProps {
  message: MetaDjAiMessage
  onCopy?: (value: string) => void
  onRegenerate?: () => void
  onSwitchVersion?: (messageId: string, versionIndex: number) => void
  isLastAssistantMessage?: boolean
  isConversationStreaming?: boolean
}

/**
 * remark-style plugin to preserve single line breaks from the model output.
 * Converts raw newline characters into <br/> nodes while leaving code blocks and links intact.
 */
function remarkHardBreaks() {
  const applyBreaks = (node: MarkdownNode) => {
    if (!node.children || node.type === "code" || node.type === "inlineCode" || node.type === "link") return

    const nextChildren: MarkdownNode[] = []

    node.children.forEach((child) => {
      if (child.type === "text" && typeof child.value === "string" && child.value.includes("\n")) {
        const lines = child.value.split(/\n/)
        lines.forEach((line, index) => {
          if (line.length > 0) {
            nextChildren.push({ type: "text", value: line })
          }
          if (index < lines.length - 1) {
            nextChildren.push({ type: "break" })
          }
        })
        return
      }

      if (child.children) {
        applyBreaks(child)
      }

      nextChildren.push(child)
    })

    node.children = nextChildren
  }

  return (tree: MarkdownNode) => {
    applyBreaks(tree)
  }
}

function sanitizeMarkdownHref(href: unknown): string | null {
  if (typeof href !== 'string') return null
  const trimmed = href.trim()
  if (!trimmed) return null

  // Allow internal anchors/paths.
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return url.toString()
    }
  } catch {
    // ignore
  }

  return null
}

function resolveTracksFromIds(trackIds: string[]) {
  return trackIds
    .map((id) => trackIndex.get(id))
    .filter((track): track is NonNullable<typeof track> => Boolean(track))
}

function useMusicPanelOpener() {
  const ui = useUI()

  return useCallback(
    (tab?: UiProposal["tab"]) => {
      if (tab) {
        ui.setLeftPanelTab(tab)
      }
      window.dispatchEvent(new CustomEvent("metadj:openMusicPanel"))
    },
    [ui]
  )
}

function ApprovalBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
      Approval required
    </span>
  )
}

/**
 * Interactive card for playback proposals (Active Control)
 */
function PlaybackProposalCard({ proposal }: { proposal: PlaybackProposal }) {
  const { play, pause, currentTrack, currentIndex, setCurrentTrack, setCurrentIndex, setShouldPlay } = usePlayer()
  const { queue, manualTrackIds, setQueue, setManualTrackIds } = useQueue()
  const { showToast } = useToast()
  const openMusicPanel = useMusicPanelOpener()
  const [status, setStatus] = React.useState<'pending' | 'confirmed' | 'cancelled'>('pending')

  // Reset status when proposal changes
  React.useEffect(() => {
    setStatus('pending')
  }, [proposal])

  const handleConfirm = () => {
    // Execute action
    switch (proposal.action) {
      case 'play':
        if (!proposal.trackId) {
          // If the proposal includes a title but no id, the catalog lookup failed.
          if (proposal.trackTitle) {
            showToast({ message: "Track not found", variant: "error" })
            setStatus('cancelled')
            break
          }

          // Resume playback (no specific track requested)
          play()
          setStatus('confirmed')
          openMusicPanel("queue")
          break
        }

        {
          const track = trackIndex.get(proposal.trackId)
          if (!track) {
            showToast({ message: "Track not found", variant: "error" })
            setStatus('cancelled')
            break
          }

          // If already in the current queue, jump to it.
          const existingIndex = queue.findIndex(t => t.id === track.id)
          if (existingIndex !== -1) {
            setCurrentIndex(existingIndex)
            setCurrentTrack(track)
            setShouldPlay(true)
            setStatus('confirmed')
            openMusicPanel("queue")
            break
          }

          // Not in queue: insert at front and play so Next/Prev remain consistent.
          const nextQueue = [track, ...queue]
          setQueue(nextQueue)
          setManualTrackIds([track.id, ...manualTrackIds.filter(id => id !== track.id)])
          setCurrentIndex(0)
          setCurrentTrack(track)
          setShouldPlay(true)
          setStatus('confirmed')
        }
        openMusicPanel("queue")
        break
      case 'pause':
        pause()
        setStatus('confirmed')
        openMusicPanel("queue")
        break
      case 'next':
        if (queue.length > 0) {
          const baseIndex = currentTrack
            ? queue.findIndex(t => t.id === currentTrack.id)
            : currentIndex
          const safeIndex = baseIndex >= 0 ? baseIndex : currentIndex
          const nextIndex = safeIndex + 1 >= queue.length ? 0 : safeIndex + 1
          const nextTrack = queue[nextIndex]
          if (nextTrack) {
            setCurrentIndex(nextIndex)
            setCurrentTrack(nextTrack)
            setShouldPlay(true)
          }
        }
        setStatus('confirmed')
        openMusicPanel("queue")
        break
      case 'prev':
        if (queue.length > 0) {
          const baseIndex = currentTrack
            ? queue.findIndex(t => t.id === currentTrack.id)
            : currentIndex
          const safeIndex = baseIndex >= 0 ? baseIndex : currentIndex
          const prevIndex = safeIndex - 1 < 0 ? queue.length - 1 : safeIndex - 1
          const prevTrack = queue[prevIndex]
          if (prevTrack) {
            setCurrentIndex(prevIndex)
            setCurrentTrack(prevTrack)
            setShouldPlay(true)
          }
        }
        setStatus('confirmed')
        openMusicPanel("queue")
        break
      case 'queue':
        if (!proposal.trackId) {
          if (proposal.trackTitle) {
            showToast({ message: "Track not found", variant: "error" })
            setStatus('cancelled')
          }
          break
        }

        {
          const track = trackIndex.get(proposal.trackId)
          if (!track) {
            showToast({ message: "Track not found", variant: "error" })
            setStatus('cancelled')
            break
          }

          // Avoid duplicates (manual IDs or existing queue).
          if (manualTrackIds.includes(track.id) || queue.some(t => t.id === track.id)) {
            showToast({ message: "Already in your queue" })
            setStatus('confirmed')
            openMusicPanel("queue")
            break
          }

          setManualTrackIds([...manualTrackIds, track.id])
          setQueue([...queue, track])
          showToast({ message: `Added ${track.title} to queue` })
          setStatus('confirmed')
        }
        openMusicPanel("queue")
        break
    }
  }

  if (status !== 'pending') {
    return (
      <div className={clsx(
        "mt-3 rounded-xl border px-4 py-3 text-sm",
        status === 'confirmed' ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-white/10 bg-white/5 text-muted-accessible"
      )}>
        <div className="flex items-center gap-2">
          {status === 'confirmed' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span>{status === 'confirmed' ? "Action confirmed" : "Action cancelled"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-500/30 bg-cyan-950/20">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-cyan-500/20 p-1.5 text-cyan-400">
            {proposal.action === 'play' && <Play className="h-4 w-4 fill-current" />}
            {proposal.action === 'pause' && <Pause className="h-4 w-4 fill-current" />}
            {proposal.action === 'next' && <SkipForward className="h-4 w-4 fill-current" />}
            {proposal.action === 'prev' && <SkipBack className="h-4 w-4 fill-current" />}
            {proposal.action === 'queue' && <ListMusic className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-sm font-semibold text-heading-solid">
                {proposal.action === 'queue' ? 'Add to queue?' : (proposal.action === 'play' ? 'Play this track?' : 'Confirm action')}
              </h4>
              {proposal.approvalRequired !== false && <ApprovalBadge />}
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              {proposal.context || (
                proposal.trackTitle
                  ? `${proposal.action === 'queue' ? 'Add' : 'Play'} "${proposal.trackTitle}"${proposal.trackArtist ? ` by ${proposal.trackArtist}` : ''} `
                  : `Are you sure you want to ${proposal.action}?`
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-t border-white/10">
        <button
          onClick={() => setStatus('cancelled')}
          className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 border-l border-white/10 py-2.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:bg-cyan-500/10 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

/**
 * Interactive card for UI/navigation proposals (Active Control)
 */
function UiProposalCard({ proposal }: { proposal: UiProposal }) {
  const ui = useUI()
  const { showToast } = useToast()
  const openMusicPanel = useMusicPanelOpener()
  const [status, setStatus] = React.useState<'pending' | 'confirmed' | 'cancelled'>('pending')

  React.useEffect(() => {
    setStatus('pending')
  }, [proposal])

  const handleConfirm = () => {
    switch (proposal.action) {
      case 'openWisdom':
        ui.setWisdomOpen(true)
        showToast({ message: "Wisdom opened" })
        break
      case 'openQueue':
        ui.setQueueOpen(true)
        openMusicPanel("queue")
        showToast({ message: "Queue opened" })
        break
      case 'openMusicPanel':
        openMusicPanel(proposal.tab ?? "browse")
        showToast({ message: "Music panel opened" })
        break
      case 'focusSearch': {
        const searchInput = document.getElementById('metadj-search-input') as HTMLInputElement | null
        if (searchInput) {
          searchInput.focus()
        } else {
          window.dispatchEvent(new CustomEvent("metadj:openSearch"))
        }
        showToast({ message: "Search focused" })
        break
      }
    }
    setStatus('confirmed')
  }

  if (status !== 'pending') {
    return (
      <div className={clsx(
        "mt-3 rounded-xl border px-4 py-3 text-sm",
        status === 'confirmed' ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-white/10 bg-white/5 text-muted-accessible"
      )}>
        <div className="flex items-center gap-2">
          {status === 'confirmed' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span>{status === 'confirmed' ? "Action confirmed" : "Action cancelled"}</span>
        </div>
      </div>
    )
  }

  const icon =
    proposal.action === 'openWisdom'
      ? Library
      : proposal.action === 'openQueue'
        ? ListMusic
        : proposal.action === 'openMusicPanel'
          ? Music
          : Search
  const title =
    proposal.action === 'openWisdom' ? 'Open Wisdom?' :
      proposal.action === 'openQueue' ? 'Open Queue?' :
        proposal.action === 'openMusicPanel' ? 'Open Music Panel?' :
          'Focus Search?'

  const description =
    proposal.context ||
    (proposal.action === 'focusSearch'
      ? 'Jump to the Search bar so you can type immediately.'
      : proposal.action === 'openMusicPanel'
        ? `Open Music and jump to ${proposal.tab ?? "your library"}.`
      : 'Confirm to open this panel.')

  const Icon = icon

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-500/25 bg-cyan-950/15">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-cyan-500/20 p-1.5 text-cyan-300">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-sm font-semibold text-heading-solid">{title}</h4>
              {proposal.approvalRequired !== false && <ApprovalBadge />}
            </div>
            <p className="text-xs text-white/70 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex border-t border-white/10">
        <button
          onClick={() => setStatus('cancelled')}
          className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 border-l border-white/10 py-2.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:bg-cyan-500/10 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

/**
 * Interactive card for multi-track queue proposals (Active Control)
 */
function QueueSetProposalCard({ proposal }: { proposal: QueueSetProposal }) {
  const player = usePlayer()
  const queueState = useQueue()
  const { showToast } = useToast()
  const openMusicPanel = useMusicPanelOpener()
  const [status, setStatus] = React.useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const [mode, setMode] = React.useState<'replace' | 'append'>(proposal.mode ?? 'replace')
  const [autoplay, setAutoplay] = React.useState(Boolean(proposal.autoplay))

  React.useEffect(() => {
    setStatus('pending')
    setMode(proposal.mode ?? 'replace')
    setAutoplay(Boolean(proposal.autoplay))
  }, [proposal])

  const resolvedTracks = useMemo(() => resolveTracksFromIds(proposal.trackIds), [proposal.trackIds])
  const previewTitles = resolvedTracks.slice(0, 3).map((track) => track.title)
  const totalTracks = resolvedTracks.length

  const handleConfirm = () => {
    if (resolvedTracks.length === 0) {
      showToast({ message: "No tracks found for this queue", variant: "error" })
      setStatus('cancelled')
      return
    }

    const existingIds = new Set(queueState.queue.map((track) => track.id))
    const newTracks = mode === 'append'
      ? resolvedTracks.filter((track) => !existingIds.has(track.id))
      : resolvedTracks

    if (mode === 'append' && newTracks.length === 0) {
      showToast({ message: "Everything is already in your queue", variant: "info" })
      openMusicPanel("queue")
      setStatus('confirmed')
      return
    }

    const nextQueue = mode === 'append'
      ? [...queueState.queue, ...newTracks]
      : newTracks

    const nextManualIds = mode === 'append'
      ? [
          ...queueState.manualTrackIds,
          ...newTracks.map((track) => track.id).filter((id) => !queueState.manualTrackIds.includes(id)),
        ]
      : newTracks.map((track) => track.id)

    queueState.setQueue(nextQueue)
    queueState.setManualTrackIds(nextManualIds)
    queueState.setAutoQueue([])
    queueState.setQueueContext('playlist')

    if (autoplay && newTracks[0]) {
      const targetIndex = mode === 'append' ? queueState.queue.length : 0
      player.setCurrentIndex(targetIndex)
      player.setCurrentTrack(newTracks[0])
      player.setShouldPlay(true)
      queueState.updatePersistenceMetadata({
        currentIndex: targetIndex,
        currentTrackId: newTracks[0].id,
      })
    }

    showToast({
      message: mode === 'append'
        ? `Added ${newTracks.length} track${newTracks.length === 1 ? "" : "s"} to queue`
        : `Queued ${newTracks.length} track${newTracks.length === 1 ? "" : "s"}`,
      variant: 'success',
    })
    openMusicPanel("queue")
    setStatus('confirmed')
  }

  if (status !== 'pending') {
    return (
      <div className={clsx(
        "mt-3 rounded-xl border px-4 py-3 text-sm",
        status === 'confirmed' ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-white/10 bg-white/5 text-muted-accessible"
      )}>
        <div className="flex items-center gap-2">
          {status === 'confirmed' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span>{status === 'confirmed' ? "Queue updated" : "Action cancelled"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-500/25 bg-cyan-950/15">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-cyan-500/20 p-1.5 text-cyan-300">
            <ListMusic className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-sm font-semibold text-heading-solid">Update your queue?</h4>
              {proposal.approvalRequired !== false && <ApprovalBadge />}
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              {proposal.context ||
                `${totalTracks} track${totalTracks === 1 ? "" : "s"} ready. ${previewTitles.length > 0 ? `Includes ${previewTitles.join(", ")}${totalTracks > 3 ? "…" : ""}` : ""}`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-col gap-2 text-xs text-white/70">
        <div className="flex items-center justify-between gap-2">
          <span>Queue mode</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={clsx(
                "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition",
                mode === 'replace' ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-muted-accessible hover:text-white/80"
              )}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setMode('append')}
              className={clsx(
                "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition",
                mode === 'append' ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-muted-accessible hover:text-white/80"
              )}
            >
              Append
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAutoplay((prev) => !prev)}
          className={clsx(
            "flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition",
            autoplay ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-white/5 text-white/60 hover:text-white/80"
          )}
        >
          <span>Start playback</span>
          {autoplay ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex border-t border-white/10">
        <button
          onClick={() => setStatus('cancelled')}
          className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 border-l border-white/10 py-2.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:bg-cyan-500/10 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

/**
 * Interactive card for playlist creation proposals (Active Control)
 */
function PlaylistProposalCard({ proposal }: { proposal: PlaylistProposal }) {
  const player = usePlayer()
  const queueState = useQueue()
  const { createPlaylist, addTracksToPlaylist } = usePlaylist()
  const { showToast } = useToast()
  const openMusicPanel = useMusicPanelOpener()
  const [status, setStatus] = React.useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const [queueMode, setQueueMode] = React.useState<'replace' | 'append' | 'none'>(proposal.queueMode ?? 'none')
  const [autoplay, setAutoplay] = React.useState(Boolean(proposal.autoplay))

  React.useEffect(() => {
    setStatus('pending')
    setQueueMode(proposal.queueMode ?? 'none')
    setAutoplay(Boolean(proposal.autoplay))
  }, [proposal])

  const resolvedTracks = useMemo(() => resolveTracksFromIds(proposal.trackIds ?? []), [proposal.trackIds])
  const previewTitles = resolvedTracks.slice(0, 3).map((track) => track.title)
  const totalTracks = resolvedTracks.length
  const shouldQueue = queueMode !== 'none'

  const handleConfirm = async () => {
    if (!proposal.name?.trim()) {
      showToast({ message: "Playlist name missing", variant: "error" })
      setStatus('cancelled')
      return
    }

    try {
      const newPlaylist = await createPlaylist(proposal.name.trim(), "metadjai")

      if (resolvedTracks.length > 0) {
        await addTracksToPlaylist(newPlaylist.id, resolvedTracks.map((track) => track.id))
      }

      window.dispatchEvent(new CustomEvent("metadj:openPlaylist", {
        detail: { playlistId: newPlaylist.id },
      }))
      openMusicPanel("playlists")

      if (shouldQueue && resolvedTracks.length > 0) {
        const mode = queueMode === 'append' ? 'append' : 'replace'
        const existingIds = new Set(queueState.queue.map((track) => track.id))
        const newTracks = mode === 'append'
          ? resolvedTracks.filter((track) => !existingIds.has(track.id))
          : resolvedTracks

        const nextQueue = mode === 'append'
          ? [...queueState.queue, ...newTracks]
          : newTracks

        const nextManualIds = mode === 'append'
          ? [
              ...queueState.manualTrackIds,
              ...newTracks.map((track) => track.id).filter((id) => !queueState.manualTrackIds.includes(id)),
            ]
          : newTracks.map((track) => track.id)

        queueState.setQueue(nextQueue)
        queueState.setManualTrackIds(nextManualIds)
        queueState.setAutoQueue([])
        queueState.setQueueContext('playlist')

        if (autoplay && newTracks[0]) {
          const targetIndex = mode === 'append' ? queueState.queue.length : 0
          player.setCurrentIndex(targetIndex)
          player.setCurrentTrack(newTracks[0])
          player.setShouldPlay(true)
          queueState.updatePersistenceMetadata({
            currentIndex: targetIndex,
            currentTrackId: newTracks[0].id,
          })
          openMusicPanel("queue")
        }
      }

      setStatus('confirmed')
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : "Playlist action failed", variant: "error" })
      setStatus('cancelled')
    }
  }

  if (status !== 'pending') {
    return (
      <div className={clsx(
        "mt-3 rounded-xl border px-4 py-3 text-sm",
        status === 'confirmed' ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-white/10 bg-white/5 text-muted-accessible"
      )}>
        <div className="flex items-center gap-2">
          {status === 'confirmed' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span>{status === 'confirmed' ? "Playlist created" : "Action cancelled"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-500/25 bg-cyan-950/15">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-cyan-500/20 p-1.5 text-cyan-300">
            <Music className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-sm font-semibold text-heading-solid">Create playlist?</h4>
              {proposal.approvalRequired !== false && <ApprovalBadge />}
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              {proposal.context ||
                `"${proposal.name}"${totalTracks > 0 ? ` • ${totalTracks} track${totalTracks === 1 ? "" : "s"}` : ""}${previewTitles.length ? ` (includes ${previewTitles.join(", ")}${totalTracks > 3 ? "…" : ""})` : ""}`}
            </p>
          </div>
        </div>
      </div>

      {totalTracks > 0 && (
        <div className="px-4 pb-3 flex flex-col gap-2 text-xs text-white/70">
          <div className="flex items-center justify-between">
            <span>Queue these tracks</span>
            <button
              type="button"
              onClick={() => setQueueMode((prev) => prev === 'none' ? 'replace' : 'none')}
              className={clsx(
                "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition",
                shouldQueue ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-muted-accessible hover:text-white/80"
              )}
            >
              {shouldQueue ? "On" : "Off"}
            </button>
          </div>

          {shouldQueue && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span>Queue mode</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQueueMode('replace')}
                    className={clsx(
                      "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition",
                      queueMode === 'replace' ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-muted-accessible hover:text-white/80"
                    )}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueMode('append')}
                    className={clsx(
                      "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition",
                      queueMode === 'append' ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-muted-accessible hover:text-white/80"
                    )}
                  >
                    Append
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoplay((prev) => !prev)}
                className={clsx(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition",
                  autoplay ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-white/5 text-white/60 hover:text-white/80"
                )}
              >
                <span>Start playback</span>
                {autoplay ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex border-t border-white/10">
        <button
          onClick={() => setStatus('cancelled')}
          className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 border-l border-white/10 py-2.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:bg-cyan-500/10 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

const CodeBlock = ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
  // Extract code content for copy button
  // ReactElement children of pre is usually `code` which has `children` as string.
  let codeText = ""
  React.Children.forEach(children, child => {
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<{ children?: React.ReactNode }>
      if (typeof element.props.children === "string") {
        codeText += element.props.children
        return
      }
    } else if (typeof child === 'string') {
      codeText += child
    }
  });

  const [isCopied, setIsCopied] = React.useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click handlers
    navigator.clipboard.writeText(codeText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-white/10 bg-(--bg-surface-elevated)/80">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/20" />
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {isCopied ? <Check className="h-3 w-3 text-(--metadj-emerald)" /> : <Copy className="h-3 w-3" />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-white/90 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {children}
      </pre>
    </div>
  )
}

// Memoize MetaDjAiMessageItem to prevent unnecessary re-renders during chat streaming
export const MetaDjAiMessageItem = memo(forwardRef<HTMLDivElement, MessageItemProps>(function MetaDjAiMessageItem(
  { message, onCopy, onRegenerate, onSwitchVersion, isLastAssistantMessage, isConversationStreaming }: MessageItemProps,
  ref,
) {
  const totalVersions = (message.versions?.length || 0) + 1
  const currentVersionDisplay = (message.currentVersionIndex ?? 0) + 1
  const hasMultipleVersions = totalVersions > 1
  const markdownComponents = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h2 className="mb-4 mt-6 font-heading text-2xl font-bold text-heading-solid first:mt-0">
          {children}
        </h2>
      ),
      h2: ({ children }) => (
        <h3 className="mb-3 mt-5 font-heading text-xl font-bold text-heading-solid first:mt-0 border-b border-white/10 pb-2">
          {children}
        </h3>
      ),
      h3: ({ children }) => (
        <h4 className="mb-2 mt-4 font-heading text-lg font-semibold text-heading-solid first:mt-0">
          {children}
        </h4>
      ),
      h4: ({ children }) => (
        <h5 className="mb-2 mt-3 font-heading text-sm font-semibold uppercase tracking-widest text-heading-solid first:mt-0">
          {children}
        </h5>
      ),
      p: ({ children }) => <p className="mb-3 leading-7 text-white/80 last:mb-0 max-w-[65ch]">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-cyan-200">{children}</strong>,
      em: ({ children }) => <em className="text-white/70 italic font-serif">{children}</em>,
      ul: ({ className, children }) => {
        const isTaskList = className?.includes("contains-task-list")
        return (
          <ul className={clsx(
            "mb-4 space-y-2 text-white/80 last:mb-0 my-3",
            isTaskList ? "list-none pl-0" : "list-none pl-4"
          )}>
            {children}
          </ul>
        )
      },
      ol: ({ children }) => (
        <ol className="mb-4 list-none space-y-2 pl-4 text-white/80 last:mb-0 counter-reset-item my-3">
          {React.Children.map(children, (child, index) => {
            // We need to handle the li rendering for ordered lists here if we want custom numbers
            // But react-markdown passes li children.
            // Best to style ol and let li handle itself, but we want custom counters.
            // We'll use CSS counters or a simple styling on li.
            return child;
          })}
        </ol>
      ),
      li: ({ className, children, ...props }) => {
        const checked = (props as { checked?: boolean }).checked
        const isTaskItem = className?.includes("task-list-item") || checked !== undefined
        // Detect if parent is ol or ul by checking props? Hard in this setup. 
        // We'll use marker classes.

        if (isTaskItem) {
          return (
            <li className="flex items-start gap-3 leading-7 group">
              <div className="mt-1.5 rounded bg-black/40 p-0.5 shrink-0 transition-colors group-hover:bg-cyan-950/50">
                {checked ? (
                  <CheckSquare className="h-3.5 w-3.5 text-cyan-400" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40" />
                )}
              </div>
              <span className={clsx(checked ? "text-white/50 line-through decoration-white/20" : "")}>{children}</span>
            </li>
          )
        }
        // Ordered lists usually use `index` prop in some renderers but not standard html.
        // We will assume unordered for default styling or rely on CSS for ordered.
        // Actually, let's use a nice bullet for everything unless it's inside an OL. 
        // Since we can't easily contextualize, we'll use a generic "smart" bullet.

        return (
          <li className="relative pl-5 leading-7 group">
            <span className="absolute left-0 top-[0.6rem] h-1.5 w-1.5 rounded-full bg-cyan-500/50 ring-1 ring-cyan-400/30 transition-all group-hover:bg-cyan-400 group-hover:ring-cyan-300/50" />
            {children}
          </li>
        )
      },
      blockquote: ({ children }) => (
        <blockquote className="my-4 relative border-l-2 border-cyan-500/30 bg-white/5 px-5 py-3 text-white/75 italic">
          <div className="absolute -left-1.5 top-0 h-full w-[2px] bg-cyan-400/60 opacity-50" />
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-6 border-white/10" />,
      pre: CodeBlock,
      code: ({ className, children }) => {
        const isInline = !className
        if (!isInline) {
          // Block code is handled by pre, but sometimes renderer renders `code` with class inside `pre`.
          // We just want to ensure font stacking.
          return <code className={`${className} font-mono !bg-transparent`}>{children}</code>
        }
        return (
          <code className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200 decoration-clone box-decoration-clone">
            {children}
          </code>
        )
      },
      a: ({ children, href }) => (
        (() => {
          const safeHref = sanitizeMarkdownHref(href)
          if (!safeHref) {
            return <span className="text-white/70">{children}</span>
          }

          return (
            <a
              href={safeHref}
              target={safeHref.startsWith('#') ? undefined : "_blank"}
              rel={safeHref.startsWith('#') ? undefined : "noopener noreferrer"}
              className="font-medium text-cyan-400 decoration-cyan-400/30 decoration-2 underline-offset-4 transition-all hover:text-cyan-300 hover:decoration-cyan-300 hover:underline"
            >
              {children}
            </a>
          )
        })()
      ),
      img: ({ alt, src }) => {
        const safeSrc = sanitizeMarkdownHref(src)
        if (!safeSrc) {
          return <span className="text-white/50">[image]</span>
        }
        return (
          <a
            href={safeSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-cyan-300 transition hover:bg-white/10"
          >
            Image{alt ? `: ${alt}` : ""}
          </a>
        )
      },
      table: ({ children }) => (
        <div className="my-5 overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/70">{children}</thead>,
      tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
      tr: ({ children }) => <tr className="transition-colors hover:bg-white/5 group">{children}</tr>,
      th: ({ children }) => <th className="px-4 py-3 font-semibold text-white">{children}</th>,
      td: ({ children }) => <td className="px-4 py-3 text-white/80 whitespace-pre-wrap group-hover:text-white">{children}</td>,
      del: ({ children }) => <del className="text-white/40 decoration-white/40">{children}</del>,
    }),
    [],
  )

  const isUserMessage = message.role === "user"
  const isMessageStreaming = message.status === "streaming"
  const isEmpty = !message.content.trim()
  // Show placeholder if message is empty AND either:
  // - The message itself is marked as streaming, OR
  // - The conversation is still streaming (handles provider timing differences like Gemini
  //   where status may change to 'complete' before text content fully arrives)
  const shouldShowPlaceholder = isEmpty && (isMessageStreaming || (isConversationStreaming ?? false))
  // For other streaming-dependent logic, use the combined check
  const isStreaming = isMessageStreaming && (isConversationStreaming ?? true)

  // Get the most recent tool being used (for streaming indicator)
  const activeToolName = message.toolsUsed?.[message.toolsUsed.length - 1]
  const activeTool = activeToolName ? TOOL_DISPLAY[activeToolName] : null

  if (message.kind === 'model-switch') {
    return (
      <div ref={ref} id={`metadjai-message-${message.id}`} className="flex justify-center my-1">
        <div className="w-full max-w-2xl px-2">
          <div className="flex items-center gap-3 text-xs font-heading font-medium uppercase tracking-[0.2em] text-muted-accessible">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
            <span>{message.content}</span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
          </div>
        </div>
      </div>
    )
  }

  if (message.kind === 'mode-switch') {
    return null
  }

  if (isUserMessage) {
    return (
      <div ref={ref} id={`metadjai-message-${message.id}`} className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-md bg-gradient-to-br from-white/12 via-white/8 to-purple-500/5 border border-white/8 px-4 py-3 text-sm text-white/95">
          <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} id={`metadjai-message-${message.id}`} className="flex justify-start">
      <div className="w-full rounded-3xl bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-purple-950/20 border border-white/10 px-3.5 py-3 pb-4 space-y-2">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-400/40 shrink-0">
              <Image
                src="/images/avatars/metadj-pfp.png"
                alt=""
                width={24}
                height={24}
                className="object-cover"
              />
            </div>
            <span className="text-heading-solid font-heading text-lg font-semibold">MetaDJai</span>
          </div>
          {!isStreaming && (
            <div className="flex items-center gap-1.5">
              {/* Version toggle - shown when there are multiple versions */}
              {hasMultipleVersions && typeof onSwitchVersion === "function" && (
                <div className="flex items-center gap-0.5 rounded-full border border-white/15 px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => onSwitchVersion(message.id, (message.currentVersionIndex ?? 0) + 1)}
                    disabled={(message.currentVersionIndex ?? 0) >= totalVersions - 1}
                    className="p-0.5 text-muted-accessible transition hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous version"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-[0.6rem] text-white/60 min-w-[2rem] text-center">
                    {currentVersionDisplay}/{totalVersions}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSwitchVersion(message.id, (message.currentVersionIndex ?? 0) - 1)}
                    disabled={(message.currentVersionIndex ?? 0) <= 0}
                    className="p-0.5 text-muted-accessible transition hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Newer version"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
              {/* Regenerate button - only shown on the last assistant message */}
              {isLastAssistantMessage && typeof onRegenerate === "function" && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-[0.65rem] uppercase tracking-[0.15em] text-white/60 transition hover:border-cyan-400/40 hover:text-cyan-300 hover:bg-cyan-500/10"
                  title="Regenerate response"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
              {/* Copy button */}
              {typeof onCopy === "function" && message.content && (
                <button
                  type="button"
                  onClick={() => onCopy?.(message.content)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white/90"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-white leading-relaxed min-h-[1.5em]">
          {shouldShowPlaceholder ? (
            <div className="flex items-center gap-1.5">
              {activeTool ? (
                <>
                  <activeTool.icon className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
                  <span className="inline-block animate-pulse text-white/70">{activeTool.label}...</span>
                </>
              ) : (
                <span
                  className="inline-flex items-center gap-1"
                  role="status"
                  aria-label="MetaDJai is responding"
                >
                  <span className="sr-only">Responding</span>
                  <span className="h-2 w-2 rounded-full gradient-4 animate-[pulse_1s_ease-in-out_infinite]" />
                  <span className="h-2 w-2 rounded-full gradient-4 animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                  <span className="h-2 w-2 rounded-full gradient-4 animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                </span>
              )}
            </div>
          ) : (
            <div className={isStreaming ? "streaming-text" : ""}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkHardBreaks]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Active Control Proposal Card - displayed if this message contains a proposal */}
          {!isStreaming && message.proposal && (
            message.proposal.type === 'playback'
              ? <PlaybackProposalCard proposal={message.proposal} />
              : message.proposal.type === 'ui'
                ? <UiProposalCard proposal={message.proposal} />
                : message.proposal.type === 'queue-set'
                  ? <QueueSetProposalCard proposal={message.proposal} />
                  : message.proposal.type === 'playlist'
                    ? <PlaylistProposalCard proposal={message.proposal} />
                    : null
          )}
        </div>

        {/* Show tools used indicator for completed messages */}
        {!isStreaming && message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1 text-[0.65rem] text-muted-accessible">
            {message.toolsUsed.map((toolName) => {
              const tool = TOOL_DISPLAY[toolName]
              if (!tool) return null
              const ToolIcon = tool.icon
              return (
                <span key={toolName} className="flex items-center gap-1" title={tool.label}>
                  <ToolIcon className="h-3 w-3" />
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}))
