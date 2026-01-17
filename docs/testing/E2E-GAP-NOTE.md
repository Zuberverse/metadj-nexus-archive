# E2E Test Coverage — Gap Note

**Last Modified**: 2026-01-16 22:18 EST

MetaDJ Nexus ships Playwright smoke + core flow tests (home load + `/api/health`, search → queue add, MetaDJai panel open/close, cinema view toggle) across Chromium/Firefox/WebKit + mobile. Full browser-based journeys (playback + AI responses + persistence edge cases) are still a gap. Playwright is CI-gated via `.github/workflows/ci.yml` (runs `npm run test:e2e`).

Integration-heavy roots (CinemaOverlay, HomePageClient, MetaDjAiChat) and 3D visualizers are excluded from unit coverage; expand E2E coverage to protect those paths.

When to add E2E:
- After next major release or before public launch with heavier traffic.
- To guard regressions across: landing → play/queue → cinema → MetaDJai interactions.
- When adding auth/payments or multi-step flows.

If expanding:
1) Use Playwright with seeded data (collections/tracks JSON) and mocked media/AI to avoid network costs.
2) Cover sanity flows: load hub, search and play track, queue add/reorder, toggle cinema, invoke MetaDJai prompt with mocked tool response, verify a11y landmarks.
3) When CI is configured, run headless on push/PR via `npm run test:ci`; gate deployments optionally.

Until then, rely on current integration + accessibility tests and manual smoke checks.
