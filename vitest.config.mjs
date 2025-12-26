import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));
const zodV3ShimPath = fileURLToPath(new URL('./src/lib/zod-v3-shim.ts', import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths({ ignoreConfigErrors: true })],
  resolve: {
    alias: {
      '@': srcPath,
      'zod/v3': zodV3ShimPath,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      // ========================================================================
      // Coverage Threshold Milestone Plan
      // ========================================================================
      //
      // Current Phase: Public Preview (v0.9.x)
      // These thresholds establish a baseline while allowing rapid iteration.
      // CI gates on these thresholds to prevent coverage regression.
      //
      // MILESTONE ROADMAP:
      // ------------------
      // v0.9.x (Current)   : lines: 15, functions: 15, branches: 8, statements: 15
      // v0.10.x (Q1 2026)  : lines: 30, functions: 25, branches: 15, statements: 30
      // v0.11.x (Q2 2026)  : lines: 50, functions: 40, branches: 25, statements: 50
      // v1.0.0  (Launch)   : lines: 60, functions: 50, branches: 40, statements: 60
      //
      // PRIORITY AREAS FOR COVERAGE:
      // 1. src/contexts/ - State management critical paths
      // 2. src/hooks/use-audio-playback.ts - Complex playback logic
      // 3. src/lib/validation/ - Data integrity (already well-covered)
      // 4. src/lib/ai/ - AI provider integration paths
      // 5. src/app/api/ - API route handlers
      //
      // To check current coverage: npm run test:coverage
      // ========================================================================
      thresholds: {
        lines: 15,
        functions: 15,
        branches: 8,
        statements: 15,
      },
    },
  },
});
