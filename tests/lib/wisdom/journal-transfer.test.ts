/**
 * Journal transfer tests
 *
 * Covers export/import and merge behavior with optional encryption.
 */

import { webcrypto } from "node:crypto"
import { beforeAll, describe, expect, it } from "vitest"
import {
  createJournalExport,
  mergeJournalEntries,
  parseJournalImport,
} from "@/lib/journal"
import type { JournalEntry } from "@/lib/journal"

const sampleEntries: JournalEntry[] = [
  {
    id: "entry-1",
    title: "First",
    content: "Hello world",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "entry-2",
    title: "Second",
    content: "More notes",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
]

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    globalThis.crypto = webcrypto as unknown as Crypto
  }
})

describe("createJournalExport", () => {
  it("creates a plain export payload", async () => {
    const payload = await createJournalExport(sampleEntries)
    expect(payload.encrypted).toBe(false)
    if (!payload.encrypted) {
      expect(payload.entries).toHaveLength(2)
      expect(payload.entries[0].id).toBe("entry-1")
    }
  })

  it("creates an encrypted export payload", async () => {
    const payload = await createJournalExport(sampleEntries, {
      encrypt: true,
      passphrase: "strong-passphrase",
    })
    expect(payload.encrypted).toBe(true)
    if (payload.encrypted) {
      expect(payload.cipher).toBe("AES-GCM")
      expect(payload.ciphertext.length).toBeGreaterThan(10)
    }
  })
})

describe("parseJournalImport", () => {
  it("parses a plain export", async () => {
    const payload = await createJournalExport(sampleEntries)
    const result = await parseJournalImport(JSON.stringify(payload))
    expect(result.encrypted).toBe(false)
    expect(result.entries).toHaveLength(2)
  })

  it("parses an encrypted export with passphrase", async () => {
    const payload = await createJournalExport(sampleEntries, {
      encrypt: true,
      passphrase: "passphrase-123",
    })
    const result = await parseJournalImport(JSON.stringify(payload), {
      passphrase: "passphrase-123",
    })
    expect(result.encrypted).toBe(true)
    expect(result.entries[0].title).toBe("First")
  })

  it("throws when encrypted export lacks passphrase", async () => {
    const payload = await createJournalExport(sampleEntries, {
      encrypt: true,
      passphrase: "passphrase-123",
    })

    await expect(parseJournalImport(JSON.stringify(payload))).rejects.toThrow(
      "Passphrase required"
    )
  })
})

describe("mergeJournalEntries", () => {
  it("merges new and updated entries", () => {
    const existing: JournalEntry[] = [
      {
        id: "entry-1",
        title: "First",
        content: "Hello world",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]
    const incoming: JournalEntry[] = [
      {
        id: "entry-1",
        title: "First (updated)",
        content: "Updated content",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "entry-3",
        title: "Third",
        content: "New entry",
        createdAt: "2026-01-04T00:00:00.000Z",
        updatedAt: "2026-01-04T00:00:00.000Z",
      },
    ]

    const merged = mergeJournalEntries(existing, incoming)
    expect(merged.entries).toHaveLength(2)
    expect(merged.added).toBe(1)
    expect(merged.updated).toBe(1)
    expect(merged.skipped).toBe(0)
    expect(merged.entries[0].id).toBe("entry-3")
  })
})
