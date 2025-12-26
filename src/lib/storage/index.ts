/**
 * Storage Module Exports
 *
 * Unified persistence layer for MetaDJ Nexus
 */

// Main persistence API
export {
  STORAGE_KEYS,
  type StorageKey,
  isStorageAvailable,
  getValue,
  setValue,
  getString,
  setString,
  getNumber,
  setNumber,
  getBoolean,
  setBoolean,
  removeValue,
  getRawValue,
  setRawValue,
  runMigrations,
  clearAllStorage,
  exportStorageData,
  onStorageChange,
} from "./persistence"

// MetaDJ AI session storage
export { metadjAiSessionStorage } from "./metadjai-session-storage"

// Storage types (Replit bucket types)
export type { StorageBucket, StorageBucketFile } from "./storage.types"
