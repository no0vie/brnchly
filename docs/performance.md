# Chromium graph performance profiling

This remains the canonical performance document for Phase 5. The retained development artifacts are unchanged, and the separately generated production-preview artifact is documented below.

The repository has two intentionally separate performance layers:

- `src/performance/benchmarks.test.ts` profiles graph algorithms in Node/Vitest. Those numbers do **not** represent browser rendering.
- `e2e/performance.spec.ts` profiles the real React/SVG graph in Playwright Chromium through the isolated `?perf=100|500|1000` harness.

Neither suite enforces timing gates, and the general CI workflow does not run performance profiling. Performance varies substantially by hardware, browser build, thermal state, headless mode, and background load.

## Run

```sh
npm run profile:chromium
```

The default is three samples for each deterministic 100, 500, and 1,000-node graph. Override the sample count for a more stable local baseline:

```sh
PERF_SAMPLES=10 npm run profile:chromium
```

The test uses only the `chromium` Playwright project, one worker, a 1440 × 900 viewport, reduced motion, and a fresh browser context per graph size. Playwright starts the existing Vite server according to `playwright.config.ts`. For release baselines, use `npm run profile:production`, which builds the application and serves it through `vite preview` using `playwright.production.config.ts`. Development React/Profiler overhead means the default command is best for comparison with the retained development baseline, not end-user absolute latency.

On success, Playwright attaches `performance-report.json` under that run's `test-results/` output directory. The JSON contains raw samples, median, nearest-rank p95, node/edge counts, Chromium version, headless status, OS/architecture, CPU count, host memory, Node version, user agent, viewport methodology, and support status for optional APIs.

The deterministic graph generator is `src/performance/graphGenerator.ts`. A fixed seed and size produce equivalent graph data; its unit/algorithm tests guard this property.

## Metrics and boundaries

All action measurements begin immediately before the real DOM control dispatch and end after two `requestAnimationFrame` callbacks. They therefore represent click-to-post-frame latency, not isolated JavaScript function time.

| Metric               | Measurement                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial render       | Navigation start to the harness readiness mark after the graph commit and two frames. Includes navigation/dev-server work, so compare only like-for-like runs.                                                                      |
| Layout exposure      | **Unsupported.** Layout executes synchronously inside renderer memoization and cannot be isolated without modifying renderer core, which this harness deliberately avoids. Node/Vitest has a separate algorithmic layout benchmark. |
| SVG edge rendering   | Clears all edges, restores the deterministic edge set, then waits two frames. Includes the React graph update, routing, DOM/SVG creation, style, layout, and presentation; it is not pure SVG paint time.                           |
| Fit, pan, zoom       | Drives the existing toolbar/viewport controls and measures through two frames. Reduced motion removes transition-duration noise.                                                                                                    |
| Dependency highlight | Selects deterministic node 0 and measures details/highlight presentation.                                                                                                                                                           |
| Lane highlight       | Opens the deterministic Lane 1 Ant control before timing, then measures option selection through two frames. This isolates graph presentation from dropdown-opening overhead.                                                       |
| Playback             | Enters Evolution Mode, waits for controls, then starts playback. The reported operation is mode/playback exposure latency; frame timing is reported separately.                                                                     |
| Long tasks           | Buffered Chromium `longtask` `PerformanceObserver` durations. No observed tasks means an empty supported sample set; unavailable observer support must be treated as unsupported, not as zero.                                      |
| Frame timing         | Successive `requestAnimationFrame` intervals collected during the scenario. These are page frame intervals, not GPU-only render times. Backgrounding the page invalidates them.                                                     |
| React render/commit  | React `Profiler.actualDuration` commit samples around `EvolutionGraphView`. Available in this development harness; production profiling builds may not expose equivalent data.                                                      |
| Memory               | End-of-scenario `performance.memory.usedJSHeapSize` when Chromium exposes it. Otherwise the report says `supported: false`; no value is inferred. This is a point sample, not retained-heap or leak proof.                          |

Raw data should be retained. Do not compare only rounded medians or combine Node algorithm timings with browser timings.

## Suggested budgets (non-gating)

Establish a baseline on a dedicated machine before adopting budgets. Reasonable investigation thresholds for 1,000 nodes on a modern desktop are:

- initial render median ≤ 1,500 ms and p95 ≤ 2,500 ms;
- fit/zoom/highlight median ≤ 100 ms and p95 ≤ 250 ms;
- pan and playback frame p95 ≤ 33.3 ms;
- no individual long task above 200 ms;
- no sustained heap increase above 20% across a repeated 20-cycle scenario.

A miss should trigger trace/manual DevTools investigation, not fail CI automatically. The harness intentionally has no timing assertions.

## Production-preview baseline (2026-10-29)

`artifacts/performance/phase-5-production-preview.json` records a production-build preview run. It is separate from the Vite development-server baseline below and must not be compared as though the environments were equivalent. The run used three samples per deterministic graph, nearest-rank p95, one worker, reduced motion, Node 24.16.0, and bundled headless Chromium 156.0.8078.4 on macOS 25.6.0 arm64. Memory is the end-of-scenario Chromium `usedJSHeapSize` point sample, shown in decimal MB.

| Nodes | Initial p95 (ms) | Dependency p95 (ms) | Lane p95 (ms) | Playback p95 (ms) | Frame p95 (ms) | Long task p95 (ms) | Memory (MB) |
| ----: | ---------------: | ------------------: | ------------: | ----------------: | -------------: | -----------------: | ----------: |
|   100 |            103.2 |                25.0 |          29.3 |              29.0 |           16.8 |      none observed |        13.4 |
|   500 |            138.7 |               134.0 |          22.4 |             118.4 |          116.7 |              113.0 |        31.2 |
| 1,000 |            174.4 |                44.2 |          30.8 |              46.0 |          250.0 |              257.0 |        68.0 |

These measurements are factual snapshots, not CI gates or compatibility guarantees. Three samples are sensitive to scheduler, thermal, browser, and host variability; rerun under controlled conditions before drawing regression conclusions. The performance benchmark remains omitted from general CI.

## Phase 4.8 release-candidate run (2026-10-29)

The Phase 4.8 profile isolates lane option selection from Ant dropdown opening and removes the mass grayscale filter from dimmed nodes. Final lane-highlight median/p95 is 30.5/31.1 ms at 100 nodes, 128.5/239.2 ms at 500 nodes, and 157.6/162.4 ms at 1,000 nodes. The 100- and 1,000-node p95 targets are met; the 500-node p95 target is missed because of one 239.2 ms sample despite a 128.5 ms median.

Aggregate frame p95 remains 33.2/83.3/216.8 ms, so large-graph frame variability remains a documented limitation. The full before/after table and raw final report are in `artifacts/performance/summary.md` and `artifacts/performance/phase-4.8-after.json`. The Phase 4.8 report’s statement that a production-preview profile had not run was accurate when that historical report was written; the newer production-preview baseline above supersedes that run-status statement without rewriting the historical report.

## Previous current-environment run (2026-10-28)

Environment: macOS 25.6.0 arm64, Node 24.16.0, Playwright 1.64.1, bundled headless Chromium 156.0.8078.4, one worker, reduced motion, and three samples per graph.

The previous `newPage()` hang was reproduced only inside the Zed terminal OS sandbox. Chromium stderr reported a denied macOS Mach rendezvous registration (`bootstrap_check_in … Permission denied (1100)`). The identical reproduction and full profile completed outside that sandbox without adding unsafe project launch flags.

`npm run profile:chromium` completed for 100, 500, and 1,000 nodes. Raw data is stored in `artifacts/performance/graph-*.json`; environment metadata is in `artifacts/performance/environment.json`, and the readable table is in `artifacts/performance/summary.md`.

The revalidated baseline identifies lane highlighting as the dominant bottleneck (p95 457.0/773.1/1079.5 ms). Frame p95 is 16.8/99.9/233.3 ms and long-task p95 is unavailable because none were observed / 123 / 325 ms. These results do not meet the preliminary interaction/frame targets at larger sizes. No performance target is claimed as achieved.

## Limitations

- The allowed scope excludes renderer instrumentation, so browser layout and edge routing cannot be independently marked.
- Two-frame completion is a practical presentation proxy; it does not prove raster completion on every platform.
- Headless Chromium can differ from headed Chrome and from GPU-enabled user environments.
- React Profiler adds overhead and its durations are not browser paint durations.
- `performance.memory` is Chromium-specific and non-standard.
- The automated playback metric covers activation/start latency, while aggregate frame timing covers ongoing animation; it does not run a long, fixed-duration playback soak.
- The harness records environment facts but not commit SHA, CPU model, power mode, thermal state, or CPU throttling. Record those alongside release baselines.
