"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Share2, Link2, X as XIcon } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { useClickAway, useEscapeKey } from "@/hooks"
import { trackEvent } from "@/lib/analytics"
import type { Track, Collection } from "@/types"
import type { Playlist } from "@/types/playlist"

export interface ShareButtonProps {
  track?: Track
  collection?: Collection
  playlist?: Playlist
  size?: "sm" | "md" | "lg" | "xs" | "xxs"
  variant?: "icon" | "button"
  className?: string
}

interface MenuPosition {
  top: number
  left: number
  right?: number
}

export function ShareButton({
  track,
  collection,
  playlist,
  size = "md",
  variant = "icon",
  className = ""
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { showToast } = useToast()

  const trackPlaylistShare = useCallback(
    (method: 'link_copy' | 'share_button') => {
      if (!playlist) return
      trackEvent('playlist_shared', {
        playlistId: playlist.id,
        trackCount: playlist.trackIds.length,
        method,
      })
    },
    [playlist],
  )

  // Calculate menu position based on button location (clamped to viewport)
  const updateMenuPosition = useCallback(() => {
    if (typeof window === "undefined" || !buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const spacing = 8
    const viewportPadding = 12
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const menuWidth = menuRef.current?.offsetWidth ?? 192
    const menuHeight = menuRef.current?.offsetHeight ?? 120

    let top = rect.top - menuHeight - spacing

    if (top < viewportPadding) {
      top = rect.bottom + spacing
      if (top + menuHeight + viewportPadding > viewportHeight) {
        top = Math.max(viewportPadding, viewportHeight - menuHeight - viewportPadding)
      }
    }

    const desiredLeft = rect.left + rect.width / 2 - menuWidth / 2
    const left = Math.max(
      viewportPadding,
      Math.min(desiredLeft, viewportWidth - menuWidth - viewportPadding),
    )

    setMenuPosition({ top, left })
  }, [])

  // Update position when menu opens or window resizes
  // Use useLayoutEffect for immediate positioning before paint
  useEffect(() => {
    if (showMenu) {
      // Use requestAnimationFrame to ensure menu DOM is mounted before calculating position
      const rafId = requestAnimationFrame(() => {
        updateMenuPosition()
      })

      const handleResize = () => {
        updateMenuPosition()
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleResize, true)
      return () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleResize, true)
      }
    } else {
      setMenuPosition(null)
    }
    return undefined
  }, [showMenu, updateMenuPosition])

  useClickAway([menuRef, buttonRef], () => setShowMenu(false), { enabled: showMenu })
  useEscapeKey(
    () => {
      setShowMenu(false)
      buttonRef.current?.focus()
    },
    { enabled: showMenu }
  )

  // Focus first menu item when menu opens
  useEffect(() => {
    if (!showMenu) return undefined
    const rafId = requestAnimationFrame(() => {
      const firstButton = menuRef.current?.querySelector("button")
      firstButton?.focus()
    })
    return () => cancelAnimationFrame(rafId)
  }, [showMenu])


  const generateShareData = useCallback(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://metadj.ai'

    if (track) {
      const title = `${track.title} — MetaDJ Original`
      const text = `Check out "${track.title}" — one of my originals on MetaDJ Nexus`
      const url = baseUrl

      // Curated message for social media
      const socialText = `🎵 Listening to "${track.title}" by @metadjai\n\nOriginal track created through AI-driven creation. ${track.genres?.[0] ? `#${track.genres[0].replace(/\s+/g, '')}` : '#Music'} #MetaDJ\n\n🎧 Experience it on MetaDJ Nexus`

      return { title, text, url, socialText }
    }

    if (collection) {
      const title = `${collection.title} — MetaDJ`
      const text = `Check out my ${collection.title} collection on MetaDJ Nexus`
      const url = baseUrl
      const socialText = `🎧 Exploring the ${collection.title} collection by @metadjai\n\nHuman vision, AI-driven execution. #MetaDJ #AIMusic\n\n🎧 Experience it on MetaDJ Nexus`

      return { title, text, url, socialText }
    }

    if (playlist) {
      const title = `${playlist.name} — MetaDJ Playlist`
      const text = `Check out my playlist "${playlist.name}" on MetaDJ Nexus`
      const url = baseUrl
      const socialText = `🎧 Explore my playlist "${playlist.name}" on MetaDJ Nexus\n\nHuman vision, AI-driven execution. #MetaDJ #AIMusic\n\n🎧 Listen now`

      return { title, text, url, socialText }
    }

    return {
      title: "MetaDJ Nexus",
      text: "Experience my AI-driven music on MetaDJ Nexus",
      url: baseUrl,
      socialText: "🎶 Listen to @metadjai on MetaDJ Nexus — where human vision meets AI-driven creation\n\nSounds you won't find anywhere else. #MetaDJ #AIMusic\n\n🎧 Experience it on MetaDJ Nexus"
    }
  }, [track, collection, playlist])

  const handleCopyLink = async () => {
    const shareData = generateShareData()

    // Track share initiated
    trackEvent('share_initiated', {
      platform: 'clipboard',
      content_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'platform',
      ...(track && { track_id: track.id, track_title: track.title }),
      ...(collection && { collection_id: collection.id, collection_title: collection.title }),
      ...(playlist && { playlist_id: playlist.id, playlist_title: playlist.name }),
    })

    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url)
        setShowMenu(false)

        showToast({
          message: "Link copied to clipboard",
          variant: "success",
          duration: 2000
        })

        trackPlaylistShare('link_copy')
        trackEvent('share_success', {
          share_method: 'clipboard',
          item_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'default',
          ...(track && { track_id: track.id }),
          ...(collection && { collection_id: collection.id }),
          ...(playlist && { playlist_id: playlist.id }),
        })
        return
      } catch (error) {
        // Clipboard API failed, will fall through to fallback method
      }
    }

    // Fallback: Create temporary input and select text
    try {
      const textArea = document.createElement('textarea')
      textArea.value = shareData.url
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (successful) {
        setShowMenu(false)

        showToast({
          message: "Link copied to clipboard",
          variant: "success",
          duration: 2000
        })

        trackPlaylistShare('link_copy')
        trackEvent('share_success', {
          share_method: 'clipboard-fallback',
          item_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'default',
          ...(track && { track_id: track.id }),
          ...(collection && { collection_id: collection.id }),
          ...(playlist && { playlist_id: playlist.id }),
        })
      } else {
        throw new Error('execCommand failed')
      }
    } catch (error) {
      showToast({
        message: "Unable to copy link. Try using the share menu instead.",
        variant: "error",
        duration: 4000
      })

      trackEvent('share_error', {
        share_method: 'clipboard',
        error_type: (error as Error).name || 'clipboard_failed',
        ...(track && { track_id: track.id }),
        ...(collection && { collection_id: collection.id }),
        ...(playlist && { playlist_id: playlist.id }),
      })
    }
  }

  const handleShareToX = () => {
    const shareData = generateShareData()

    // Track share initiated
    trackEvent('share_initiated', {
      platform: 'x',
      content_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'platform',
      ...(track && { track_id: track.id, track_title: track.title }),
      ...(collection && { collection_id: collection.id, collection_title: collection.title }),
      ...(playlist && { playlist_id: playlist.id, playlist_title: playlist.name }),
    })

    // Construct X (Twitter) share URL
    const tweetText = `${shareData.socialText}\n\n${shareData.url}`
    const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

    // Open in new window/tab. On mobile or when popups are blocked,
    // fall back to a full navigation so the intent always fires.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const features = isMobile
      ? 'noopener,noreferrer'
      : 'noopener,noreferrer,width=550,height=420'
    const popup = window.open(xShareUrl, '_blank', features)
    if (!popup) {
      window.location.href = xShareUrl
    }
    setShowMenu(false)

    trackPlaylistShare('share_button')
    trackEvent('share_success', {
      share_method: 'x-twitter',
      item_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'default',
      ...(track && { track_id: track.id }),
      ...(collection && { collection_id: collection.id }),
      ...(playlist && { playlist_id: playlist.id }),
    })
  }

  const tryNativeShare = useCallback(async () => {
    // Only use native share on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (!isMobile || typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false
    }

    const shareData = generateShareData()

    try {
      await navigator.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url,
      })
      trackPlaylistShare('share_button')
      trackEvent('share_success', {
        share_method: 'web-share',
        item_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'default',
        ...(track && { track_id: track.id }),
        ...(collection && { collection_id: collection.id }),
        ...(playlist && { playlist_id: playlist.id }),
      })
      return true
    } catch (error) {
      // If user cancelled the native sheet, do nothing further.
      // Returning true prevents the fallback menu from popping open.
      if (error instanceof DOMException && error.name === "AbortError") {
        return true
      }
      // Native share failed - non-critical, allow fallback to menu
      return false
    }
	  }, [generateShareData, track, collection, playlist, trackPlaylistShare])

  const handleButtonClick = async (event: React.MouseEvent) => {
    event.stopPropagation()
    
    trackEvent('share_button_clicked', {
      item_type: track ? 'track' : collection ? 'collection' : playlist ? 'playlist' : 'default',
      ...(track && { track_id: track.id, track_title: track.title }),
      ...(collection && { collection_id: collection.id, collection_title: collection.title }),
      ...(playlist && { playlist_id: playlist.id, playlist_title: playlist.name }),
    })

    if (await tryNativeShare()) {
      return
    }
    
    setShowMenu((prev) => !prev)
  }

  const sizeClasses = {
    xxs: variant === "icon" ? "h-7 w-7" : "h-7 px-2 text-[11px]",
    xs: variant === "icon" ? "h-8 w-8" : "h-8 px-3 text-xs",
    sm: variant === "icon" ? "h-9 w-9 xs:h-10 xs:w-10" : "h-8 px-3 text-xs",
    md: variant === "icon" ? "h-10 w-10 sm:h-11 sm:w-11" : "h-9 xs:h-10 px-3 xs:px-4 text-xs xs:text-sm",
    lg: variant === "icon" ? "h-10 w-10 sm:h-11 sm:w-11" : "h-10 sm:h-11 px-4 sm:px-5 text-sm sm:text-base"
  }

  const iconSizes = {
    xxs: "h-3 w-3",
    xs: "h-3.5 w-3.5",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4 sm:h-5 sm:w-5"
  }

  // Portal menu component that renders at document.body level
  const ShareMenuPortal = () => {
    if (!showMenu || typeof document === 'undefined') return null

    // Render menu with initial position off-screen if menuPosition not yet calculated
    // This allows the menu to mount so we can measure it and calculate proper position
    const style = menuPosition 
      ? {
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }
      : {
          top: '-9999px',
          left: '-9999px',
          visibility: 'hidden' as const,
        }

    // Keyboard navigation handler for menu items
    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const buttons = menuRef.current?.querySelectorAll('button')
      if (!buttons) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const nextIndex = (index + 1) % buttons.length
        ;(buttons[nextIndex] as HTMLButtonElement).focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const prevIndex = (index - 1 + buttons.length) % buttons.length
        ;(buttons[prevIndex] as HTMLButtonElement).focus()
      } else if (event.key === 'Home') {
        event.preventDefault()
        ;(buttons[0] as HTMLButtonElement).focus()
      } else if (event.key === 'End') {
        event.preventDefault()
        ;(buttons[buttons.length - 1] as HTMLButtonElement).focus()
      }
    }

    return createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label="Share options"
        className="fixed w-52 rounded-xl border border-white/20 bg-(--bg-surface-base)/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(18,15,45,0.65)] z-300 pointer-events-auto"
        style={style}
      >
        <div className="p-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
          handleCopyLink()
            }}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
            onKeyDown={(e) => handleMenuKeyDown(e, 0)}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition duration-75 focus-ring"
            aria-label={`Copy link to ${track ? `"${track.title}"` : collection ? collection.title : playlist ? playlist.name : 'MetaDJ Nexus'}`}
          >
            <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Copy Link</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleShareToX()
            }}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
            onKeyDown={(e) => handleMenuKeyDown(e, 1)}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition duration-75 focus-ring"
            aria-label={`Share ${track ? `"${track.title}"` : collection ? collection.title : playlist ? playlist.name : 'MetaDJ Nexus'} to X`}
          >
            <XIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Share to X</span>
          </button>
        </div>
      </div>,
      document.body
    )
  }

  if (variant === "button") {
    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleButtonClick}
          className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-white/20 text-white/80 transition hover:bg-white/10 hover:border-white/30 hover:text-white focus-ring-glow touch-manipulation ${sizeClasses[size]} ${className}`}
          aria-label={track ? `Share ${track.title}` : collection ? `Share ${collection.title}` : playlist ? `Share ${playlist.name}` : "Share MetaDJ Nexus"}
          aria-expanded={showMenu}
          aria-haspopup="menu"
        >
          <Share2 className={iconSizes[size]} aria-hidden="true" />
          <span className="hidden xs:inline">Share</span>
        </button>
        <ShareMenuPortal />
      </>
    )
  }

  // Icon variant (default) - no static border, just hover effect like other icons
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className={`inline-flex items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white focus-ring-glow touch-manipulation ${sizeClasses[size]} ${className}`}
        aria-label={track ? `Share ${track.title}` : collection ? `Share ${collection.title}` : playlist ? `Share ${playlist.name}` : "Share MetaDJ Nexus"}
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        <Share2 className={iconSizes[size]} aria-hidden="true" />
      </button>
      <ShareMenuPortal />
    </>
  )
}
