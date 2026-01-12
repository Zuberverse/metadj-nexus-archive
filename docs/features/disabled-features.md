# Disabled Features

**Last Modified**: 2026-01-11 12:23 EST

Canonical list of features that exist in code but are disabled in the current MetaDJ Nexus build.

## Mood Channels (disabled)

- Status: Disabled via `FEATURE_MOOD_CHANNELS` in `src/lib/app.constants.ts`.
- Reason: Catalog size and per-channel depth must meet activation criteria.
- Integration status: UI list not surfaced yet; data + scoring logic are staged.
- Re-enable criteria:
  1. 50+ tracks overall (not met; current catalog is 10 tracks).
  2. 10+ tracks per channel (validate).
  3. Update `src/data/moodChannels.ts` assignments if needed.
  4. Set `FEATURE_MOOD_CHANNELS = true` and validate Left Panel UX.
