import type { JournalEntry } from "./types"

const JOURNAL_EXPORT_TYPE = "metadj-nexus-journal"
const JOURNAL_EXPORT_VERSION = 1
const DEFAULT_ITERATIONS = 150_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

export interface JournalExportPlain {
  type: typeof JOURNAL_EXPORT_TYPE
  version: typeof JOURNAL_EXPORT_VERSION
  createdAt: string
  encrypted: false
  entries: JournalEntry[]
}

export interface JournalExportEncrypted {
  type: typeof JOURNAL_EXPORT_TYPE
  version: typeof JOURNAL_EXPORT_VERSION
  createdAt: string
  encrypted: true
  cipher: "AES-GCM"
  kdf: "PBKDF2"
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

export type JournalExportPayload = JournalExportPlain | JournalExportEncrypted

export interface JournalImportResult {
  entries: JournalEntry[]
  encrypted: boolean
}

export interface JournalMergeResult {
  entries: JournalEntry[]
  added: number
  updated: number
  skipped: number
}

function ensureWebCrypto() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is not available in this environment.")
  }
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"))
  }

  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.content === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  )
}

function parseEntries(rawEntries: unknown): JournalEntry[] {
  if (!Array.isArray(rawEntries)) {
    throw new Error("Journal export is missing entries.")
  }

  return rawEntries.filter(isJournalEntry)
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  ensureWebCrypto()
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      // Uint8Array is a TypedArray which satisfies BufferSource at runtime
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

async function encryptPayload(payload: JournalExportPlain, passphrase: string): Promise<JournalExportEncrypted> {
  ensureWebCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt, DEFAULT_ITERATIONS)

  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)

  return {
    type: JOURNAL_EXPORT_TYPE,
    version: JOURNAL_EXPORT_VERSION,
    createdAt: payload.createdAt,
    encrypted: true,
    cipher: "AES-GCM",
    kdf: "PBKDF2",
    iterations: DEFAULT_ITERATIONS,
    salt: encodeBase64(salt),
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
  }
}

async function decryptPayload(payload: JournalExportEncrypted, passphrase: string): Promise<JournalExportPlain> {
  ensureWebCrypto()
  const salt = decodeBase64(payload.salt)
  const iv = decodeBase64(payload.iv)
  const ciphertext = decodeBase64(payload.ciphertext)
  const key = await deriveKey(passphrase, salt, payload.iterations)

  const decrypted = await crypto.subtle.decrypt(
    // Uint8Array is a TypedArray which satisfies BufferSource at runtime
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  )
  const decoded = new TextDecoder().decode(decrypted)

  const parsed = JSON.parse(decoded) as JournalExportPlain
  if (parsed.type !== JOURNAL_EXPORT_TYPE || parsed.version !== JOURNAL_EXPORT_VERSION) {
    throw new Error("Unsupported journal export format.")
  }

  return parsed
}

export async function createJournalExport(
  entries: JournalEntry[],
  options?: { encrypt?: boolean; passphrase?: string; now?: Date },
): Promise<JournalExportPayload> {
  const createdAt = (options?.now ?? new Date()).toISOString()

  const payload: JournalExportPlain = {
    type: JOURNAL_EXPORT_TYPE,
    version: JOURNAL_EXPORT_VERSION,
    createdAt,
    encrypted: false,
    entries,
  }

  if (!options?.encrypt) {
    return payload
  }

  const passphrase = options.passphrase?.trim()
  if (!passphrase) {
    throw new Error("Passphrase required for encrypted export.")
  }

  return encryptPayload(payload, passphrase)
}

export async function parseJournalImport(
  raw: string,
  options?: { passphrase?: string },
): Promise<JournalImportResult> {
  let parsed: JournalExportPayload
  try {
    parsed = JSON.parse(raw) as JournalExportPayload
  } catch {
    throw new Error("Journal import file is not valid JSON.")
  }

  if (!parsed || typeof parsed !== "object" || parsed.type !== JOURNAL_EXPORT_TYPE) {
    throw new Error("Unsupported journal import format.")
  }

  if (parsed.version !== JOURNAL_EXPORT_VERSION) {
    throw new Error("Unsupported journal export version.")
  }

  if (!parsed.encrypted) {
    return {
      entries: parseEntries((parsed as JournalExportPlain).entries),
      encrypted: false,
    }
  }

  const passphrase = options?.passphrase?.trim()
  if (!passphrase) {
    throw new Error("Passphrase required to decrypt this journal export.")
  }

  const decrypted = await decryptPayload(parsed as JournalExportEncrypted, passphrase)
  return {
    entries: parseEntries(decrypted.entries),
    encrypted: true,
  }
}

export function mergeJournalEntries(
  existing: JournalEntry[],
  incoming: JournalEntry[],
): JournalMergeResult {
  const map = new Map(existing.map((entry) => [entry.id, entry]))
  let added = 0
  let updated = 0
  let skipped = 0

  incoming.forEach((entry) => {
    const current = map.get(entry.id)
    if (!current) {
      map.set(entry.id, entry)
      added += 1
      return
    }

    const currentTime = Date.parse(current.updatedAt) || 0
    const incomingTime = Date.parse(entry.updatedAt) || 0
    if (incomingTime > currentTime) {
      map.set(entry.id, entry)
      updated += 1
    } else {
      skipped += 1
    }
  })

  const mergedEntries = Array.from(map.values()).sort((a, b) => {
    const aTime = Date.parse(a.updatedAt) || 0
    const bTime = Date.parse(b.updatedAt) || 0
    return bTime - aTime
  })

  return {
    entries: mergedEntries,
    added,
    updated,
    skipped,
  }
}

export function getJournalExportType(): string {
  return JOURNAL_EXPORT_TYPE
}
