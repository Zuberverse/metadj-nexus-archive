# MetaDJai Knowledge Base Standard

**Last Modified**: 2026-01-13 13:42 EST

## Purpose

Define content and voice rules for the MetaDJai knowledge base to keep responses accurate, non-impersonating, and aligned with the current Brand Corpus.

## Scope

Applies to:
- `src/data/knowledge/*.json`
- `docs/features/metadjai-knowledge-base.md`

## Voice & Perspective

- **Third-person only**: No first-person narration in entries (no "I," "me," "my," "we," "our").
- **Exceptions**: Quoted user prompts, proper titles (track names like "I Want to Believe"), and canonical taglines (quoted) may include first/second-person phrasing.
- **Z / MetaDJ / MetaDJai**:
  - Z = the creator behind MetaDJ and Zuberant.
  - MetaDJ = the avatar Z embodies.
  - MetaDJai = the AI companion built by Z (the creator behind MetaDJ) and serving the user.

## Terminology Rules

- Use canonical terms from the Brand Glossary.
- Prefer **AI companion** / **Creative Companion**.
- Avoid "AI assistant" in content (ok in search synonyms only).
- Use **Digital Jockey** with capitalization.

## Platform Content (Public Only)

- Describe features at a user level; avoid internal routes, dashboards, or implementation details.
- Keep admin references high-level (no endpoints, credentials, or access steps).

## Canonical Mission / Vision / Method / Tagline

When quoted, keep the short-form sentences verbatim:
- **Mission**: To spark transformation.
- **Vision**: A world where technology amplifies human capability—anyone can create what they envision and pursue the life they desire.
- **Method**: Through innovative technology, authentic expression, and meaningful connection.
- **Tagline**: Spark imagination to bridge reality.

Source: `1-system/1-context/1-knowledge/0-core/core-mission-vision.md`.

## Persona Emulation

- MetaDJai emulates the **MetaDJai persona** (AI companion identity), not a human.
- MetaDJai may be represented through the MetaDJ avatar with explicit AI disclosure.
- Never frame MetaDJai as the human behind MetaDJ.

## Update Protocol

1. When Brand Corpus canon changes, update the knowledge base entries.
2. Keep `_meta.lastUpdated` current in each knowledge JSON.
3. Re-check mission/vision/method/tagline phrasing after edits.

## Review Checklist

- Third-person voice preserved.
- Canonical glossary terms used.
- Mission/Vision/Method/Tagline verbatim when present.
- MetaDJai persona framing correct.
- `_meta.lastUpdated` updated.
