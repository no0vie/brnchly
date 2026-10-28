# Browser performance baseline — 2026-10-28 revalidation

Environment: macOS 25.6.0 arm64, Node 24.16.0, Playwright 1.64.1, bundled Chromium 156.0.8078.4, headless, reduced motion, 3 samples per graph, 1 worker. Measurements use the Vite development server and React Profiler; they are regression evidence, not production-user latency.

## Results

All values are milliseconds except heap.

| Nodes | Edges | Initial median / p95 | SVG edges median / p95 |         Fit |         Pan |        Zoom | Dependency highlight |  Lane highlight |    Playback | Frame median / p95 | Long-task median / p95 | React commit median / p95 |     Heap |
| ----: | ----: | -------------------: | ---------------------: | ----------: | ----------: | ----------: | -------------------: | --------------: | ----------: | -----------------: | ---------------------: | ------------------------: | -------: |
|   100 |   189 |        184.6 / 218.9 |            28.5 / 28.6 | 26.2 / 27.0 | 25.0 / 26.7 | 32.8 / 33.3 |          24.7 / 26.3 |   453.1 / 457.0 | 28.5 / 28.6 |        16.7 / 16.8 |          none observed |                 0.4 / 5.1 |  56.8 MB |
|   500 |   993 |        233.3 / 252.8 |            31.4 / 31.5 | 22.2 / 25.2 | 85.5 / 86.5 | 25.9 / 26.1 |        102.8 / 116.1 |   718.4 / 773.1 | 84.1 / 86.3 |        16.7 / 99.9 |           81.0 / 123.0 |                0.4 / 11.6 |  86.4 MB |
|  1000 |  1994 |        272.7 / 306.2 |            60.9 / 62.6 | 23.6 / 23.7 | 23.6 / 29.7 | 19.9 / 28.7 |          48.1 / 49.8 | 1051.0 / 1079.5 | 60.5 / 69.1 |       16.7 / 233.3 |          202.5 / 325.0 |                0.6 / 22.6 | 131.0 MB |

## Assessment

- Initial render, SVG edge rendering, fit, zoom, and playback did not show catastrophic blocking.
- Lane highlighting remains the dominant measured bottleneck at every size and exceeds the 100 ms interaction target.
- At 500 nodes, dependency highlighting, frame p95, and long tasks warrant investigation.
- At 1000 nodes, frame p95 and long-task p95 exceed the preliminary targets.
- Layout exposure remains unsupported by the browser harness and is reported separately by Node/Vitest.
- Memory is a point sample, not retained-heap or leak evidence.

Raw data: `environment.json`, `graph-100.json`, `graph-500.json`, and `graph-1000.json` in this directory.
