# User Guide Update Standard

**Last Modified**: 2026-01-26 00:00 EST
## Purpose

This standard ensures the MetaDJ Nexus User Guide remains synchronized with feature releases. Every new feature, UI change, or capability addition must be reflected in the user guide to maintain accurate user documentation.

## Scope

Applies to all files that comprise the User Guide system:
- `src/lib/content/meta-dj-nexus-guide-copy.ts` — Primary guide content
- `src/components/guide/UserGuideOverlay.tsx` — Guide UI component
- `src/components/guide/MetaDJNexusGuide.tsx` — Full guide page component

## Update Triggers

The User Guide MUST be updated when any of the following occur:

### Mandatory Updates
1. **New Feature Implementation** — Any user-facing feature (e.g., Mood Channels)
2. **UI/UX Changes** — Navigation changes, new controls, panel modifications
3. **New Keyboard Shortcuts** — Any new hotkey or shortcut
4. **Cinema/Virtualizer Additions** — New scenes, visualizers, or visual modes
5. **MetaDJai Capability Changes** — New tools, conversation features, session/history behavior
6. **Playback Feature Changes** — Queue behavior, playlist features, playback controls
### Optional Updates
- Copy improvements for clarity
- Screenshot/example updates
- Minor UI polish descriptions

## Update Checklist

Before any feature release (version bump), verify:

```markdown
## User Guide Update Checklist

### Content Updates (`meta-dj-nexus-guide-copy.ts`)
- [ ] GUIDE_QUICK_START — Does the quick start reflect new features?
- [ ] GUIDE_CORE_SURFACES — Are all core surfaces accurately described?
- [ ] GUIDE_COLLECTIONS — Are collection descriptions current?
- [ ] GUIDE_METADJAI — Does MetaDJai section reflect current capabilities?
- [ ] GUIDE_ACCOUNT — Are account and feedback details accurate?
- [ ] GUIDE_QUEUE — Are queue features up to date?
- [ ] GUIDE_SEARCH — Are search capabilities current?
- [ ] GUIDE_SHORTCUTS — Are all keyboard shortcuts listed?

### Component Updates
- [ ] User Guide Overlay — Navigation sections current?
- [ ] MetaDJ Nexus Guide Page — All sections rendering?

### Cross-Reference
- [ ] README.md features match guide features
- [ ] ../../CHANGELOG.md features reflected in guide
```

## Content Structure Standards

### Feature Descriptions
Each feature in the guide should include:
1. **Title** — Clear, concise name
2. **Description** — Brief explanation of what it does
3. **How to Access** — Button location, keyboard shortcut, or navigation path
4. **Key Capabilities** — Bullet list of main functions (3-6 items)

### Example Format
```typescript
{
  title: "Feature Name",
  description: "Brief explanation of what this feature does and why it matters.",
  features: [
    "Capability 1 — specific action or benefit",
    "Capability 2 — specific action or benefit",
    "Capability 3 — specific action or benefit",
  ]
}
```

## Version Mapping

Maintain a mapping of features to guide sections:

| Feature | Guide Section | Added Version |
|---------|--------------|---------------|

| Recently Played (Library) | GUIDE_CORE_SURFACES (Music) | v0.9.20 |
| Mood Channels | GUIDE_CORE_SURFACES (Music) | v0.9.20 |
| Audio-Reactive Visualizers | GUIDE_CORE_SURFACES (Cinema) | v0.9.20 |
| Video Scene Library | GUIDE_CORE_SURFACES (Cinema) | v0.9.20 |
| Adaptive DJ-first Flow (no mode toggle) | GUIDE_METADJAI | v0.9.46 |
| Model Selector (GPT/Gemini/Claude/Grok) | GUIDE_METADJAI | v0.9.46 |
| Account Panel (email/password/feedback) | GUIDE_ACCOUNT | v0.10.0 |
| Active Control Proposals | GUIDE_METADJAI | v0.8.0 |
| Hybrid Knowledge Retrieval | GUIDE_METADJAI | v0.8.0 |
| Production Details | GUIDE_CORE_SURFACES (Music) | v0.9.20 |
| MetaDJai Knowledge Base | GUIDE_METADJAI | v0.9.28 |
| WCAG 2.1.4 Keyboard Shortcuts | GUIDE_SHORTCUTS | v0.9.30 |

## Integration with Release Process

### Pre-Release
1. Review CHANGELOG for all features being released
2. Complete User Guide Update Checklist
3. Update `meta-dj-nexus-guide-copy.ts` with new content
4. Update component if navigation sections changed
5. Test guide renders correctly

### Post-Release
1. Verify guide accessible in production
2. Check all sections navigate correctly
3. Validate MetaDJai can reference new features

## MetaDJai Awareness

MetaDJai's system instructions include platform feature awareness. When guide content changes significantly:

1. Update `src/lib/ai/meta-dj-ai-prompt.ts` if core features change
2. Ensure MetaDJai can answer questions about new features
3. Add new features to the `<core_instructions>` section if they're navigational

## Responsibility

- **Feature Developer**: Update guide content as part of feature PR
- **Code Reviewer**: Verify guide updates included in feature PRs
- **Pre-Release QA**: Run User Guide Update Checklist

## Enforcement

During code review, check:
1. Does this PR add user-facing features?
2. If yes, does it include guide content updates?
3. If guide updates missing, request them before merge

## Related Documents

- `../../CHANGELOG.md` — Version history
- `README.md` — Project overview
- `docs/features/` — Feature specifications
- `../../CLAUDE.md` — Development standards
