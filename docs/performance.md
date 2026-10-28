# Performance profiling

Performance is tracked in two deliberately separate layers:

1. `src/performance/benchmarks.test.ts` measures **algorithms in Node/Vitest**. Its median/p95 values are **not browser measurements** and do not include React, DOM, SVG, painting, compositing, input latency, or garbage-collection behavior representative of Chrome.
2. Browser profiling measures the user-visible application in Chromium using Playwright and Chrome tracing/Performance APIs.

## Algorithmic baseline (Node/Vitest — not browser measurements)

Run the reproducible focused suite from the repository root:

```sh
npm test -- src/performance/benchmarks.test.ts
```

The suite uses deterministic generated graphs of 100, 500, and 1,000 nodes and fixed seeds. It warms each scenario, records multiple iterations, and prints median and nearest-rank p95 for:

- layout;
- playback plan creation;
- playback snapshot calculation;
- traversal index creation plus traversal;
- edge routing.

Timing still varies with hardware, Node version, thermal state, and competing processes. Compare results only on a controlled machine with the same runtime and power settings. Record the Node/Vitest table separately from browser results.

## Browser profiling protocol

### Environment

Record the commit, OS, CPU, RAM, Chrome and Node versions, viewport, device scale factor, and whether CPU throttling is enabled. Use a production build, not Vite development mode:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

Run Chromium headed for trace inspection. Keep the viewport fixed (recommended: 1440 × 900), close unrelated applications, disable extensions, use the same deterministic graph and seed, and do one unrecorded warm-up. For each graph size and operation, collect at least 10 measured runs in a fresh page; report median and p95 rather than the best run.

### Playwright and Chrome Performance APIs

Use a temporary or future Playwright spec outside this baseline if automation is desired; no browser benchmark is inferred from the Vitest suite. A measurement should:

1. Open a fresh `browser.newPage({ viewport: { width: 1440, height: 900 } })` and navigate to the production preview.
2. Install `PerformanceObserver` instances before the operation for `longtask`, `measure`, and, where supported, `event` entries.
3. Bracket app actions with `performance.mark()` / `performance.measure()`. Wait for two `requestAnimationFrame` callbacks after visual operations so style, layout, paint, and compositing can complete.
4. Create a Chromium CDP session with `page.context().newCDPSession(page)`. Use `Performance.enable` and `Performance.getMetrics` for process metrics; use `Tracing.start`/`Tracing.end` (categories such as `devtools.timeline`, `blink.user_timing`, `v8`, and screenshots when needed) for frame, scripting, rendering, painting, and long-task analysis.
5. Save a trace per operation and inspect it in Chrome DevTools Performance. Do not combine setup/navigation with the operation interval.
6. Sample `performance.memory.usedJSHeapSize` only in Chromium where available. For a stronger memory measurement, use `performance.measureUserAgentSpecificMemory()` where supported and cross-origin isolation requirements are met. Force-GC-based numbers are diagnostic only and must be labeled as such.

Playwright action duration alone is not a render metric. Prefer app marks correlated with trace events and presentation frames. Keep traces as artifacts, but summarize repeated runs with median/p95.

### Operations

- **Initial render:** start immediately before graph data is supplied; finish after the graph is visible and two animation frames have elapsed. Capture scripting, rendering, paint, long tasks, and heap delta.
- **Fit:** invoke fit-to-content from a stable graph; finish after transform settles and two frames. Record total latency and dropped/slow frames.
- **Pan/zoom:** replay the same pointer/wheel path for 2–5 seconds. Derive frame intervals from successive `requestAnimationFrame` timestamps and report median/p95 frame time, frames over 16.7 ms, and frames over 50 ms.
- **Playback:** run the same segment at the same speed. Measure start latency, per-frame time, long tasks, and memory growth; separately mark snapshot calculation and visual update if app instrumentation permits.
- **Highlighting:** select the same high-connectivity node and traverse the same mode. Measure click-to-present latency, frame time, and affected DOM/SVG work.
- **Routing:** trigger a route recomputation without including fixture generation. Mark algorithm start/end in the app and correlate it with subsequent style/layout/paint work.
- **Long tasks and memory:** count tasks over 50 ms, report maximum task duration, heap before/after, and heap after repeated playback/highlight/routing cycles. Reload between independent samples.

## Browser result targets and record

Targets are budgets for the recommended desktop profile (production Chromium, 1440 × 900, no CPU throttling). If another profile is used, record it and establish a separate baseline. Initial render and routing budgets apply to 1,000 nodes; interaction budgets apply across all fixture sizes.

| Date / commit | Browser profile         | Graph | Operation          | Runs | Median |  p95 | Long tasks (>50 ms) | Heap delta | Target                                           | Pass? |
| ------------- | ----------------------- | ----: | ------------------ | ---: | -----: | ---: | ------------------: | ---------: | ------------------------------------------------ | ----- |
| —             | Chrome — / OS — / CPU — | 1,000 | Initial render     |   10 |   — ms | — ms |                   — |       — MB | median ≤ 1,000 ms; p95 ≤ 1,500 ms                | —     |
| —             | Chrome — / OS — / CPU — | 1,000 | Fit                |   10 |   — ms | — ms |                   — |       — MB | median ≤ 100 ms; p95 ≤ 200 ms                    | —     |
| —             | Chrome — / OS — / CPU — | 1,000 | Pan/zoom frames    |   10 |   — ms | — ms |                   — |       — MB | median ≤ 16.7 ms; p95 ≤ 33.3 ms                  | —     |
| —             | Chrome — / OS — / CPU — | 1,000 | Playback frames    |   10 |   — ms | — ms |                   — |       — MB | median ≤ 16.7 ms; p95 ≤ 33.3 ms                  | —     |
| —             | Chrome — / OS — / CPU — | 1,000 | Highlighting       |   10 |   — ms | — ms |                   — |       — MB | median ≤ 100 ms; p95 ≤ 200 ms                    | —     |
| —             | Chrome — / OS — / CPU — | 1,000 | Routing + present  |   10 |   — ms | — ms |                   — |       — MB | median ≤ 250 ms; p95 ≤ 500 ms                    | —     |
| —             | Chrome — / OS — / CPU — | 1,000 | 20-cycle stability |   10 |      — |    — |                   — |       — MB | no sustained heap growth > 20%; no task > 200 ms | —     |

Treat a budget miss as a prompt to inspect the trace, not as proof of a specific root cause. Store raw samples and environment metadata alongside each completed table so regressions can be reproduced.
