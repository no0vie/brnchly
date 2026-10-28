# Chromium graph performance profiling

The repository has two intentionally separate performance layers:

- `src/performance/benchmarks.test.ts` profiles graph algorithms in Node/Vitest. Those numbers do **not** represent browser rendering.
- `e2e/performance.spec.ts` profiles the real React/SVG graph in Playwright Chromium through the isolated `?perf=100|500|1000` harness.

Neither suite enforces timing gates. Performance varies substantially by hardware, browser build, thermal state, headless mode, and background load.

## Run

```sh
npm run profile:chromium
```

The default is three samples for each deterministic 100, 500, and 1,000-node graph. Override the sample count for a more stable local baseline:

```sh
PERF_SAMPLES=10 npm run profile:chromium
```

The test uses only the `chromium` Playwright project, one worker, a 1440 × 900 viewport, reduced motion, and a fresh browser context per graph size. Playwright starts the existing Vite server according to `playwright.config.ts`. For release baselines, change that configuration to serve the production build or run an equivalent controlled preview; development React/Profiler overhead means the default command is best for reproducibility and regression comparison, not end-user absolute latency.

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
| Lane highlight       | Selects deterministic Lane 1 through the existing Ant control and measures presentation.                                                                                                                                            |
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

## Current-environment run (2026-10-28)

Environment: macOS sandbox, Playwright headless Chromium, one worker. `npm run build` and the focused deterministic generator tests passed.

Browser profiling did **not** complete in this environment. The initial run was forcibly stopped at the external 10-minute command bound; a bounded two-sample retry (`PERF_SAMPLES=2 npm run profile:chromium`) then hit the spec's 600,000 ms timeout while Chromium was creating a page after the earlier terminated process. No complete JSON artifact was produced and no timing, long-task, frame, React, or memory values are reported here. These values are **unavailable**, not zero. Run the command in a clean local process environment to establish the first browser baseline.

## Limitations

- The allowed scope excludes renderer instrumentation, so browser layout and edge routing cannot be independently marked.
- Two-frame completion is a practical presentation proxy; it does not prove raster completion on every platform.
- Headless Chromium can differ from headed Chrome and from GPU-enabled user environments.
- React Profiler adds overhead and its durations are not browser paint durations.
- `performance.memory` is Chromium-specific and non-standard.
- The automated playback metric covers activation/start latency, while aggregate frame timing covers ongoing animation; it does not run a long, fixed-duration playback soak.
- The harness records environment facts but not commit SHA, CPU model, power mode, thermal state, or CPU throttling. Record those alongside release baselines.
