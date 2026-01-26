# Changelog Standard

**Last Modified**: 2026-01-26 00:00 EST

> **Consistent version history documentation for MetaDJ Nexus**

---

## Overview

MetaDJ Nexus follows [Keep a Changelog](https://keepachangelog.com/) format with [Semantic Versioning](https://semver.org/). This standard ensures consistent, scannable, and meaningful version documentation.

---

## File Location & Format

**File**: `../../CHANGELOG.md` (root directory, all caps)

**Header**:
```markdown
# Changelog

**Last Modified**: YYYY-MM-DD HH:MM EST

All notable changes to MetaDJ Nexus are documented here.
Format follows Keep a Changelog, with semantic versioning for public releases.
```

---

## Version Numbering

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

| Component | When to Increment | Examples |
|-----------|-------------------|----------|
| **MAJOR** | Breaking changes, major redesigns | 1.0.0, 2.0.0 |
| **MINOR** | New features, significant enhancements | 0.8.0, 0.9.0 |
| **PATCH** | Bug fixes, minor improvements | 0.9.1, 0.9.2 |

### Pre-1.0 Development

During pre-1.0 development:
- **MINOR** versions (0.1 → 0.9) represent major milestones
- **PATCH** versions represent incremental progress toward next milestone
- Target ~2-week cadence between minor versions

### Milestone Naming

Each minor version should have a descriptive milestone name:

```markdown
## [0.9.0] - 2025-12-11 — Public Preview
## [0.8.0] - 2025-12-01 — Feature Complete
## [0.7.0] - 2025-11-15 — Visual System
```

**Milestone name conventions**:
- 2-3 words describing the primary focus
- Title case
- Reflects the theme of accumulated changes

---

## Entry Structure

### Unreleased Section

Active development goes under `[Unreleased]` with date subsections:

```markdown
## [Unreleased]

### YYYY-MM-DD

**Category Name**
- Change description
- Another change

**Another Category**
- More changes
```

### Date-First Grouping

Within `[Unreleased]`, group by date (newest first):

```markdown
### 2025-12-20

**Fixes**
- Description

### 2025-12-19

**Features**
- Description
```

### Themed Categories

Use bold headers for thematic grouping within each date:

| Category | Use For |
|----------|---------|
| **Features** | New functionality |
| **Enhancements** | Improvements to existing features |
| **Fixes** | Bug fixes and corrections |
| **Documentation** | Docs-only changes |
| **Infrastructure** | Build, deploy, CI/CD changes |
| **Security** | Security improvements |
| **Performance** | Speed/efficiency improvements |
| **Accessibility** | A11y improvements |
| **Testing** | Test coverage changes |

**Feature-specific categories** (when changes are substantial):
- **MetaDJai Enhancements**
- **Cinema & Visuals**
- **Dream Feature**
- **Navigation & Accessibility**
- **Voice & Transcription**

---

## Writing Guidelines

### Entry Format

- Start with past-tense verb or noun phrase
- Be specific but concise
- Include file/component names for technical clarity
- Group related changes into sub-bullets when appropriate

**Good**:
```markdown
- Chat scroll behavior: Initial load scrolls to bottom; toggle preserves position
- Added `src/proxy.ts` entrypoint for CSP and rate limit application
```

**Avoid**:
```markdown
- Fixed bug
- Made changes to chat
- Updated stuff
```

### Consolidation Rules

When consolidating granular entries:

1. **Group by theme**: Related fixes become one entry with sub-points
2. **Preserve specificity**: Keep technical details that aid debugging
3. **Remove redundancy**: Merge "added X" + "fixed X" into one entry
4. **Maintain chronology**: Within dates, order by impact (features → fixes → docs)

**Before** (granular):
```markdown
- Fixed chat scroll on initial load
- Fixed chat scroll on toggle
- Added retry logic for DOM element finding
- Fixed scroll position tracking
```

**After** (consolidated):
```markdown
- **Chat scroll behavior**: Initial load scrolls to bottom; toggle preserves position; retry logic for DOM element finding; consistent position tracking
```

---

## Version Release Process

### Cutting a Release

1. Move accumulated `[Unreleased]` entries to new version section
2. Add version header with date and milestone name
3. Consolidate granular entries into themed groups
4. Update version links at file bottom
5. Update `package.json` version to match

### Version Header Format

```markdown
## [X.Y.Z] - YYYY-MM-DD — Milestone Name

### Category
- Consolidated change descriptions

### Another Category
- More changes
```

### Version History Links

Maintain comparison links at file bottom:

```markdown
---

## Version History

- **0.9.0** (2025-12-11): [Public Preview](https://github.com/org/repo/compare/v0.8.0...v0.9.0)
- **0.8.0** (2025-12-01): [Feature Complete](https://github.com/org/repo/compare/v0.7.0...v0.8.0)
```

---

## Examples

### Typical Daily Entry

```markdown
### 2025-12-20

**Infrastructure**
- Confirmed `src/proxy.ts` entrypoint for CSP and rate limits (Next.js proxy convention)

**Fixes**
- Dynamic background now honors reduced-motion preference on initial load

**Documentation**
- README accuracy: Coverage thresholds aligned with current config
```

### Release Version Entry

```markdown
## [0.9.0] - 2025-12-11 — Public Preview

### Core Experience
- Hub surface redesign with improved navigation and visual hierarchy
- User Guide overlay refresh with streamlined onboarding flow
- Mobile-responsive layouts across all views

### MetaDJai
- Multi-provider support: GPT, Gemini, Claude, Grok with automatic failover
- Voice input with real-time transcription
- Contextual awareness of playing music and active view

### Infrastructure
- Distributed rate limiting with Upstash fallback
- AI response caching for repeated queries
- Replit-first deployment optimization
```

---

## Maintenance

### Update Frequency

- **Daily**: Add entries for meaningful changes
- **Weekly**: Review for consolidation opportunities
- **Pre-release**: Full consolidation pass before cutting version

### Timestamp Updates

Update `**Last Modified**` header whenever entries are added or modified.

### Archive Policy

Changelog stays in main file. For historical reference beyond current development cycle, older versions can be summarized with links to git tags.

---

## Quick Reference

```
File: ../../CHANGELOG.md
Format: Keep a Changelog + Semantic Versioning
Structure: [Unreleased] → ### Date → **Category** → entries
Versioning: MAJOR.MINOR.PATCH with milestone names
Cadence: ~2 weeks between minor versions (pre-1.0)
Links: Version comparison URLs at file bottom
```

---

**Navigation**: [Back to standards/](./README.md)
