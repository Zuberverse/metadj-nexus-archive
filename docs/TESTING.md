# Testing Guide — MetaDJ Nexus

**Last Modified**: 2026-01-08 13:45 EST

## Overview

MetaDJ Nexus maintains a comprehensive test suite ensuring code quality, reliability, and production readiness. All tests must pass before deployment.

## Test Suite Summary

**Unit/Integration Tests**: Run `npm run test` to see current counts
**E2E Tests**: Playwright smoke suite in `tests/e2e` (multi-browser)
**Test Files**: See `tests/` for suite structure
**Pass Rate**: 100% required in CI (run `npm run test:ci` or `npm run build:ci`)
**Test Runner**: Vitest with jsdom environment
**Coverage Thresholds**: 30% lines, 25% functions, 15% branches, 30% statements (enforced by `npm run test:coverage`; see `vitest.config.mjs` for milestone plan)
**Coverage Exclusions**: 3D visualizers + integration-heavy root components (`CinemaOverlay`, `HomePageClient`, `MetaDjAiChat`) are excluded from unit coverage until decomposed; E2E + manual QA guard those flows.

## Running Tests

### Quick Start

```bash
# Run all unit/integration tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report (with threshold enforcement)
npm run test:coverage

# Run Playwright E2E tests (first time: npx playwright install)
npm run test:e2e

```

### Playwright Notes
- Config: `playwright.config.ts`
- Uses `npm run dev:http` on port 8100; override with `PORT` or `PLAYWRIGHT_BASE_URL` if needed.

### Full Quality Pipeline

```bash
# Complete validation (local smoke)
npm run lint          # ESLint with --max-warnings=0
npm run type-check    # TypeScript strict mode
npm run test          # Full test suite
npm run test:e2e      # Playwright multi-browser smoke tests (requires browsers installed)
npm run build         # Production build
```

### CI Validation (Recommended)

```bash
# CI build path (prebuild:ci runs test:ci)
npm run build:ci

# Optional standalone CI check
npm run test:ci
```

### Coverage (Optional)

CI does **not** gate on coverage during Public Preview.

```bash
# Generate coverage report (thresholds are intentionally lightweight for now)
npm run test:coverage
```

## Test Suite Organization

### 1. Music Repository Tests (20 tests)

**File**: `tests/lib/music/music-repository.test.ts`

Tests core music data operations and track/collection management:

**Track Operations**:
- Get track by ID (valid and invalid)
- Track existence validation
- Get all tracks
- Get tracks by collection ID
- Featured track filtering
- Track count calculations

**Collection Operations**:
- Get all collections
- Get collection by ID
- Collection existence validation
- Track count accuracy per collection

**Shuffle Logic**:
- Preserve current track position
- Randomize remaining tracks
- Handle edge cases (single track, empty queue)

**Data Integrity**:
- All tracks have valid collection references
- No duplicate track IDs
- All collections have valid tracks
- Required fields present and valid

### 2. Queue Operations Tests (14 tests)

**File**: `tests/hooks/queue-operations.test.ts`

Tests queue persistence and localStorage operations:

**Persistence Functions**:
- Save queue to localStorage
- Load queue from localStorage
- Clear queue data
- Version mismatch handling

**Data Validation**:
- Valid queue data structure
- Invalid data handling
- Missing fields handling
- Type coercion safety

**Edge Cases**:
- Empty queue handling
- Malformed JSON handling
- Storage quota exceeded
- Concurrent access patterns

**Queue Context**:
- Collection context persistence
- Search query persistence
- Manual track order preservation

### 3. Search and Filter Tests (20 tests)

**File**: `tests/lib/music/search-and-filter.test.ts`

Tests search functionality, relevance, and performance:

**Title Search**:
- Exact title matches
- Partial title matches
- Case-insensitive search
- Special character handling

**Multi-Field Search**:
- Search across titles, artists, collections
- Tag/genre filtering
- Collection description search

**Search Relevance**:
- Title matches prioritized
- Artist matches ranked
- Tag matches scored appropriately

**Performance Benchmarks**:
- Search completes in <100ms (enforced)
- Large dataset handling
- Efficient filtering algorithms

**Edge Cases**:
- Empty search queries
- No results handling
- Special characters and punctuation
- Whitespace normalization

### 4. API Route Tests

**Files**:
- `tests/api/api-routes.test.ts`
- `tests/api/streaming.test.ts`

Tests API route handlers and error cases:

**Audio Streaming**:
- Valid audio file requests
- Path traversal prevention
- Extension whitelisting
- Error handling

**Video Streaming**:
- Valid video file requests
- Security validation
- Graceful degradation

### 5. Utility Function Tests

**File**: `tests/lib/utils.test.ts`

Tests helper utilities and data transformations:

**Time Formatting**:
- Duration conversion (seconds to MM:SS)
- Edge cases (0 seconds, >1 hour)

**String Utilities**:
- Slug generation
- Text truncation
- Sanitization functions

Tests end-to-end user flows and component integration:

**Playback Flows**:
- Play track → pause → resume → next track
- Queue navigation (previous, next, jump to track)
- Shuffle mode with track preservation

**State Management**:
- PlayerContext + QueueContext coordination
- localStorage persistence across sessions
- State-driven navigation and restoration (no route transitions for tabs; Wisdom supports shareable `/wisdom/*` deep links)

**Error Handling**:
- Missing track handling
- Network failures
- Invalid queue states

**User Interactions**:
- Click to play track
- Add to queue
- Remove from queue
- Reorder queue

## Test Architecture

### Vitest Configuration

**File**: `vitest.config.mjs`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
```

### Shared Test Utilities

**File**: `tests/setup.ts`

Provides centralized test helpers:
- Mock data generators
- Test fixtures
- Assertion utilities
- Environment setup

### Testing Patterns

**Unit Tests**:
- Pure function testing
- Single responsibility validation
- Input/output verification
- Edge case coverage

**Integration Tests**:
- Multi-component interaction
- State management coordination
- User flow simulation
- Error boundary testing

**Performance Tests**:
- Response time benchmarks (<100ms search)
- Memory usage validation
- Render performance checks

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

Automated testing on every pull request:

```yaml
name: Test Suite
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Install dependencies
      - Run ESLint (--max-warnings=0)
      - Run TypeScript type-check
      - Run full suite (1008 tests)
      - Run production build
```

### Quality Gates

**Zero-Tolerance Standards**:
- ✅ 0 TypeScript errors (strict mode)
- ✅ 0 ESLint warnings
- ✅ 100% test passing rate
- ✅ Production build success

**PR Requirements**:
- All checks must pass before merge
- No bypassing quality gates
- Manual review after automated checks

## Adding New Tests

### Test File Structure

```typescript
// tests/[category]/[feature].test.ts
import { describe, it, expect } from 'vitest'
import { functionToTest } from '@/lib/[file]'

describe('[Feature Name]', () => {
  describe('[Function Name]', () => {
    it('should handle [specific case]', () => {
      // Arrange
      const input = setupTestData()

      // Act
      const result = functionToTest(input)

      // Assert
      expect(result).toBe(expectedValue)
    })
  })
})
```

### Test Naming Conventions

**Describe blocks**: Feature or subsystem name
**Test cases**: "should [expected behavior]"

```typescript
describe('Track Search', () => {
  it('should return exact title matches first', () => {})
  it('should handle empty search queries', () => {})
  it('should complete in under 100ms', () => {})
})
```

### Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on user-facing behavior
   - Avoid testing internal implementation details
   - Test public API surface only

2. **Arrange-Act-Assert Pattern**
   - Arrange: Set up test data
   - Act: Execute function under test
   - Assert: Verify expected outcome

3. **One Assertion Per Test**
   - Each test validates one specific behavior
   - Multiple assertions for same behavior are OK
   - Separate tests for different behaviors

4. **Edge Case Coverage**
   - Test happy path first
   - Add edge cases (empty, null, invalid)
   - Test error conditions
   - Test boundary values

5. **Performance Benchmarks**
   - Add timing assertions for critical paths
   - Search must complete <100ms
   - Render operations <50ms
   - Network requests <2s timeout

## Test Data Management

### Real Data Testing

Tests run against real `tracks.json` and `collections.json`:
- Ensures production data accuracy
- Catches data integrity issues
- Validates relationships and references
- No mock data divergence

### Fixture Generation

For tests requiring specific data:
```typescript
// tests/fixtures/tracks.ts
export const mockTrack = {
  id: 'test-001',
  title: 'Test Track',
  collection: 'test-collection',
  duration: 180,
  // ... complete valid structure
}
```

## Troubleshooting

### Common Issues

**Test Failures**:
```bash
# Check test output for specific failure
npm run test -- --reporter=verbose

# Run single test file
npm run test tests/lib/music/music-repository.test.ts

# Run specific test
npm run test -t "should get track by ID"
```

**Type Errors in Tests**:
```bash
# Ensure test types are current
npm run type-check

# Check tsconfig.json includes test files
```

**Performance Test Failures**:
- Check system load (CPU, memory)
- Run tests in isolation
- Verify benchmark thresholds are realistic

### Debug Mode

```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/vitest

# Enable verbose logging
npm run test -- --reporter=verbose
```

## E2E Testing

Playwright coverage includes home load + `/api/health`, search → queue add, MetaDJai panel open/close, and cinema view toggle across Chromium/Firefox/WebKit + mobile. Deeper flows (playback, AI responses) still need coverage. CI does not run browsers yet.

## Future Testing Plans

### Planned Additions

**Component Tests** (Future):
- React Testing Library integration
- Component isolation testing
- Interaction testing
- Snapshot testing

**Load Tests** (Future):
- Concurrent user simulation
- API stress testing
- Memory leak detection
- Performance profiling

**Visual Regression** (Future):
- Screenshot comparisons
- Cross-browser visual consistency

## Resources

**Vitest Documentation**: https://vitest.dev/
**Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
**CI/CD Guide**: `3-projects/5-software/metadj-nexus/docs/operations/BUILD-DEPLOYMENT-GUIDE.md`

---

**Remember**: Tests are the foundation of production confidence. Every feature should have corresponding test coverage. When in doubt, add a test.
