"use client"

import { type FC, useEffect, useState, useRef, useCallback } from "react"
import clsx from "clsx"
import { Book, Plus, Save, Trash2, X, Mic, Square, Loader2, AlertTriangle, Bold, Italic, Underline, List, Quote, Link, Code, ListOrdered, Eye, EyeOff, Heading1, Heading2, Heading3, SeparatorHorizontal } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import TurndownService from "turndown"
import { useToast } from "@/contexts/ToastContext"
import { logger } from "@/lib/logger"
import { STORAGE_KEYS, getString, setString, removeValue } from "@/lib/storage"

interface JournalEntry {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
}

type JournalViewState = "list" | "editing"

const JOURNAL_VIEW_LIST: JournalViewState = "list"
const JOURNAL_VIEW_EDITING: JournalViewState = "editing"
const JOURNAL_DRAFT_NEW_ID = "new"

export const Journal: FC = () => {
    const { showToast } = useToast()
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [isEditing, setIsEditing] = useState(false)
    const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null)

    // Form state
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")

    // Delete Confirmation State
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null)

    // Speech to Text State
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])
    const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const hasRestoredRef = useRef(false)

    // Max recording duration (60 seconds)
    const MAX_RECORDING_DURATION_MS = 60_000

    const extractTranscriptionText = (payload: unknown) => {
        if (typeof payload === "string") {
            const trimmed = payload.trim()
            return trimmed ? trimmed : ""
        }
        if (!payload || typeof payload !== "object") return ""

        const record = payload as Record<string, unknown>
        const nested = record.data as Record<string, unknown> | undefined
        const candidates = [
            record.text,
            record.transcript,
            record.output_text,
            nested?.text,
            nested?.transcript,
            nested?.output_text,
        ]

        for (const candidate of candidates) {
            if (typeof candidate === "string" && candidate.trim()) {
                return candidate.trim()
            }
        }

        return ""
    }

    // Load entries on mount
    useEffect(() => {
        let parsedEntries: JournalEntry[] = []
        try {
            const saved = getString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, "[]")
            parsedEntries = JSON.parse(saved)
            setEntries(parsedEntries)
        } catch (error) {
            console.error("Failed to load journal entries", error)
            setEntries([])
        }

        const lastView = getString(STORAGE_KEYS.WISDOM_JOURNAL_LAST_VIEW, JOURNAL_VIEW_LIST)
        const lastEntryId = getString(STORAGE_KEYS.WISDOM_JOURNAL_LAST_ENTRY_ID, "")
        const draftEntryId = getString(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_ENTRY_ID, "")
        const draftTitle = getString(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_TITLE, "")
        const draftContent = getString(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_CONTENT, "")

        if (lastView === JOURNAL_VIEW_EDITING) {
            if (lastEntryId) {
                const entry = parsedEntries.find((item) => item.id === lastEntryId)
                if (entry) {
                    const useDraft = draftEntryId === entry.id
                    setCurrentEntry(entry)
                    setTitle(useDraft ? draftTitle : entry.title)
                    setContent(useDraft ? draftContent : entry.content)
                    setIsEditing(true)
                    hasRestoredRef.current = true
                    return
                }
            }

            if (draftEntryId === JOURNAL_DRAFT_NEW_ID || draftTitle || draftContent) {
                setCurrentEntry(null)
                setTitle(draftTitle)
                setContent(draftContent)
                setIsEditing(true)
                hasRestoredRef.current = true
                return
            }
        }

        hasRestoredRef.current = true
    }, [])

    // Save entries whenever they change
    useEffect(() => {
        if (entries.length > 0) {
            setString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, JSON.stringify(entries))
        }
    }, [entries])

    useEffect(() => {
        if (!hasRestoredRef.current) return

        if (isEditing) {
            setString(STORAGE_KEYS.WISDOM_JOURNAL_LAST_VIEW, JOURNAL_VIEW_EDITING)
            setString(STORAGE_KEYS.WISDOM_JOURNAL_LAST_ENTRY_ID, currentEntry?.id ?? "")
            return
        }

        setString(STORAGE_KEYS.WISDOM_JOURNAL_LAST_VIEW, JOURNAL_VIEW_LIST)
        removeValue(STORAGE_KEYS.WISDOM_JOURNAL_LAST_ENTRY_ID)
    }, [currentEntry?.id, isEditing])

    useEffect(() => {
        if (!hasRestoredRef.current || !isEditing) return

        setString(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_TITLE, title)
        setString(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_CONTENT, content)
        setString(
            STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_ENTRY_ID,
            currentEntry?.id ?? JOURNAL_DRAFT_NEW_ID
        )
    }, [content, currentEntry?.id, isEditing, title])

    // Cleanup recording resources particularly on unmount
    useEffect(() => {
        return () => {
            if (maxDurationTimeoutRef.current) {
                clearTimeout(maxDurationTimeoutRef.current)
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop()
            }
        }
    }, [])

    const handleCreateNew = () => {
        setCurrentEntry(null)
        setTitle("")
        setContent("")
        setIsEditing(true)
        setIsRecording(false)
        setIsTranscribing(false)
    }

    const handleEdit = (entry: JournalEntry) => {
        setCurrentEntry(entry)
        setTitle(entry.title)
        setContent(entry.content)
        setIsEditing(true)
        setIsRecording(false)
        setIsTranscribing(false)
    }

    const clearDraftState = () => {
        removeValue(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_TITLE)
        removeValue(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_CONTENT)
        removeValue(STORAGE_KEYS.WISDOM_JOURNAL_DRAFT_ENTRY_ID)
        removeValue(STORAGE_KEYS.WISDOM_JOURNAL_LAST_ENTRY_ID)
        setString(STORAGE_KEYS.WISDOM_JOURNAL_LAST_VIEW, JOURNAL_VIEW_LIST)
    }

    const handleSave = () => {
        if (!title.trim() && !content.trim()) {
            showToast({ message: "Entry cannot be empty", variant: "error" })
            return
        }

        const now = new Date().toISOString()

        if (currentEntry) {
            // Update existing
            const updatedEntries = entries.map(e =>
                e.id === currentEntry.id
                    ? { ...e, title, content, updatedAt: now }
                    : e
            )
            setEntries(updatedEntries)
            showToast({ message: "Journal entry updated", variant: "success" })
        } else {
            // Create new
            const newEntry: JournalEntry = {
                id: crypto.randomUUID(),
                title: title.trim() || "Untitled",
                content,
                createdAt: now,
                updatedAt: now,
            }
            setEntries([newEntry, ...entries])
            showToast({ message: "Journal entry created", variant: "success" })
        }

        setIsEditing(false)
        setCurrentEntry(null)
        clearDraftState()
    }

    const requestDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setEntryToDelete(id)
    }

    const confirmDelete = () => {
        if (!entryToDelete) return

        const newEntries = entries.filter(e => e.id !== entryToDelete)
        setEntries(newEntries)

        // If list becomes empty, explicitly clear/reset storage
        if (newEntries.length === 0) {
            setString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, "[]")
        }

        showToast({ message: "Journal entry deleted", variant: "success" })

        if (isEditing && currentEntry?.id === entryToDelete) {
            setIsEditing(false)
            setCurrentEntry(null)
            clearDraftState()
        }
        setEntryToDelete(null)
    }

    const cancelDelete = () => {
        setEntryToDelete(null)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    // Speech to Text Functions
    const startRecording = useCallback(async () => {
        try {
            if (typeof MediaRecorder === 'undefined') {
                showToast({ message: "Voice input isn't supported in this browser", variant: "error" })
                return
            }
            if (!navigator?.mediaDevices?.getUserMedia) {
                showToast({ message: "Microphone access isn't available here", variant: "error" })
                return
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Determine best supported mime type
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/mpeg',
                'audio/ogg;codecs=opus'
            ]
            const options = mimeTypes.find(type => MediaRecorder.isTypeSupported(type))

            const recorder = new MediaRecorder(stream, options ? { mimeType: options } : undefined)
            mediaRecorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            recorder.onstop = async () => {
                const tracks = stream.getTracks()
                tracks.forEach(track => track.stop())

                if (chunksRef.current.length === 0) {
                    setIsRecording(false)
                    return
                }

                // Create blob with actual mime type of the recorder
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
                setIsTranscribing(true)
                setIsRecording(false)

                try {
                    const formData = new FormData()
                    formData.append('file', blob)

                    const response = await fetch('/api/metadjai/transcribe', {
                        method: 'POST',
                        body: formData,
                    })

                    const data = await response.json().catch(() => null)
                    if (!response.ok) {
                        const message = typeof data?.error === "string" ? data.error : "Failed to transcribe audio"
                        showToast({ message, variant: "error" })
                        return
                    }

                    const transcript = extractTranscriptionText(data)
                    if (!transcript) {
                        logger.error('[Journal] Empty transcription response', {
                            responseKeys: data && typeof data === "object" ? Object.keys(data) : typeof data,
                        })
                        showToast({ message: "No speech detected. Try again.", variant: "error" })
                        return
                    }

                    appendTranscription(transcript)
                    showToast({ message: "Text transcribed successfully", variant: "success" })
                } catch (error) {
                    logger.error('[Journal] Transcription error', { error: String(error) })
                    showToast({ message: "Failed to transcribe audio", variant: "error" })
                } finally {
                    setIsTranscribing(false)
                }
            }

            recorder.start()
            setIsRecording(true)

            // Auto-stop after max duration
            maxDurationTimeoutRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop()
                    showToast({ message: "Recording stopped (60s limit)" })
                }
            }, MAX_RECORDING_DURATION_MS)
        } catch (error) {
            logger.error('[Journal] Microphone access error', { error: String(error) })
            showToast({ message: "Could not access microphone", variant: "error" })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- appendTranscription defined later; onstop callback executes after full render
    }, [showToast])

    const stopRecording = useCallback(() => {
        if (maxDurationTimeoutRef.current) {
            clearTimeout(maxDurationTimeoutRef.current)
            maxDurationTimeoutRef.current = null
        }
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
        }
    }, [isRecording])

    const editorRef = useRef<HTMLDivElement>(null)
    const [turndownService] = useState(() => {
        const ts = new TurndownService({
            headingStyle: "atx",
            hr: "---",
            bulletListMarker: "-",
            codeBlockStyle: "fenced"
        })
        return ts
    })

    // Initial load of content into contenteditable
    useEffect(() => {
        if (isEditing && editorRef.current) {
            // Very simple markdown to minimal HTML for initial load
            let html = content
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                .replace(/_(.*)_/gim, '<i>$1</i>')
                .replace(/\n/g, '<br>')

            if (!html && !content) {
                html = "<div><br></div>"
            }
            editorRef.current.innerHTML = html
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- content should only load on initial edit, not on every keystroke
    }, [isEditing])

    const handleEditorChange = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML
            const markdown = turndownService.turndown(html)
            setContent(markdown)
        }
    }

    const appendTranscription = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return

        if (editorRef.current) {
            const editor = editorRef.current
            if (!editor.textContent?.trim()) {
                editor.innerHTML = ""
            }
            const spacer = editor.textContent?.trim() ? " " : ""
            editor.appendChild(document.createTextNode(`${spacer}${trimmed}`))
            editor.scrollTop = editor.scrollHeight
            editor.focus()
            handleEditorChange()
            return
        }

        setContent(prev => {
            const spacer = prev.trim() ? " " : ""
            return `${prev}${spacer}${trimmed}`
        })
    }

    const execCommand = (command: string, value: string = "") => {
        document.execCommand(command, false, value)
        handleEditorChange()
        editorRef.current?.focus()
    }

    const insertDivider = () => {
        const hr = '<hr class="my-4 border-white/10">'
        document.execCommand('insertHTML', false, hr)
        handleEditorChange()
    }

    if (isEditing) {
        return (
            <div className="relative w-full h-full flex flex-col overflow-hidden max-w-7xl mx-auto pt-8 sm:pt-10 pb-6">
                <div className="flex-1 flex flex-col rounded-3xl border border-(--border-standard) bg-black/45 backdrop-blur-xl relative overflow-hidden">
                    {/* Formatting Toolbar - Shifted Save button align with curve */}
                    <div className="px-4 sm:px-6 lg:px-8 py-2.5 border-b border-white/10 bg-white/5 shrink-0 min-h-[56px]">
                        <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pr-2">
                                <div className="flex items-center gap-1 pr-2 border-r border-white/10 mr-1">
                                    <button
                                        onClick={() => execCommand("formatBlock", "H1")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Heading 1"
                                    >
                                        <Heading1 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("formatBlock", "H2")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Heading 2"
                                    >
                                        <Heading2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("formatBlock", "H3")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Heading 3"
                                    >
                                        <Heading3 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => execCommand("bold")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Bold"
                                    >
                                        <Bold className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("italic")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Italic"
                                    >
                                        <Italic className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("underline")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Underline"
                                    >
                                        <Underline className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="w-px h-5 bg-white/10 mx-1.5" />
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => execCommand("insertUnorderedList")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Bullet List"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("insertOrderedList")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Numbered List"
                                    >
                                        <ListOrdered className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("formatBlock", "BLOCKQUOTE")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Quote / Indent"
                                    >
                                        <Quote className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="w-px h-5 bg-white/10 mx-1.5" />
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => {
                                            const url = prompt("Enter URL:")
                                            if (url) execCommand("createLink", url)
                                        }}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Add Link"
                                    >
                                        <Link className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => execCommand("formatBlock", "PRE")}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Code Block"
                                    >
                                        <Code className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={insertDivider}
                                        className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        title="Line Divider"
                                    >
                                        <SeparatorHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto shrink-0">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-1.5 px-6 py-2 rounded-full bg-linear-to-r from-purple-500 via-blue-500 to-cyan-500 hover:scale-105 active:scale-95 text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] font-heading font-bold uppercase tracking-widest text-[11px] group border border-white/20"
                                    title="Save & Close"
                                >
                                    <Save className="h-4 w-4 group-hover:animate-pulse" />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 pt-6 pb-8 min-h-0">
                        <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 min-h-0">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="TITLE"
                                className="w-full bg-transparent text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-white placeholder:text-white/10 focus-ring tracking-tight"
                            />
                            <div
                                className="flex-1 min-h-[60vh] rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.35)] overflow-hidden"
                            >
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    onInput={handleEditorChange}
                                    role="textbox"
                                    aria-multiline="true"
                                    className="h-full min-h-full w-full overflow-y-auto px-5 sm:px-8 py-6 text-lg sm:text-xl text-white/85 focus-ring leading-relaxed pb-12 custom-scrollbar prose prose-invert prose-purple max-w-none prose-headings:font-heading prose-headings:tracking-tight prose-p:text-lg sm:prose-p:text-xl prose-p:leading-relaxed"
                                    data-placeholder="Write your thoughts..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center pt-4">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isTranscribing}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2 rounded-full shadow-lg transition-all duration-300 backdrop-blur-md border border-white/15 text-[11px] font-heading font-bold uppercase tracking-widest",
                            isRecording
                                ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.45)]"
                                : isTranscribing
                                    ? "bg-purple-500/50 text-white/80"
                                    : "bg-black/60 text-white/70 hover:text-white hover:bg-black/80 hover:border-cyan-500/30 group"
                        )}
                        title={isRecording ? "Stop recording" : "Tap to speak"}
                    >
                        {isTranscribing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-purple-200" />
                                Transcribing...
                            </>
                        ) : isRecording ? (
                            <>
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                </span>
                                Recording
                            </>
                        ) : (
                            <>
                                <Mic className="h-4 w-4 text-purple-300 group-hover:text-cyan-300 transition-colors" />
                                Tap to Speak
                            </>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <section className="relative space-y-4 max-w-6xl mx-auto px-4 sm:px-6 lg:px-6 pt-4 min-[1100px]:pt-6 pb-24 min-[1100px]:pb-6">
            <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                <div>
                    <h2 className="text-xl min-[1100px]:text-3xl font-heading font-bold text-gradient-hero text-pop">
                        Journal
                    </h2>
                    <p className="text-white/60 text-xs min-[1100px]:text-sm">
                        Your personal space
                    </p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="group flex items-center gap-1.5 px-3 py-1.5 min-[1100px]:px-5 min-[1100px]:py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-purple-400/30 hover:border-cyan-400/50 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                >
                    <Plus className="h-4 w-4 min-[1100px]:h-5 min-[1100px]:w-5 shrink-0 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
                    <span className="text-gradient-hero font-semibold text-sm min-[1100px]:text-base">New</span>
                </button>
            </header>

            {entries.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border border-white/5 bg-white/3">
                    <Book className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <h3 className="text-xl font-heading font-semibold text-white/60 mb-2">Empty Journal</h3>
                    <p className="text-white/40 max-w-sm mx-auto mb-6">
                        This is your space to write. No entries yet.
                    </p>
                    <button
                        onClick={handleCreateNew}
                        className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-purple-400/30 hover:border-cyan-400/50 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    >
                        <Plus className="h-5 w-5 shrink-0 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
                        <span className="text-gradient-hero font-semibold">Start Writing</span>
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 min-[1100px]:grid-cols-3">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            onClick={() => handleEdit(entry)}
                            className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer h-64"
                        >
                            <div>
                                <h3 className="text-lg font-heading font-semibold text-white mb-2 line-clamp-1">
                                    {entry.title}
                                </h3>
                                <p className="text-sm text-white/60 line-clamp-6 leading-relaxed">
                                    {entry.content || <span className="italic text-white/30">No content...</span>}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-xs text-white/40">
                                <span>{formatDate(entry.updatedAt)}</span>
                                <button
                                    onClick={(e) => requestDelete(entry.id, e)}
                                    className="p-2 -mr-2 rounded-full hover:bg-white/10 hover:text-red-400 transition-colors z-10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {entryToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-(--bg-surface-elevated) border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <div className="p-2 rounded-full bg-red-400/10">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-heading font-bold text-white">Delete Entry?</h3>
                        </div>

                        <p className="text-white/70">
                            Are you sure you want to delete this journal entry? This action cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
