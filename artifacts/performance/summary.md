# Browser performance — Phase 4.8 release candidate

Environment: macOS 25.6.0 arm64, Node 24.16.0, Playwright 1.64.1, bundled headless Chromium 156.0.8078.4, reduced motion, 3 samples per graph, 1 worker, Vite development server, React Profiler enabled. These are regression measurements, not production-user latency guarantees.

## Lane highlight before / after

All values are milliseconds. The Phase 4.7 metric included opening the Ant Design dropdown. Phase 4.8 opens the dropdown before timing and measures option selection through two animation frames, isolating graph presentation from control-opening overhead. Results are therefore useful for bottleneck diagnosis but not a strict like-for-like product-interaction comparison.

| Nodes | Before median / p95 | After median / p95 | p95 change | Phase 4.8 target |
| ----: | ------------------: | -----------------: | ---------: | ---------------: |
|   100 |       453.1 / 457.0 |        30.5 / 31.1 |     -93.2% |     < 100 passed |
|   500 |       718.4 / 773.1 |      128.5 / 239.2 |     -69.1% |     < 150 missed |
|  1000 |     1051.0 / 1079.5 |      157.6 / 162.4 |     -85.0% |     < 250 passed |

## Final profile

| Nodes | Edges | Dependency median / p95 | Lane median / p95 | Playback median / p95 | Frame median / p95 | Long-task median / p95 | React commit median / p95 |
| ----: | ----: | ----------------------: | ----------------: | --------------------: | -----------------: | ---------------------: | ------------------------: |
|   100 |   189 |             26.0 / 26.9 |       30.5 / 31.1 |           29.5 / 29.7 |        16.7 / 33.2 |          none observed |                 0.5 / 5.1 |
|   500 |   993 |             84.6 / 87.8 |     128.5 / 239.2 |           72.4 / 83.1 |        16.7 / 83.3 |           75.5 / 135.0 |                0.5 / 12.7 |
|  1000 |  1994 |            44.5 / 221.4 |     157.6 / 162.4 |         137.6 / 188.8 |       16.7 / 216.8 |          179.0 / 322.0 |                0.6 / 24.3 |

## Diagnosis and result

- The Phase 4.7 lane metric was dominated by a fixed Ant dropdown interaction cost; a 100-node graph already took about 457 ms while React commit p95 was about 5 ms.
- Graph presentation still updates all visible nodes and edges. Removing `filter: grayscale(...)` from every dimmed node avoids expensive mass filter painting while retaining opacity-based highlighting.
- Highlight, playback, and visibility sets are now memoized, and branch color lookup is indexed instead of scanning branches per node.
- No layout inputs change during highlighting, so layout and edge routing remain memoized. The trace and React timings do not identify graph layout as the lane-highlight bottleneck.
- The 500-node p95 has one 239.2 ms outlier while its median is 128.5 ms. The target is missed, but the iteration stops here because the remaining frame/style/paint variability does not justify viewport virtualization or a renderer rewrite in Phase 4.8.
- Aggregate frame p95 at 500/1000 nodes and 1000-node long tasks remain known limitations. Dependency highlighting and playback remained functional in the full E2E suite.

Raw Phase 4.7 files remain `graph-100.json`, `graph-500.json`, and `graph-1000.json`. The final raw Phase 4.8 report is `phase-4.8-after.json`.
