# Contributing to MetaDJ Nexus

**Last Modified**: 2026-01-26 00:00 EST

Thank you for your interest in contributing to MetaDJ Nexus. This guide covers the development workflow, code standards, and submission process.

## Quick Start

### Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm (comes with Node.js)
- Git

**Verify your environment:**
```bash
node -v    # Should output v20.19.0 or higher
npm -v     # Should output 10.x or higher
git --version
```

### Development Setup

```bash
# Clone the repository
git clone git@github.com:Zuberverse/metadj-nexus.git metadj-nexus
cd metadj-nexus

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env.local
# Edit .env.local with your values (see Environment Setup below)

# Verify the setup
npm run type-check   # Should pass with no errors
npm run lint         # Should pass with 0 warnings

# Start development server
npm run dev

# First-time E2E setup (optional, for running Playwright tests)
npx playwright install
```

### Environment Setup

At minimum, configure these in `.env.local`:

```bash
# Required for AI features
OPENAI_API_KEY=sk-...

# Optional: Additional AI providers
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
XAI_API_KEY=...
```

See `.env.example` for all available options with detailed descriptions.

### Documentation Map

Key doc folders:
- Feature specs: `docs/features/`
- Reference docs: `docs/reference/`

### Common Setup Issues

| Issue | Solution |
|-------|----------|
| `npm install` fails | Clear cache: `rm -rf node_modules package-lock.json && npm install` |
| Port 8100 in use | Use a different port: `PORT=8101 npm run dev` |
| SSL certificate errors | Use HTTP fallback: `npm run dev:http` |
| TypeScript errors on fresh clone | Run `npm run type-check` to verify, then `npm run build` |

### Development Server Options

```bash
npm run dev          # Turbopack dev + HTTPS (default)
npm run dev:webpack  # Webpack dev + HTTPS (most stable)
npm run dev:http     # HTTP fallback
npm run dev:replit   # Replit port 5000
```

## Code Standards

### Required Reading

Before contributing, review these core documents:

1. **[NAMING-CONVENTIONS.md](docs/NAMING-CONVENTIONS.md)** — File naming, component naming, terminology
2. **[CLAUDE.md](CLAUDE.md)** — Development standards and AI integration
3. **[README.md](README.md)** — Project overview and installation

### Key Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **React**: Functional components with hooks, use Context providers
- **Styling**: Tailwind CSS with OKLCH color tokens from `globals.css`
- **Naming**: PascalCase for components, kebab-case for utilities
- **Terminology**: Use "feature" not "module"; use collection terminology for releases

### Pre-Commit Checklist

Before committing, ensure:

```bash
npm run lint          # ESLint (must pass with 0 warnings)
npm run type-check    # TypeScript (must pass)
npm run test          # Vitest (must pass)
npm run build         # Production build (must succeed)
```

## Pull Request Process

### 1. Create a Branch

Use the following branch naming conventions:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/add-playlist-export` |
| Bug fix | `fix/short-description` | `fix/queue-persistence-bug` |
| Documentation | `docs/short-description` | `docs/update-api-reference` |
| Refactoring | `refactor/short-description` | `refactor/consolidate-contexts` |
| Performance | `perf/short-description` | `perf/optimize-audio-loading` |

**Naming rules:**
- Use lowercase letters and hyphens only
- Keep descriptions concise (2-4 words)
- Reference issue numbers when applicable: `fix/123-queue-bug`

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Follow code standards above
- Update documentation alongside code changes
- Add tests for new functionality

### 3. Update Documentation

**MANDATORY**: Documentation must be updated with code changes.

- Update relevant docs in `docs/features/`
- Update `CHANGELOG.md` (Unreleased section)
- Update docs in `docs/reference/` if hooks/contexts change
- See `docs/reference/code-to-docs-map.md` for where to document changes

### 4. Run Quality Checks

```bash
npm run lint && npm run type-check && npm run test && npm run build
```

All checks must pass before submitting.

### 5. Submit PR

Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) which includes:

- Type of change (feature, fix, refactor, etc.)
- Description of changes
- Testing checklist
- Accessibility checklist

## Testing

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Writing Tests

- Place unit tests in `tests/` mirroring the `src/` structure
- Use Vitest for unit/integration tests
- Follow Arrange-Act-Assert pattern
- See `docs/TESTING.md` for full testing guide

## Code Review Expectations

PRs will be reviewed for:

- [ ] Code follows naming conventions
- [ ] TypeScript types are accurate (no `any` abuse)
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No console.log statements (use logger)
- [ ] Accessibility considerations addressed
- [ ] No security vulnerabilities introduced

## Reporting Issues

Use GitHub Issues with the bug report template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

## Getting Help

- Check existing documentation in `docs/`
- Review `CHANGELOG.md` for recent changes
- Open a GitHub Discussion for questions

---

**Note**: MetaDJ Nexus is primarily developed by a solo founder with AI assistance. Contributions that include clear documentation and follow established patterns are especially appreciated.
