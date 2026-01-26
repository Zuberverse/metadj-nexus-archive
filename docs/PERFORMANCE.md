# Performance Benchmarks & Guidelines

> Performance targets and measurement guidelines for MetaDJ Nexus.

**Last Modified**: 2026-01-26 15:10 EST

## Core Web Vitals Targets

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** | < 2.5s | Largest Contentful Paint - main content visible |
| **FID** | < 100ms | First Input Delay - time to interactivity |
| **CLS** | < 0.1 | Cumulative Layout Shift - visual stability |
| **FCP** | < 1.8s | First Contentful Paint - first content rendered |
| **TTI** | < 3.9s | Time to Interactive - fully interactive |
| **TBT** | < 200ms | Total Blocking Time - main thread blocking |

## Bundle Size Budgets

### JavaScript
| Bundle | Budget | Current |
|--------|--------|---------|
| Main bundle | < 150KB | Monitor |
| First load JS | < 100KB | Monitor |
| Per-route chunks | < 50KB | Monitor |

### Images
| Type | Budget | Format |
|------|--------|--------|
| Hero images | < 200KB | WebP |
| Thumbnails | < 20KB | WebP |
| Icons | SVG preferred | - |

## Runtime Performance

### Audio Playback
| Metric | Target |
|--------|--------|
| Time to first play | < 2s |
| Track transition gap | < 500ms |
| Buffer underruns | 0 |

### API Response Times
| Endpoint | Target |
|----------|--------|
| `/api/metadjai/*` | < 2s (streaming start) |
| `/api/daydream/*` | < 3s |
| Static assets | < 100ms |

### Client-Side
| Metric | Target |
|--------|--------|
| React render time | < 16ms (60fps) |
| State updates | < 50ms |
| Animation jank | None (60fps) |

## Measurement Tools

### Lighthouse
```bash
# Run Lighthouse audit
npx lighthouse https://metadjnexus.ai --view

# CI/CD integration
npx lighthouse-ci autorun
```

### Web Vitals
Runtime Web Vitals reporting is not wired by default. Use Lighthouse/DevTools for measurement, or add a client-side `web-vitals` reporter if you need analytics telemetry.

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

### Performance Profiling
1. Chrome DevTools > Performance tab
2. Record page load or interaction
3. Analyze flame chart and metrics

## Optimization Strategies

### Code Splitting
- Use dynamic imports for heavy components
- Route-based splitting (automatic in Next.js)
- Lazy load below-fold content
- Avoid `ssr: false` for above-the-fold shells; it forces skeleton-only HTML on refresh and can increase CLS (prefer SSR + lightweight, stable fallbacks).
- Cinema visualizers are split per style via `next/dynamic` in `src/components/cinema/Visualizer2D.tsx` and `src/components/cinema/Visualizer3D.tsx` to keep the initial bundle lean.

```typescript
// Example: Lazy load heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
})
```

### Adaptive View Mounting
- Home surfaces use capability-based mounting (`src/hooks/home/use-view-mounting.ts`).
- **Eager tier**: Keep Hub/Wisdom/Journal mounted for no-flicker switching.
- **Balanced tier**: Mount active view + Hub, then idle-mount Wisdom/Journal to warm navigation.
- **Lazy tier**: Mount Hub + active view; Wisdom/Journal mount on demand to reduce initial CPU/memory.

### Image Optimization
- Use Next.js `<Image>` component
- Specify width/height to prevent CLS
- Use appropriate format (WebP/AVIF)
- Implement lazy loading

```typescript
import Image from 'next/image'

<Image
  src="/collection-art.webp"
  width={300}
  height={300}
  alt="Collection artwork"
  priority={isAboveFold}
/>
```

### Caching Strategy
| Resource | Cache Duration |
|----------|----------------|
| Static assets | 1 year (immutable) |
| API responses | Varies by endpoint |
| Audio files | 1 week |
| Page data | 1 hour (revalidate) |

### Memory Management
- Clean up event listeners
- Dispose Three.js resources
- Clear intervals/timeouts
- Manage WebRTC connections

## Performance Optimization Setup (Platform Breakdown)

This section documents the **current performance system** and how it behaves by device class, OS, and browser. It reflects **actual runtime guards** in the codebase.

### Automatic Performance Tiering (All Platforms)

**Where**: `src/hooks/home/use-view-mounting.ts`  
**Signals**:
- `prefers-reduced-motion`
- `navigator.connection.saveData`
- `navigator.connection.effectiveType` (slow-2g/2g/3g)
- `navigator.deviceMemory <= 4`
- `navigator.hardwareConcurrency <= 4`

**Behavior**:
- **Lazy tier** on low-end signals (reduces mounted views to minimize CPU/memory).
- **Balanced tier** for mid-range devices.
- **Eager tier** for high-capability devices (keeps Hub/Wisdom/Journal warm for fast switching).

### Cinema Performance Mode (All Platforms)

**Where**: `src/components/cinema/CinemaOverlay.tsx`  
**Triggers**:
- Low-end device detection (low cores/memory or Save-Data).
- Low FPS detection from visualizers.

**Behavior**:
- Performance mode lowers GPU/CPU load (lighter shaders, lower DPR, reduced particle counts).
- Mobile **always** runs performance mode (`shouldUseSidePanels` is false).

### Desktop vs Mobile Defaults

| Device Class | Defaults | Notes |
|-------------|----------|-------|
| Desktop (macOS/Windows) | Full UI + 3D/2D visualizers | 3D visualizers available; auto performance mode if low-end signals are detected |
| Mobile (iOS/Android) | 2D visualizers + video scenes | 3D visualizers hidden to protect GPU/battery; performance mode forced |

### Browser & OS Guidance (Performance-Focused)

| OS | Browser | Default Experience | Performance Notes |
|----|---------|--------------------|-------------------|
| macOS | Chrome/Edge | Full (3D+2D) | Best overall GPU throughput; performance mode kicks in on low-end hardware |
| macOS | Safari | Full (3D+2D) | Performance mode recommended if fans spike or FPS drops |
| macOS | Firefox | Full (3D+2D) | If WebGL jank appears, toggle to 2D scenes |
| Windows | Chrome/Edge | Full (3D+2D) | Default target browser; use performance mode on low-end laptops |
| Windows | Firefox | Full (3D+2D) | Prefer 2D scenes on integrated GPUs |
| iOS | Safari/Chrome | 2D + video only | Mobile performance mode is always on; 3D visualizers are hidden |
| Android | Chrome/Firefox | 2D + video only | Mobile performance mode is always on; avoid heavy Dream overlay on weak devices |

### Practical Tuning Checklist

- **Visualizers**: Prefer 2D visualizers on low-end devices; 3D only when FPS is stable.
- **Dream overlay**: Only enable on strong GPUs; it is optional and can be paused at any time.
- **Network**: On slow connections, reduce concurrent loads (avoid large video scene swaps).
- **Reduced motion**: Respect system settings; the app shifts to performance mode automatically.

### Performance Guardrails (Code References)

- **Auto performance mode**: `src/components/cinema/CinemaOverlay.tsx` + `src/components/cinema/VisualizerCinema.tsx`
- **Device tiering**: `src/hooks/home/use-view-mounting.ts`
- **3D visualizer gating**: `src/components/cinema/CinemaOverlay.tsx` (desktop-only)
- **DPR clamping**: 2D visualizers clamp device pixel ratio for performance

## Monitoring

### What to Monitor
1. **Core Web Vitals** - User experience metrics
2. **Error rates** - JavaScript errors, API failures
3. **API latency** - Response times by endpoint
4. **Bundle size** - Track over time
5. **Memory usage** - Client-side memory

### Alerting Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| LCP | > 3s | > 5s |
| Error rate | > 1% | > 5% |
| API p95 | > 3s | > 10s |

## Performance Checklist

### Before Deploy
- [ ] Bundle size within budget
- [ ] No render-blocking resources
- [ ] Images optimized
- [ ] Lighthouse score > 90

### Weekly Review
- [ ] Check Core Web Vitals trends
- [ ] Review error rates
- [ ] Monitor bundle size growth

### Monthly Audit
- [ ] Full Lighthouse audit
- [ ] Dependency size review
- [ ] Performance profiling session

## Known Performance Considerations

### Cinema Rendering (Three.js + HTML canvas)
- Heavy GPU usage during Cinema visualization
- Implement quality settings for low-end devices
- Pause rendering when Cinema is not visible

### Audio Streaming
- Preload next track in queue
- Use appropriate buffer sizes
- Handle network interruptions gracefully

### AI Features
- Streaming responses for perceived speed
- Rate limiting to manage costs
- Graceful degradation on slow connections

## Improvement Roadmap

### Quick Wins
- [ ] Enable static asset compression
- [ ] Optimize font loading (font-display: swap)
- [ ] Add resource hints (preconnect, prefetch)

### Medium-Term
- [ ] Implement service worker for offline support
- [ ] Add edge caching for static content
- [ ] Optimize Three.js initialization

### Long-Term
- [ ] Progressive Web App (PWA) support
- [ ] WebAssembly for compute-heavy tasks
- [ ] Advanced caching strategies

---

## Appendix: Testing Commands

```bash
# Build and analyze
npm run build

# Run Lighthouse
npx lighthouse https://metadjnexus.ai --output html --output-path ./lighthouse-report.html

# Check bundle size
npx source-map-explorer .next/static/chunks/*.js

# Profile memory
# Use Chrome DevTools > Memory tab
```
