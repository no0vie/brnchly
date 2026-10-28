# Phase 4.8 — Final Hardening & Release Candidate

Date: 2026-10-29

## Release decision

**Ready with Limitations**

The editor's P0 data-safety and interaction paths pass in real Chromium, production dependencies and development tooling audit cleanly, and all required quality gates have factual passing results. The remaining limitations are large-graph frame/long-task variability and incomplete P1 accessibility depth; neither is a known data-loss defect or basic-editor blocker.

## What changed

### Lane highlight performance

Reason:

- Phase 4.7 reported lane-highlight p95 of 457.0/773.1/1079.5 ms for 100/500/1000 nodes.
- Trace and React Profiler evidence showed React commit time was much smaller than total latency. The old measurement also included opening the Ant Design dropdown, so it could not attribute the full duration to graph rendering.

Changes:

- `e2e/performance.spec.ts` now opens the dropdown before starting the lane-selection timer and measures option selection through two animation frames.
- `src/renderer/EvolutionGraphView.tsx` memoizes playback and highlight sets instead of allocating new sets on unrelated renders.
- `src/renderer/graph/GraphRenderer.tsx` indexes branches for O(1) color lookup.
- `src/renderer/GraphRenderer.css` keeps opacity dimming but removes the expensive grayscale filter applied to every nonmatching node.

Result:

| Nodes | Before p95 | After p95 |  Target | Result |
| ----: | ---------: | --------: | ------: | :----- |
|   100 |   457.0 ms |   31.1 ms | <100 ms | Passed |
|   500 |   773.1 ms |  239.2 ms | <150 ms | Missed |
|  1000 |  1079.5 ms |  162.4 ms | <250 ms | Passed |

The before/after metric methodology differs intentionally: the old number includes dropdown opening, while the new number isolates graph presentation. The final 500-node median is 128.5 ms, with one 239.2 ms p95 sample. Frame p95 remains 33.2/83.3/216.8 ms and 1000-node long-task p95 is 322 ms. No virtualization or renderer rewrite was introduced.

Detailed results: `artifacts/performance/summary.md`, `artifacts/performance/phase-4.8-after.json`, and `docs/performance.md`.

### Critical editor E2E

Added isolated real-Chromium scenarios in `e2e/phase4-editor.spec.ts`:

- visual connection creation through node ports;
- Escape cancellation of an unfinished connection;
- cycle rejection through the visual connection path and graph invariance after rejection;
- manual pointer drag, one-step undo/redo, and Escape cancellation without an extra history entry;
- multi-select, bulk delete, and one-step restoration of all affected nodes;
- valid JSON import;
- malformed JSON rejection while preserving the imported/current graph in memory;
- localStorage write failure, visible `error` state, blocked destructive transition, and retention of the current in-memory graph;
- existing create/edit/form-edge/persistence/preview/export flow remains covered.

Added `e2e/reduced-motion.spec.ts`:

- verifies the emulated media query;
- verifies node animation/transition suppression;
- verifies stage playback remains functional.

Existing `e2e/evolution.spec.ts` continues to cover Classic Mode → Graph Mode, dependency highlighting, camera zoom/pan, evolution play/pause/resume, and seek. All E2E files capture page/runtime errors; Playwright retains trace and screenshot artifacts on failure.

### Development toolchain security

Initial current audit:

- 13 development findings: 5 moderate, 6 high, 2 critical.
- Critical findings were in the Vitest/tinypool toolchain.
- Production audit: 0 findings.

Changes:

- Vite upgraded from 5.4.21 to 6.4.5.
- Vitest upgraded from 2.1.9 to patched 4.1.x (lockfile resolved 4.1.12; patched boundary verified at 4.1.11).
- Applied non-forced `npm audit fix` for compatible transitive patches.
- React, MobX, and Ant Design major versions were not changed.

Final current audit:

- `npm audit`: 0 vulnerabilities.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Known critical development vulnerability remaining: **none**.

Compatibility result: all 103 Vitest tests and the Vite production build pass on Node 24.16.0. Vitest 4 requires Node 20+, so Phase 5/CI should explicitly document or pin Node 20+.

## Verification matrix

### Passed

| Gate / scenario            | Actual result                                                                                                          |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `npm test`                 | 17 files, 103 tests passed                                                                                             |
| `npm run lint`             | Passed after formatting correction                                                                                     |
| `npm run format:check`     | Passed after formatting correction                                                                                     |
| `npm run build`            | Passed with Vite 6.4.5; existing >500 kB Ant chunk warning remains                                                     |
| `npm run test:e2e`         | 18 passed, 1 intentionally skipped project mismatch; 19 discovered executions                                          |
| `npm run profile:chromium` | Passed; 100/500/1000-node report generated                                                                             |
| `npm audit`                | 0 vulnerabilities                                                                                                      |
| `npm audit --omit=dev`     | 0 vulnerabilities                                                                                                      |
| `git diff --check`         | Passed                                                                                                                 |
| Classic Mode               | Covered by evolution smoke flow                                                                                        |
| Graph Mode                 | Covered by renderer/evolution smoke flow                                                                               |
| Editor Mode                | Covered by seven isolated editor scenarios per active browser project                                                  |
| Evolution playback         | Play/pause/resume/seek and authored-graph return path covered                                                          |
| Import/export              | Valid import, malformed import preservation, and export covered                                                        |
| Local persistence          | Reload persistence and storage-failure in-memory safety covered                                                        |
| Controlled renderer API    | Existing component tests passed                                                                                        |
| Existing JSON migrations   | Existing migration/serialization tests passed                                                                          |
| Dark/light theme           | Existing application smoke path has no runtime errors; theme switching was not expanded into visual regression testing |
| Reduced motion             | Explicit Chromium reduced-motion assertion passed                                                                      |

Chromium commands were run outside the Zed OS sandbox because the previously diagnosed macOS Mach rendezvous restriction prevents reliable browser context creation inside it. No unsafe Chromium flags were added.

### Failed

- No required quality gate remains failed.
- The non-gating 500-node lane-highlight p95 target (<150 ms) was not met: 239.2 ms. Median was 128.5 ms.

### Blocked

- None.

### Not run

- Headed Chrome/GPU performance profile.
- Production-preview performance profile (the reproducible harness uses the Vite development server and React Profiler).
- Full WCAG audit.
- Extended multi-browser E2E (Firefox/WebKit are outside this milestone).
- Long-duration playback/memory leak soak.

## Known limitations

1. Frame p95 remains 83.3 ms at 500 nodes and 216.8 ms at 1000 nodes in headless development profiling.
2. The 1000-node run still records long tasks up to a 322 ms p95. Remaining cost is browser style/paint and whole-graph visual invalidation; React commit p95 is 24.3 ms.
3. The lane before/after numbers are not a strict same-method comparison because Phase 4.8 corrected a confounded metric. Both methodologies are documented rather than presenting the reduction as renderer-only gain.
4. P1 keyboard coverage is partial: keyboard connection and playback seek are covered, but focus restoration and full Inspector traversal are not a complete accessibility audit.
5. The production bundle still reports an Ant Design chunk above 500 kB. This is a build warning, not a release blocker for this stabilization phase.
6. Node 20+ is now required by the patched Vitest line but is not yet pinned in repository runtime metadata.

## Data-loss and blocker assessment

- No reproducible P0 data-loss defect was found.
- Invalid dependencies and malformed imports leave the graph unchanged.
- A localStorage quota-style failure leaves the current graph in memory and prevents a new-document transition from discarding it.
- No reproducible P1 blocker of the basic editor flow was found.

## Phase 5 handoff

Prerequisites and recommended order:

1. Pin/document Node 20+ for CI and contributors before package extraction.
2. Preserve the controlled renderer API and existing schema/migration tests while extracting the renderer package.
3. Move the deterministic browser harness with the renderer and establish a production-preview baseline; do not mix it with the retained development baseline.
4. Keep lane/dependency highlight state stable at package boundaries and retain arbitrary numeric lane coordinates.
5. Investigate large-graph style/paint invalidation and edge updates before considering virtualization. Virtualization remains backlog, not a Phase 4.8 requirement.
6. Add focused P1 keyboard focus-restoration/Inspector navigation tests when package boundaries stabilize.
7. Retain the P0 editor Playwright suite as the package-extraction acceptance suite.

## Scope confirmation

Phase 4.8 did not add business functionality, rewrite the Graph Engine, change the EvolutionGraph schema, replace HTML/SVG rendering, add layouts/backend/editor features, force audit upgrades, publish packages, or begin renderer/editor package extraction.
