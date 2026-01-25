// Vitest setup file with React Testing Library configuration
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test-auth-secret-32-characters-minimum';
}

// Mock sessionStorage for consistent access in jsdom
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Mock browser APIs not available in jsdom
global.MediaMetadata = class MediaMetadata {
  title: string;
  artist: string;
  album: string;
  artwork: { src: string; sizes: string; type: string }[];

  constructor(metadata: { title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[] }) {
    this.title = metadata.title;
    this.artist = metadata.artist;
    this.album = metadata.album;
    this.artwork = metadata.artwork;
  }
} as unknown as typeof globalThis.MediaMetadata;

// Mock window.scrollTo (used by useBodyScrollLock hook)
window.scrollTo = vi.fn();

// Mock window.matchMedia (used by responsive hooks and components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // legacy
    removeListener: vi.fn(), // legacy
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
});
