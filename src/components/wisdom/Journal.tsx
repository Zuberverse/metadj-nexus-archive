"use client"

import { type FC, type ClipboardEvent, type ChangeEvent, useEffect, useState, useRef, useCallback, useMemo } from "react"
import clsx from "clsx"
import { Book, Plus, ArrowLeft, Trash2, Mic, Loader2, AlertTriangle, Bold, Italic, Underline, List, Quote, Link, Code, ListOrdered, Heading1, Heading2, Heading3, SeparatorHorizontal, Download, Upload, Search, X } from "lucide-react"
import { marked } from "marked"
import TurndownService from "turndown"
import { useToast } from "@/contexts/ToastContext"
import { trackJournalEntryCreated, trackJournalEntryDeleted, trackJournalEntryUpdated } from "@/lib/analytics"
import { createJournalExport, mergeJournalEntries, parseJournalImport, type JournalEntry } from "@/lib/journal"
import { logger } from "@/lib/logger"
import { STORAGE_KEYS, getString, setString, removeValue } from "@/lib/storage"

type JournalViewState = "list" | "editing"

const JOURNAL_VIEW_LIST: JournalViewState = "list"
const JOURNAL_VIEW_EDITING: JournalViewState = "editing"
const JOURNAL_DRAFT_NEW_ID = "new"

const getWordCount = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).filter(Boolean).length
}

marked.setOptions({
    gfm: true,
    breaks: true,
})

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

    // Search State
    const [searchQuery, setSearchQuery] = useState("")

    // Filtered entries based on search
    const filteredEntries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return entries
        return entries.filter(
            (entry) =>
                entry.title.toLowerCase().includes(query) ||
                entry.content.toLowerCase().includes(query)
        )
    }, [entries, searchQuery])

    // Export / Import State
    const [isExportOpen, setIsExportOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [exportEncrypted, setExportEncrypted] = useState(false)
    const [exportPassphrase, setExportPassphrase] = useState("")
    const [importPassphrase, setImportPassphrase] = useState("")
    const [importFile, setImportFile] = useState<File | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const importInputRef = useRef<HTMLInputElement | null>(null)

    // Speech to Text State
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])
    const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasRestoredRef = useRef(false)

    // Database persistence state
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const AUTOSAVE_DELAY_MS = 1500

    // Max recording duration (60 seconds)
    const MAX_RECORDING_DURATION_MS = 60_000
    const MIN_PASSPHRASE_LENGTH = 8

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

    // Load entries on mount - fetch from API first, fallback to localStorage
    useEffect(() => {
        const loadEntries = async () => {
            setIsLoading(true)
            let parsedEntries: JournalEntry[] = []
            
            try {
                const response = await fetch('/api/journal')
                const data = await response.json()
                
                if (response.ok && data.success && Array.isArray(data.entries)) {
                    parsedEntries = data.entries.map((entry: { id: string; userId?: string; title: string; content: string; createdAt: string | Date; updatedAt: string | Date }) => ({
                        id: entry.id,
                        title: entry.title,
                        content: entry.content,
                        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date(entry.createdAt).toISOString(),
                        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(entry.updatedAt).toISOString(),
                    }))
                    setEntries(parsedEntries)
                    setString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, JSON.stringify(parsedEntries))
                } else {
                    const saved = getString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, "[]")
                    parsedEntries = JSON.parse(saved)
                    setEntries(parsedEntries)
                }
            } catch (error) {
                logger.error("Failed to load journal entries from API, falling back to localStorage", { error })
                try {
                    const saved = getString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, "[]")
                    parsedEntries = JSON.parse(saved)
                    setEntries(parsedEntries)
                } catch (localError) {
                    logger.error("Failed to load journal entries from localStorage", { error: localError })
                    setEntries([])
                }
            } finally {
                setIsLoading(false)
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
        }
        
        loadEntries()
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

    // Save entry to API
    const saveEntryToApi = useCallback(async (entryId: string | null, entryTitle: string, entryContent: string) => {
        const trimmedTitle = entryTitle.trim()
        const trimmedContent = entryContent.trim()
        
        if (!trimmedTitle && !trimmedContent) {
            if (entryId) {
                try {
                    await fetch(`/api/journal?id=${entryId}`, { method: 'DELETE' })
                    setEntries(prev => prev.filter(e => e.id !== entryId))
                    setString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, JSON.stringify(entries.filter(e => e.id !== entryId)))
                    showToast({ message: "Empty entry deleted", variant: "info" })
                    setIsEditing(false)
                    setCurrentEntry(null)
                    clearDraftState()
                } catch (error) {
                    logger.error('[Journal] Failed to delete empty entry', { error })
                }
            }
            return
        }
        
        setIsSaving(true)
        const now = new Date().toISOString()
        
        try {
            const payload = {
                id: entryId || crypto.randomUUID(),
                title: trimmedTitle || "Untitled",
                content: entryContent,
            }
            
            const response = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            
            const data = await response.json()
            
            if (response.ok && data.success && data.entry) {
                const savedEntry: JournalEntry = {
                    id: data.entry.id,
                    title: data.entry.title,
                    content: data.entry.content,
                    createdAt: typeof data.entry.createdAt === 'string' ? data.entry.createdAt : new Date(data.entry.createdAt).toISOString(),
                    updatedAt: typeof data.entry.updatedAt === 'string' ? data.entry.updatedAt : new Date(data.entry.updatedAt).toISOString(),
                }
                
                setEntries(prev => {
                    const exists = prev.some(e => e.id === savedEntry.id)
                    if (exists) {
                        return prev.map(e => e.id === savedEntry.id ? savedEntry : e)
                    }
                    return [savedEntry, ...prev]
                })
                
                if (!currentEntry) {
                    setCurrentEntry(savedEntry)
                }
            }
        } catch (error) {
            logger.error('[Journal] Failed to save entry to API', { error })
            const localEntry: JournalEntry = {
                id: entryId || crypto.randomUUID(),
                title: trimmedTitle || "Untitled",
                content: entryContent,
                createdAt: currentEntry?.createdAt || now,
                updatedAt: now,
            }
            setEntries(prev => {
                const exists = prev.some(e => e.id === localEntry.id)
                if (exists) {
                    return prev.map(e => e.id === localEntry.id ? localEntry : e)
                }
                return [localEntry, ...prev]
            })
            if (!currentEntry) {
                setCurrentEntry(localEntry)
            }
        } finally {
            setIsSaving(false)
        }
    }, [currentEntry, entries, showToast])

    // Auto-save effect with debouncing
    useEffect(() => {
        if (!isEditing || !hasRestoredRef.current) return
        
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
        }
        
        autoSaveTimeoutRef.current = setTimeout(() => {
            saveEntryToApi(currentEntry?.id || null, title, content)
        }, AUTOSAVE_DELAY_MS)
        
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
        }
    }, [title, content, isEditing, currentEntry?.id, saveEntryToApi, AUTOSAVE_DELAY_MS])

    // Cleanup auto-save timeout and handle beforeunload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
            if (isEditing && (title.trim() || content.trim())) {
                const entryId = currentEntry?.id || crypto.randomUUID()
                const now = new Date().toISOString()
                const localEntry: JournalEntry = {
                    id: entryId,
                    title: title.trim() || "Untitled",
                    content,
                    createdAt: currentEntry?.createdAt || now,
                    updatedAt: now,
                }
                const updatedEntries = currentEntry
                    ? entries.map(e => e.id === currentEntry.id ? localEntry : e)
                    : [localEntry, ...entries]
                setString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, JSON.stringify(updatedEntries))
            }
        }
        
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
        }
    }, [isEditing, title, content, currentEntry, entries])

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

    const getExportFileName = (encrypted: boolean) => {
        const dateLabel = new Date().toISOString().slice(0, 10)
        return `metadj-journal-${dateLabel}${encrypted ? "-encrypted" : ""}.json`
    }

    const resetExportState = () => {
        setIsExportOpen(false)
        setExportEncrypted(false)
        setExportPassphrase("")
        setIsExporting(false)
    }

    const resetImportState = () => {
        setIsImportOpen(false)
        setImportPassphrase("")
        setImportFile(null)
        setIsImporting(false)
        if (importInputRef.current) {
            importInputRef.current.value = ""
        }
    }

    const handleExportOpen = () => {
        setIsExportOpen(true)
    }

    const handleExportClose = () => {
        resetExportState()
    }

    const handleImportOpen = () => {
        setIsImportOpen(true)
    }

    const handleImportClose = () => {
        resetImportState()
    }

    const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null
        setImportFile(file)
    }

    const handleExport = async () => {
        if (entries.length === 0) {
            showToast({ message: "No journal entries to export", variant: "info" })
            return
        }

        const passphrase = exportPassphrase.trim()
        if (exportEncrypted && passphrase.length < MIN_PASSPHRASE_LENGTH) {
            showToast({ message: `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`, variant: "error" })
            return
        }

        setIsExporting(true)
        try {
            const payload = await createJournalExport(entries, {
                encrypt: exportEncrypted,
                passphrase: exportEncrypted ? passphrase : undefined,
            })
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = getExportFileName(exportEncrypted)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            showToast({ message: "Journal export ready", variant: "success" })
            resetExportState()
        } catch (error) {
            showToast({
                message: error instanceof Error ? error.message : "Unable to export journal",
                variant: "error",
            })
            setIsExporting(false)
        }
    }

    const handleImport = async () => {
        if (!importFile) {
            showToast({ message: "Select a journal export file", variant: "error" })
            return
        }

        setIsImporting(true)
        try {
            const fileText = await importFile.text()
            const result = await parseJournalImport(fileText, {
                passphrase: importPassphrase.trim() || undefined,
            })
            const merged = mergeJournalEntries(entries, result.entries)

            if (merged.added === 0 && merged.updated === 0) {
                showToast({ message: "No new entries to import", variant: "info" })
            } else {
                setEntries(merged.entries)
                const total = merged.added + merged.updated
                const updatesLabel = merged.updated > 0 ? ` (${merged.updated} updated)` : ""
                showToast({ message: `Imported ${total} entries${updatesLabel}`, variant: "success" })
            }

            resetImportState()
        } catch (error) {
            showToast({
                message: error instanceof Error ? error.message : "Unable to import journal",
                variant: "error",
            })
            setIsImporting(false)
        }
    }

    const handleExportSingle = async (entryId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const entry = entries.find(item => item.id === entryId)
        if (!entry) {
            showToast({ message: "Entry not found", variant: "error" })
            return
        }
        
        try {
            const payload = await createJournalExport([entry], { encrypt: false })
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            const dateLabel = new Date().toISOString().slice(0, 10)
            const safeTitle = entry.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)
            link.href = url
            link.download = `metadj-journal-${safeTitle}-${dateLabel}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            showToast({ message: "Entry exported", variant: "success" })
        } catch (error) {
            showToast({
                message: error instanceof Error ? error.message : "Unable to export entry",
                variant: "error",
            })
        }
    }

    const handleExportCurrentEntry = async () => {
        if (!currentEntry && !title.trim() && !content.trim()) {
            showToast({ message: "No entry to export", variant: "info" })
            return
        }
        
        const entryToExport: JournalEntry = currentEntry 
            ? { ...currentEntry, title, content, updatedAt: new Date().toISOString() }
            : {
                id: crypto.randomUUID(),
                title: title.trim() || "Untitled",
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
        
        try {
            const payload = await createJournalExport([entryToExport], { encrypt: false })
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            const dateLabel = new Date().toISOString().slice(0, 10)
            const safeTitle = entryToExport.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)
            link.href = url
            link.download = `metadj-journal-${safeTitle}-${dateLabel}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            showToast({ message: "Entry exported", variant: "success" })
        } catch (error) {
            showToast({
                message: error instanceof Error ? error.message : "Unable to export entry",
                variant: "error",
            })
        }
    }

    const handleBackToList = () => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
        }
        if (title.trim() || content.trim()) {
            saveEntryToApi(currentEntry?.id || null, title, content)
        }
        setIsEditing(false)
        setCurrentEntry(null)
        clearDraftState()
    }

    const handleSave = () => {
        if (!title.trim() && !content.trim()) {
            showToast({ message: "Entry cannot be empty", variant: "error" })
            return
        }

        const now = new Date().toISOString()
        const wordCount = getWordCount(content)
        const metrics = {
            titleLength: title.trim().length,
            contentLength: content.length,
            wordCount,
            hasTitle: Boolean(title.trim()),
        }

        if (currentEntry) {
            // Update existing
            const updatedEntries = entries.map(e =>
                e.id === currentEntry.id
                    ? { ...e, title, content, updatedAt: now }
                    : e
            )
            setEntries(updatedEntries)
            trackJournalEntryUpdated(metrics)
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
            trackJournalEntryCreated(metrics)
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

        const entryToRemove = entries.find((entry) => entry.id === entryToDelete)
        if (entryToRemove) {
            const entryAgeDays = (Date.now() - new Date(entryToRemove.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            trackJournalEntryDeleted({
                titleLength: entryToRemove.title.trim().length,
                contentLength: entryToRemove.content.length,
                wordCount: getWordCount(entryToRemove.content),
                hasTitle: Boolean(entryToRemove.title.trim()),
                entryAgeDays,
            })
        }

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
        ts.keep(["u"])
        return ts
    })

    const ALLOWED_TAGS = new Set([
        "h1",
        "h2",
        "h3",
        "b",
        "strong",
        "i",
        "em",
        "u",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "br",
        "hr",
        "p",
        "div",
        "span",
        "a",
    ])

    const ALLOWED_ATTRS: Record<string, Set<string>> = {
        a: new Set(["href", "target", "rel"]),
        hr: new Set(["class"]),
    }

    const isSafeHref = (value: string) => {
        if (value.startsWith("#")) return true
        try {
            const parsed = new URL(value, window.location.origin)
            return ["http:", "https:", "mailto:"].includes(parsed.protocol)
        } catch {
            return false
        }
    }

    const sanitizeEditorHtml = (rawHtml: string) => {
        if (typeof window === "undefined") return rawHtml
        const template = document.createElement("template")
        template.innerHTML = rawHtml

        const nodes: Element[] = []
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT)
        while (walker.nextNode()) {
            nodes.push(walker.currentNode as Element)
        }

        for (const node of nodes) {
            if (!node.isConnected) continue
            const tag = node.tagName.toLowerCase()

            if (!ALLOWED_TAGS.has(tag)) {
                const text = node.textContent ?? ""
                node.replaceWith(document.createTextNode(text))
                continue
            }

            const allowedAttrs = ALLOWED_ATTRS[tag]
            for (const attr of Array.from(node.attributes)) {
                if (!allowedAttrs || !allowedAttrs.has(attr.name)) {
                    node.removeAttribute(attr.name)
                    continue
                }
                if (tag === "a" && attr.name === "href") {
                    const href = node.getAttribute("href") ?? ""
                    if (!isSafeHref(href)) {
                        node.removeAttribute("href")
                    }
                }
            }

            if (tag === "a") {
                const target = node.getAttribute("target")
                if (target === "_blank") {
                    node.setAttribute("rel", "noopener noreferrer")
                } else if (target && target !== "_self") {
                    node.removeAttribute("target")
                }
            }
        }

        return template.innerHTML
    }

    const markdownToHtml = (markdown: string) => {
        if (!markdown.trim()) return "<div><br></div>"
        const html = marked.parse(markdown)
        return sanitizeEditorHtml(typeof html === "string" ? html : String(html))
    }

    const getEntryPreview = (markdown: string) => {
        if (!markdown.trim()) return ""
        if (typeof document === "undefined") return markdown
        const html = markdownToHtml(markdown)
        const preview = document.createElement("div")
        preview.innerHTML = html
        return (preview.textContent ?? "").replace(/\s+/g, " ").trim()
    }

    const entryPreviews = useMemo(() => {
        const previews: Record<string, string> = {}
        entries.forEach((entry) => {
            previews[entry.id] = getEntryPreview(entry.content)
        })
        return previews
    // getEntryPreview is a stable pure function defined above with no external dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries])

    const handleEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault()
        const text = event.clipboardData.getData("text/plain")
        if (!text) return

        const insertText = text.replace(/\r\n/g, "\n")
        const selection = window.getSelection()
        if (document.queryCommandSupported?.("insertText")) {
            document.execCommand("insertText", false, insertText)
        } else if (selection?.rangeCount) {
            selection.deleteFromDocument()
            selection.getRangeAt(0).insertNode(document.createTextNode(insertText))
            selection.collapseToEnd()
        } else if (editorRef.current) {
            editorRef.current.textContent = `${editorRef.current.textContent ?? ""}${insertText}`
        }
        handleEditorChange()
    }

    // Initial load of content into contenteditable
    useEffect(() => {
        if (isEditing && editorRef.current) {
            // Markdown to HTML for editor hydration (always styled)
            editorRef.current.innerHTML = markdownToHtml(content)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- content should only load on initial edit, not on every keystroke
    }, [isEditing])

    const handleEditorChange = () => {
        if (editorRef.current) {
            const html = sanitizeEditorHtml(editorRef.current.innerHTML)
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
        if (!editorRef.current) return
        editorRef.current.focus()
        document.execCommand(command, false, value)
        handleEditorChange()
        editorRef.current.focus()
    }

    const insertDivider = () => {
        const hr = '<hr class="my-4 border-white/10">'
        execCommand("insertHTML", hr)
    }

    const handleToolbarMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
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
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("formatBlock", "<h1>")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Heading 1"
                                    >
                                        <Heading1 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("formatBlock", "<h2>")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Heading 2"
                                    >
                                        <Heading2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("formatBlock", "<h3>")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Heading 3"
                                    >
                                        <Heading3 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("bold")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Bold"
                                    >
                                        <Bold className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("italic")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Italic"
                                    >
                                        <Italic className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("underline")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Underline"
                                    >
                                        <Underline className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="w-px h-5 bg-white/10 mx-1.5" />
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("insertUnorderedList")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Bullet List"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("insertOrderedList")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Numbered List"
                                    >
                                        <ListOrdered className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("formatBlock", "<blockquote>")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Quote / Indent"
                                    >
                                        <Quote className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="w-px h-5 bg-white/10 mx-1.5" />
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => {
                                            const url = prompt("Enter URL:")
                                            if (url) execCommand("createLink", url)
                                        }}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Add Link"
                                    >
                                        <Link className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={() => execCommand("formatBlock", "<pre>")}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Code Block"
                                    >
                                        <Code className="h-4 w-4" />
                                    </button>
                                    <button
                                        onMouseDown={handleToolbarMouseDown}
                                        onClick={insertDivider}
                                        className="p-2 rounded-md hover:bg-white/10 text-muted-accessible hover:text-white transition-colors"
                                        title="Line Divider"
                                    >
                                        <SeparatorHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto shrink-0">
                                <button
                                    onClick={handleExportCurrentEntry}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-all text-[11px] font-heading font-bold uppercase tracking-widest"
                                    title="Export this entry"
                                >
                                    <Download className="h-4 w-4" />
                                    Export
                                </button>
                                <button
                                    onClick={handleBackToList}
                                    className="flex items-center gap-1.5 px-6 py-2 rounded-full brand-gradient hover:scale-105 active:scale-95 text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 font-heading font-bold uppercase tracking-widest text-[11px] group border border-white/20"
                                    title="Return to journal list"
                                >
                                    <ArrowLeft className="h-4 w-4 group-hover:animate-pulse" />
                                    Back to Journal Log
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
                                className="w-full bg-transparent text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-white placeholder:text-white/10 focus-ring-light tracking-tight"
                            />
                            <div
                                className="flex-1 min-h-[60vh] rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.35)] focus-within:border-purple-500/50 focus-within:shadow-[inset_0_0_30px_rgba(0,0,0,0.35),0_0_25px_rgba(168,85,247,0.18)]"
                            >
                                <div className="h-full w-full overflow-hidden rounded-2xl">
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        onInput={handleEditorChange}
                                        onPaste={handleEditorPaste}
                                        role="textbox"
                                        aria-multiline="true"
                                        spellCheck={false}
                                        className="journal-editor h-full min-h-full w-full overflow-y-auto px-5 sm:px-8 py-6 text-lg sm:text-xl text-white/85 leading-relaxed pb-12 custom-scrollbar outline-none prose prose-invert prose-purple max-w-none prose-headings:font-heading prose-headings:tracking-tight prose-p:text-lg sm:prose-p:text-xl prose-p:leading-relaxed"
                                        data-placeholder="Write your thoughts..."
                                    />
                                </div>
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
            {/* Dynamic Aurora Background - matching Hub design */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] brand-gradient opacity-20 blur-[100px] pointer-events-none mix-blend-screen" />

            <header className="relative z-10 flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl min-[1100px]:text-3xl font-heading font-bold text-pop">
                        <span className="text-heading-solid">Journal</span>
                    </h2>
                    <p className="text-white/60 text-xs min-[1100px]:text-sm">
                        Your personal space
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleImportOpen}
                        className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                        <Upload className="h-3.5 w-3.5 text-cyan-200 group-hover:text-cyan-100 transition-colors" />
                        Import
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="group flex items-center gap-1.5 px-3 py-1.5 min-[1100px]:px-5 min-[1100px]:py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-purple-400/30 hover:border-cyan-400/50 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    >
                        <Plus className="h-4 w-4 min-[1100px]:h-5 min-[1100px]:w-5 shrink-0 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
                        <span className="text-heading-solid font-semibold text-sm min-[1100px]:text-base">New</span>
                    </button>
                </div>
            </header>

            {/* Search bar */}
            {entries.length > 0 && (
                <div className="relative z-10 max-w-md w-full">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white/70 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search journal..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/8 transition-all"
                            aria-label="Search journal entries"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4 text-white/60" />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className="mt-2 text-xs text-white/60">
                            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"} found
                        </p>
                    )}
                </div>
            )}

            {entries.length === 0 ? (
                <div className="relative z-10 text-center py-20 rounded-2xl border border-white/5 bg-white/3">
                    <Book className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <h3 className="text-xl font-heading font-semibold text-heading-solid mb-2">Empty Journal</h3>
                    <p className="text-muted-accessible max-w-sm mx-auto mb-6">
                        This is your space to write. No entries yet.
                    </p>
                    <button
                        onClick={handleCreateNew}
                        className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-purple-400/30 hover:border-cyan-400/50 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    >
                        <Plus className="h-5 w-5 shrink-0 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
                        <span className="text-heading-solid font-semibold">Start Writing</span>
                    </button>
                </div>
            ) : filteredEntries.length === 0 && searchQuery ? (
                <div className="relative z-10 text-center py-12 rounded-2xl border border-white/5 bg-white/3">
                    <Search className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <h3 className="text-lg font-heading font-semibold text-heading-solid mb-1">No matches found</h3>
                    <p className="text-sm text-muted-accessible">
                        Try a different search term
                    </p>
                </div>
            ) : (
                <div className="relative z-10 grid gap-4 min-[1100px]:grid-cols-3">
                    {filteredEntries.map((entry) => (
                        <div
                            key={entry.id}
                            onClick={() => handleEdit(entry)}
                            className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer h-64"
                        >
                            <div>
                                <h3 className="text-lg font-heading font-semibold text-heading-solid mb-2 line-clamp-1">
                                    {entry.title}
                                </h3>
                                <p className="text-sm text-white/60 line-clamp-6 leading-relaxed">
                                    {entryPreviews[entry.id] || <span className="italic text-muted-accessible">No content...</span>}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-xs text-muted-accessible">
                                <span>{formatDate(entry.updatedAt)}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => handleExportSingle(entry.id, e)}
                                        className="p-2 rounded-full hover:bg-white/10 hover:text-cyan-400 transition-colors z-10"
                                        title="Export this entry"
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => requestDelete(entry.id, e)}
                                        className="p-2 -mr-2 rounded-full hover:bg-white/10 hover:text-red-400 transition-colors z-10"
                                        title="Delete this entry"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isExportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-(--bg-surface-elevated) border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-cyan-200">
                            <div className="p-2 rounded-full bg-cyan-400/10">
                                <Download className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-heading font-bold text-heading-solid">Export Journal</h3>
                        </div>

                        <p className="text-sm text-white/70">
                            Download your journal entries as a JSON file. Encryption is optional and uses a local passphrase.
                        </p>

                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                            <input
                                type="checkbox"
                                checked={exportEncrypted}
                                onChange={(event) => setExportEncrypted(event.target.checked)}
                                className="h-4 w-4 rounded border-white/20 bg-black/60 text-cyan-300 focus-ring"
                            />
                            Encrypt with passphrase
                        </label>

                        {exportEncrypted && (
                            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                                Passphrase
                                <input
                                    type="password"
                                    value={exportPassphrase}
                                    onChange={(event) => setExportPassphrase(event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/90 focus-ring"
                                    placeholder={`Minimum ${MIN_PASSPHRASE_LENGTH} characters`}
                                />
                            </label>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={handleExportClose}
                                className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                disabled={isExporting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                className={clsx(
                                    "px-5 py-2 rounded-full font-semibold transition-colors shadow-lg",
                                    isExporting
                                        ? "bg-white/10 text-white/50 cursor-default"
                                        : "bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 border border-cyan-400/40"
                                )}
                                disabled={isExporting}
                            >
                                {isExporting ? "Preparing..." : "Download"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-(--bg-surface-elevated) border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-indigo-200">
                            <div className="p-2 rounded-full bg-indigo-400/10">
                                <Upload className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-heading font-bold text-heading-solid">Import Journal</h3>
                        </div>

                        <p className="text-sm text-white/70">
                            Import entries from a JSON export. Encrypted files require the original passphrase.
                        </p>

                        <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                            Journal export file
                            <input
                                ref={importInputRef}
                                type="file"
                                accept="application/json"
                                onChange={handleImportFileChange}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/80 focus-ring"
                            />
                        </label>

                        {importFile && (
                            <p className="text-[11px] text-white/60">
                                Selected: {importFile.name}
                            </p>
                        )}

                        <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                            Passphrase (if encrypted)
                            <input
                                type="password"
                                value={importPassphrase}
                                onChange={(event) => setImportPassphrase(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/90 focus-ring"
                                placeholder="Leave blank if not encrypted"
                            />
                        </label>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={handleImportClose}
                                className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                disabled={isImporting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                className={clsx(
                                    "px-5 py-2 rounded-full font-semibold transition-colors shadow-lg",
                                    !importFile || isImporting
                                        ? "bg-white/10 text-white/50 cursor-default"
                                        : "bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 border border-indigo-400/40"
                                )}
                                disabled={!importFile || isImporting}
                            >
                                {isImporting ? "Importing..." : "Import"}
                            </button>
                        </div>
                    </div>
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
                            <h3 className="text-lg font-heading font-bold text-heading-solid">Delete Entry?</h3>
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
