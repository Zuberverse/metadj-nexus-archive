# E2E Test Coverage — Gap Note

**Last Modified**: 2025-12-29 12:01 EST

MetaDJ Nexus ships Playwright smoke + core flow tests (home load + `/api/health`, search → queue add, MetaDJai panel open/close). Full browser-based journeys (navigation + playback + AI + cinema) are still a gap, and browsers are not CI-gated yet.

When to add E2E:
- After next major release or before public launch with heavier traffic.
- To guard regressions across: landing → play/queue → cinema → MetaDJai interactions.
- When adding auth/payments or multi-step flows.

If expanding:
1) Use Playwright with seeded data (collections/tracks JSON) and mocked media/AI to avoid network costs.
2) Cover sanity flows: load hub, search and play track, queue add/reorder, toggle cinema, invoke MetaDJai prompt with mocked tool response, verify a11y landmarks.
3) Run headless in CI on push/PR; gate deployments optionally.

Until then, rely on current integration + accessibility tests and manual smoke checks.
