# MetaDJai Mode Toggle Archive Notes

**Last Modified**: 2026-02-11 19:29 EST

**Date**: 2025-12-19
**Scope**: Explorer/DJ mode toggle UI removal

## Summary
- The Explorer/DJ toggle was removed from the MetaDJai toolbar in favor of a single adaptive experience.
- The model selector dropdown remains; model switches are marked in-chat with a full-width separator.
- The backend still supports `mode` in context for adaptive behavior, but the UI no longer exposes mode labels.

## Previous UI Locations
- Toolbar toggle: `src/components/metadjai/MetaDjAiChat.tsx`
- Mode switch separators: `src/hooks/use-metadjai.ts` and `src/components/metadjai/MetaDjAiMessageItem.tsx`

## Restore Notes
If reintroducing explicit modes:
1. Re-add the mode toggle UI in `src/components/metadjai/MetaDjAiChat.tsx` and wire to a mode state setter.
2. Re-enable mode switch separator rendering in `src/components/metadjai/MetaDjAiMessageItem.tsx`.
3. Insert mode switch markers in `src/hooks/use-metadjai.ts` (mirror the model-switch pattern).
4. Update guide copy and docs: `src/lib/content/metaDjNexusGuideCopy.ts`, `docs/features/panel-system.md`, `docs/features/user-guide-system.md`.

## Current Behavior
MetaDJai adapts automatically: creative companion by default, DJ-first when users ask about music, playback, or playlists. No mode labels are shown in the UI.
