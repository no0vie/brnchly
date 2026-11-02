# Repository cleanup report

Date: 2026-11-02  
Target: v1.0 release candidate

## 1. Executive summary

The repository was audited before modification across tracked/untracked files, package exports, imports, tests, scripts, build configuration, workflows, documentation links, package-consumer validation, and generated output.

The active documentation was consolidated from phase-oriented reports and overlapping guides into product-oriented architecture, schema, API, editor, development, release, and limitations documents. Two files with no references or build/runtime purpose were removed. Public package exports, EvolutionGraph schema v2, migrations, layouts, Classic Mode, Graph Mode, Editor Mode, playback, tests, fixtures, performance baselines, and release workflows were retained.

Static checks, TypeScript, 115 unit/component tests, package/application/Pages builds, tarball dry-run, isolated consumer validation, production dependency audit, and diff checks passed. Browser E2E was blocked while Playwright timed out creating pages in the current macOS/Zed environment. The full dependency audit failed because the development-only ESLint/minimatch chain currently reports 17 moderate vulnerabilities with no non-breaking fix reported by npm; the production audit reports zero vulnerabilities.

## 2. Repository inventory

| Area                     | Result                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Root                     | Private npm workspace application, release/docs/config files, Vite entry.                                                 |
| `packages/core`          | Public DOM-free schema, validation, migration, serialization, layout, traversal, routing, playback, and viewport package. |
| `packages/react`         | Public React renderer and stylesheet package; React peers, core dependency, no editor/Ant Design dependency.              |
| `src`                    | Standalone application, Classic/Graph modes, editor, playback composition, data, and performance harness.                 |
| `examples`               | Isolated React/Vite package-consumer fixture.                                                                             |
| `e2e`                    | Chromium application, editor, reduced-motion, and performance coverage.                                                   |
| `scripts`                | Package distribution/tarball/consumer validation.                                                                         |
| `artifacts/performance`  | Retained reproducible baselines, environment metadata, and summary.                                                       |
| `.github/workflows`      | CI, Pages, and manual protected publish workflows.                                                                        |
| Generated local output   | `dist`, Playwright reports/results, and `node_modules` were present but ignored and untracked.                            |
| Git state before changes | Clean tracked/untracked status; generated ignored files existed locally.                                                  |

No `apps/` directory or separate root `tests/` directory exists. Tests are colocated with source plus `e2e/`.

## 3. Deleted files with reasons

| Files                                                                                                                                                                                                      | Reason                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/Evolution/StepInfo.tsx`                                                                                                                                                                    | Repository-wide reference audit found no import, export, test, dynamic load, build/config, or documentation reference. Classic Mode uses the active `SporeGraphAntd` path instead.                     |
| `public/vite.svg`                                                                                                                                                                                          | Unreferenced Vite starter asset; Vite would copy it into the application output despite no consumer.                                                                                                   |
| `docs/phase-4.8-release-candidate.md`, `docs/phase-5-release-candidate.md`                                                                                                                                 | Historical milestone reports. Durable architecture, verification caveats, performance limitations, and release safety rules were merged into canonical docs and this report; Git retains full history. |
| `docs/adr/0001-layout-engine-and-renderer.md`, `docs/adr/0002-phase4-editor-architecture.md`                                                                                                               | Accepted decisions, alternatives, trade-offs, and revisit criteria were merged into `architecture.md` and `editor.md`; stale phase/audit/test snapshots were removed.                                  |
| `docs/accessibility.md`, `docs/import-export.md`, `docs/integration.md`, `docs/migration-guide.md`, `docs/performance.md`, `docs/playback.md`, `docs/public-api.md`, `docs/renderer.md`, `docs/styling.md` | Overlapping narrow guides were consolidated into the canonical schema/API/editor/development/limitations documents.                                                                                    |

No source file with ambiguous ownership was removed. No test, fixture, migration, public export, supported layout, package-consumer file, workflow, or performance baseline was deleted.

## 4. Merged documentation

The active documentation now consists of:

- `README.md` — concise product entry point, architecture, installation state, example, local run, and links;
- `docs/getting-started.md` — package selection and first graph/renderer use;
- `docs/architecture.md` — one current package/data/persistence/rendering boundary description;
- `docs/graph-schema.md` — schema v2, entities, validation, migrations, and import/export;
- `docs/api.md` — package-root core exports, all React props, imperative handle, stylesheet, and playback boundary;
- `docs/editor.md` — Classic/Graph/Editor product modes and repository-only editor behavior;
- `docs/development.md` — commands, testing, Pages build, performance methodology, and sandbox constraints;
- `docs/release.md` — versioning, required checks, protected publication, recovery caveat, and Pages;
- `docs/limitations.md` — distribution, browser, performance, editor, accessibility, and customization limits;
- this report.

The `radial-tree` public layout strategy and previously omitted React controlled/callback props are now documented.

## 5. Updated documentation

- Root README no longer implies npm availability or a live deployment.
- Package READMEs now include release-state caveats, install/peer information, compilable examples, stylesheet/layout/container requirements, and browser/data ownership boundaries.
- Graph schema documentation explicitly distinguishes schema-1 migration input from schema-2 validation/storage.
- Changelog and contributing links point to current canonical documents.
- Public documentation remains English-only.

## 6. Removed dependencies

None. Static results alone did not justify dependency removal, and no major toolchain upgrades were introduced during cleanup.

## 7. Removed scripts

None. All current scripts have a development, build, test, package, consumer, profiling, Pages, or release-validation role. The known repeated package builds are an optimization opportunity, not dead behavior.

## 8. Changed configuration

`.gitignore` now also covers coverage output, Vite cache, local environment files (while permitting `.env.example`), trace archives, and CPU profiles.

No TypeScript, Vite, Vitest, Playwright, package export, dependency, workflow, Node engine, or publication-permission configuration was changed. Release workflows remain manual/protected.

## 9. Verification results

| Check                                       | Status      | Result                                                                                                                                                                   |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial `npm ci` using global cache         | **Failed**  | Global `~/.npm` cache contains root-owned files and was not writable. No repository defect inferred.                                                                     |
| `npm ci --cache .npm-cache`                 | **Passed**  | Clean lockfile install completed using a temporary project-local cache.                                                                                                  |
| `npm run format:check`                      | **Passed**  | One new file required targeted Prettier formatting; rerun passed.                                                                                                        |
| `npm run lint`                              | **Passed**  | Zero lint warnings/errors.                                                                                                                                               |
| `npm run typecheck`                         | **Passed**  | Core and React packages built; root TypeScript check passed.                                                                                                             |
| `npm test`                                  | **Passed**  | 19 files, 115 tests. Includes schema/migrations, package boundaries, renderer interactions, Classic adapter, playback, editor, persistence, and performance determinism. |
| `npm run build`                             | **Passed**  | Core, React, and standalone app built. Existing Ant Design chunk-size warning remains.                                                                                   |
| `npm run build:pages`                       | **Passed**  | `/brnchly/` build and `dist/404.html` fallback generated. This is not a deployment result.                                                                               |
| `npm run pack:dry-run`                      | **Passed**  | Both package manifests/tarball contents passed assertions.                                                                                                               |
| `npm run test:consumer`                     | **Passed**  | Both tarballs installed in isolation; consumer typecheck and production build passed.                                                                                    |
| `npm run test:e2e`                          | **Blocked** | Playwright timed out while setting up `page` across Chromium projects; run was terminated at 240 seconds. No unsafe browser flags were added.                            |
| Classic/Graph/Editor/Playback runtime flows | **Blocked** | Browser-level verification depends on the blocked E2E run; corresponding unit/component tests passed.                                                                    |
| Import/export                               | **Passed**  | Serialization, migration, persistence, and editor tests passed.                                                                                                          |
| Public types and stylesheet                 | **Passed**  | Package builds, package-boundary tests, dry-run, and isolated consumer validation passed.                                                                                |
| `npm audit`                                 | **Failed**  | The 2026-11-02 run reported 17 moderate development-only findings in ESLint/minimatch dependency paths; npm reported no fix without broader toolchain review.            |
| `npm audit --omit=dev`                      | **Passed**  | Zero production vulnerabilities.                                                                                                                                         |
| GitHub Actions execution                    | **Not run** | Workflows were audited locally; no remote run was triggered or claimed.                                                                                                  |
| npm publication                             | **Not run** | No publish command or workflow dispatch was performed.                                                                                                                   |
| GitHub Pages deployment                     | **Not run** | Local Pages build passed; no deployment was performed or claimed.                                                                                                        |
| `git diff --check`                          | **Passed**  | No whitespace errors.                                                                                                                                                    |
| Zed diagnostics                             | **Passed**  | No project diagnostics.                                                                                                                                                  |

## 10. Public API compatibility

No package manifest export, package-root source export, public type, React prop, stylesheet subpath, schema, migration, layout algorithm, or playback API was changed. `EvolutionGraph` schema v2 and legacy migration input remain intact. The removed source component was not public or referenced.

## 11. Remaining REVIEW items

1. Upgrade/migrate the end-of-life ESLint 8 toolchain in a dedicated change to resolve the current minimatch audit findings; avoid a forced audit update in the RC cleanup diff.
2. Design a resumable two-package publication path for the case where core publishes and React fails.
3. Confirm whether npm authentication uses an automation token, trusted publishing/OIDC, or both, then align workflow documentation and repository settings.
4. After v1.0, derive publish versions/tags from manifests instead of hard-coding `1.0.0`.
5. Decide whether optional package metadata (`homepage`, `bugs`, `keywords`, carefully scoped CSS `sideEffects`) is desired.
6. Run E2E in an environment where Chromium page creation is permitted and attach the result before final v1.0 approval.

## 12. Known limitations

- Browser runtime checks remain blocked in this environment.
- The 2026-11-02 full audit has 17 development-only moderate findings; production dependencies audit cleanly.
- React 19, Firefox, WebKit, mobile, headed/GPU performance, full WCAG, and assistive-technology matrices remain unverified.
- Large-graph frame/long-task variability and the standalone Ant Design chunk warning remain.
- Publication, CI execution, npm authority, and Pages deployment remain externally unverified.

## 13. Recommendations before v1.0

1. Resolve or formally accept the development-toolchain audit findings in a focused dependency migration.
2. Run `npm run test:e2e` outside the blocked sandbox and require the Classic, Graph, Editor, playback, reduced-motion, import/export, and persistence flows to pass.
3. Run the GitHub Actions CI and validation-only publish workflow from the reviewed commit.
4. Verify npm identity/scope authority and package-name/version state while authenticated.
5. Verify Pages repository settings and the live deployment before adding a demo URL.
6. Review the non-atomic publish recovery procedure before approving live publication.

## Cleanup statistics

- Deleted files: **15**.
- Lines removed from deleted files: **1,135**.
- Total tracked diff deletions before this report: **1,286 lines** (includes replaced documentation lines).
- Documentation files: **23 before**, **15 after** (including this report, package READMEs, changelog, contribution guide, and retained performance summary).
- Documentation size: **110,452 bytes before**, **57,390 bytes after** (48.0% reduction).

### Preserved historical materials

- `CHANGELOG.md` — release history and user-visible release-candidate scope.
- `artifacts/performance/summary.md` and JSON baselines — reproducible measurement evidence and environment/results data.
- Git history — complete phase reports and ADR text remain recoverable without occupying active product documentation.

No other phase report was retained because its durable content was merged into current documentation and no legal, licensing, or release-reproducibility requirement depended on keeping the duplicate file in the working tree.
