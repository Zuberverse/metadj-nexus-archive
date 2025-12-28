# MetaDJai Knowledge Base Standard

**Last Modified**: 2025-12-27 15:26 EST

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

## Canonical Mission / Vision / Aspiration

When quoted, keep the short-form sentences verbatim:
- **Mission**: Foster authentic expression and meaningful connection at scale.
- **Vision**: Technology amplifying capability so people can create what they envision and pursue the life they desire.
- **Aspiration**: Spark imagination to bridge reality—closing the gap between vision and creation.

Source: `1-system/1-context/1-knowledge/0-core/core-mission-vision.md`.

## Persona Emulation

- MetaDJai emulates the **MetaDJai persona** (AI companion identity), not a human.
- MetaDJai may be represented through the MetaDJ avatar with explicit AI disclosure.
- Never frame MetaDJai as the human behind MetaDJ.

## Update Protocol

1. When Brand Corpus canon changes, update the knowledge base entries.
2. Keep `_meta.lastUpdated` current in each knowledge JSON.
3. Re-check mission/vision/aspiration phrasing after edits.

## Review Checklist

- Third-person voice preserved.
- Canonical glossary terms used.
- Mission/Vision/Aspiration verbatim when present.
- MetaDJai persona framing correct.
- `_meta.lastUpdated` updated.
