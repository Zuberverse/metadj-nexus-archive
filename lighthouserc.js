/**
 * Lighthouse CI Configuration
 *
 * Performance budgets aligned with MetaDJ Nexus targets:
 *   - LCP < 2.5s
 *   - INP < 200ms (replaces deprecated FID < 100ms)
 *   - CLS < 0.1
 *   - Main bundle JS < 150KB
 *
 * @see https://github.com/GoogleChrome/lighthouse-ci
 */

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      startServerCommand: 'npm run start -- -p 3000',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        // Throttling is handled by Lighthouse defaults for the preset.
        // Override only if CI runners produce inconsistent results.
        budgetPath: './budget.json',
      },
    },
    assert: {
      assertions: {
        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],

        // Category scores (0-1 scale)
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      // Use temporary public storage for PR comments and artifacts.
      // Switch to a LHCI server for persistent historical tracking.
      target: 'temporary-public-storage',
    },
  },
};
