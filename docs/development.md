# Development and verification

## Setup

Use Node 20 from `.nvmrc` and npm from the root manifest.

```sh
nvm use
npm ci
npm run dev
```

## Quality commands

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:dry-run
npm run test:consumer
npm run test:e2e
```

- `test:consumer` builds package tarballs, installs them into the isolated Vite consumer, then type-checks and builds it.
- `test:ci:e2e` is the focused Chromium suite used by CI; `test:e2e` runs the configured local suite.
- `build:pages` builds with `/brnchly/` and creates a static-host `404.html` fallback.

Generated `dist`, coverage, Playwright reports/results, local logs, and profiling output outside committed baselines must not be committed.

## Performance profiling

Two layers are intentionally separate:

- `src/performance/benchmarks.test.ts` profiles algorithms in Node/Vitest.
- `e2e/performance.spec.ts` profiles the real React/SVG graph with deterministic 100, 500, and 1,000-node graphs in Chromium.

```sh
npm run profile:chromium
npm run profile:production
```

The browser harness uses one worker, reduced motion, fixed graph generation, and click-to-two-animation-frame measurements. It records raw samples, median/p95, environment details, frame intervals, long tasks when supported, and optional Chromium heap point samples. It does not isolate synchronous layout from renderer commits and does not prove GPU raster or memory-leak behavior.

Performance is non-gating and hardware/browser sensitive. Compare like-for-like environments and retain raw data. Current committed baselines and methodology evidence are under `artifacts/performance/`; `phase-5-production-preview.json` is the latest production-preview snapshot. Large-graph frame/long-task variability remains a known limitation rather than a passed budget.

## Browser constraints

Playwright may be blocked by the macOS/Zed sandbox when Chromium cannot register required Mach services. Do not add unsafe browser flags to bypass it. Report the browser check as blocked or run it in an approved environment.

## Documentation rules

Public documentation is English. Examples must use package-root exports, include the required `GraphRenderer` layout and stylesheet, and avoid claims about npm publication, CI, Pages, browser support, accessibility, or performance unless backed by current evidence.
