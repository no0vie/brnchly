# Phase 5 — Release Candidate

Date: 2026-10-29

Status vocabulary used throughout this report: **Passed**, **Failed**, **Blocked**, and **Not run**. A passing local result is not evidence that GitHub Actions, npm publication, or GitHub Pages deployment passed.

## 1. Executive summary

**Recommendation: Ready with Limitations for owner RC review.**

| Criterion                                      | Status      | Evidence / decision                                                                                                                                                                  |
| ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local release verification                     | **Passed**  | Final format, format check, lint, typecheck, 19-file/115-test unit suite, build, package dry-run, isolated consumer test, audits, production profile, and `git diff --check` passed. |
| Full local Playwright after package extraction | **Passed**  | 18 passed; 1 intentional project mismatch was skipped.                                                                                                                               |
| Owner release-candidate review                 | **Not run** | The repository is ready to be presented to the owner, but the owner has not yet reviewed or approved this release candidate.                                                         |
| npm publication                                | **Blocked** | Packages were not published. Authenticated npm identity, scope ownership, target-version state, and publish authority still require verification and explicit approval.              |
| GitHub Actions CI                              | **Not run** | CI workflows are prepared but have never been executed in GitHub Actions; this report does not claim CI passed.                                                                      |
| GitHub Pages                                   | **Not run** | Pages support is prepared, but the workflow has not been executed and no deployment has been accessed.                                                                               |
| Release tag                                    | **Blocked** | Tag creation requires explicit owner approval and must follow successful CI and publication/deployment decisions.                                                                    |

No required local gate is reported as failed. Publication, deployment, and tagging remain blocked rather than implicitly authorized by this recommendation.

## 2. Architecture

| Criterion                  | Status      | Evidence / boundary                                                                                                                                                                                                                                                  |
| -------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer separation           | **Passed**  | `@no0vie/brnchly-core` is the DOM-free schema/algorithm layer; `@no0vie/brnchly-react` is the browser renderer over core; the repository app contains the demo, editor, playback composition, and performance harness. Dependencies flow app → React package → core. |
| Core package isolation     | **Passed**  | Core has no React, storage, application, or DOM dependency according to `docs/architecture.md`; distribution validation also rejects React imports in the built core JavaScript.                                                                                     |
| React package isolation    | **Passed**  | React and React DOM are peers. Distribution validation rejects Ant Design code/imports in the built React package.                                                                                                                                                   |
| Repository app boundary    | **Passed**  | The app still uses Ant Design and contains `UniversalEditor`; neither Ant Design nor the editor is exported by either package.                                                                                                                                       |
| Server rendering/hydration | **Not run** | Rendering is documented as browser/client behavior; SSR and hydration are not advertised or verified.                                                                                                                                                                |

## 3. API

| Criterion                     | Status      | Evidence / boundary                                                                                                                                                               |
| ----------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core public API               | **Passed**  | Package-root exports cover graph schema/types, validation, migration, parsing/serialization, layout, traversal, routing, playback, and mathematical viewport utilities.           |
| React public API              | **Passed**  | The package exports `GraphRenderer` and its public types; `@no0vie/brnchly-react/styles.css` is the supported stylesheet subpath.                                                 |
| Controlled ownership contract | **Passed**  | Inputs are caller-owned and treated as immutable. Selection, camera, node-position, connection, and layout changes cross the renderer boundary through callbacks.                 |
| Internal-path stability       | **Passed**  | Only package-root exports and the React stylesheet subpath are public; `src/` files, CSS implementation classes, app components, editor code, and playback hooks remain internal. |
| React 18 compatibility        | **Passed**  | React 18 was verified by the local package/consumer checks.                                                                                                                       |
| React 19 compatibility        | **Not run** | The peer range is `>=18 <20`, but React 19 has not been verified and is not claimed compatible by this report.                                                                    |

## 4. Package and application boundaries

| Criterion                          | Status      | Evidence / boundary                                                                                                                                                         |
| ---------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package dependency direction       | **Passed**  | `@no0vie/brnchly-react@1.0.0` depends exactly on `@no0vie/brnchly-core@1.0.0`; core does not depend on React.                                                               |
| Node/runtime metadata              | **Passed**  | Root and package manifests require Node.js 20 or newer; `.nvmrc` is used by the workflows.                                                                                  |
| Module format                      | **Passed**  | Both packages expose ESM JavaScript and TypeScript declarations from `dist`.                                                                                                |
| Ant Design exclusion from packages | **Passed**  | The app still has the `antd` dependency, but the package manifests do not; the package distribution script also scans the React bundle and rejects Ant Design code/imports. |
| Editor as package API              | **Passed**  | The editor remains repository-only and has no package compatibility promise.                                                                                                |
| Backend/collaboration boundary     | **Not run** | No backend or collaboration service is part of this release candidate; editor persistence is local browser storage.                                                         |

## 5. Package outputs

| Criterion                    | Status      | Evidence / output                                                                                                                                                                                           |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core output                  | **Passed**  | The core manifest exposes `dist/index.js` and `dist/index.d.ts`. Its tarball allowlist includes `dist`, `README.md`, and `LICENSE`.                                                                         |
| React output                 | **Passed**  | The React manifest exposes `dist/index.js`, `dist/index.d.ts`, and `dist/styles.css`. Its tarball allowlist includes `dist`, `README.md`, and `LICENSE`.                                                    |
| Tarball content assertions   | **Passed**  | `npm run pack:dry-run` passed for both packages and requires the documented runtime, declaration, README, license, and React stylesheet files. It rejects `src`, tests, editor, demo, and Ant Design paths. |
| React externalization        | **Passed**  | Distribution validation confirmed React remains an import in the built React JavaScript rather than being bundled.                                                                                          |
| Published registry artifacts | **Not run** | No package has been published, so registry tarballs and post-publication metadata do not exist to verify.                                                                                                   |

## 6. Consumer verification

| Criterion                        | Status      | Evidence                                                                                                                                                        |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolated tarball installation    | **Passed**  | `npm run test:consumer` generated both tarballs, installed them into `examples/react-vite-consumer`, and verified the lockfile resolved the generated tarballs. |
| Cross-package version resolution | **Passed**  | The consumer check verified the installed React package's core dependency equals the installed core version.                                                    |
| Consumer typecheck               | **Passed**  | The isolated consumer's strict typecheck passed.                                                                                                                |
| Consumer production build        | **Passed**  | The isolated consumer's production build passed.                                                                                                                |
| Registry-based consumer install  | **Not run** | Packages are unpublished; installation from npm could not be tested.                                                                                            |

## 7. Browser verification

| Criterion                                    | Status      | Evidence                                                                                                    |
| -------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| Full local Playwright suite after extraction | **Passed**  | 18 tests passed; 1 intentional project mismatch was skipped.                                                |
| Chromium coverage                            | **Passed**  | The configured projects use desktop Chromium, including a reduced-motion project.                           |
| Reduced-motion behavior                      | **Passed**  | The local suite includes the configured Chromium reduced-motion project and passed the applicable coverage. |
| Firefox                                      | **Not run** | No Firefox project is configured or claimed.                                                                |
| WebKit                                       | **Not run** | No WebKit project is configured or claimed.                                                                 |
| Mobile browser coverage                      | **Not run** | No mobile-browser release verification is claimed.                                                          |
| Headed Chrome/GPU profile                    | **Not run** | Browser evidence is from headless Chromium, not a headed GPU profile.                                       |

## 8. Production performance

| Criterion                      | Status      | Evidence                                                                                                    |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| Production profile command     | **Passed**  | `npm run profile:production` built the app and passed 1 Playwright performance test against `vite preview`. |
| Stable production artifact     | **Passed**  | `artifacts/performance/phase-5-production-preview.json` exists and is documented in `docs/performance.md`.  |
| Performance as a CI gate       | **Not run** | Performance profiling is intentionally omitted from general CI and has no timing assertions.                |
| Long-duration memory/leak soak | **Not run** | The artifact contains end-of-scenario heap point samples, not retained-heap or leak proof.                  |

The committed production-preview artifact records three samples per deterministic graph, nearest-rank p95, one worker, reduced motion, Node 24.16.0, bundled headless Chromium 156.0.8078.4, and macOS 25.6.0 arm64:

| Nodes | Initial p95 | Dependency p95 | Lane p95 | Playback p95 | Frame p95 | Long-task p95 | Memory point sample |
| ----: | ----------: | -------------: | -------: | -----------: | --------: | ------------: | ------------------: |
|   100 |    103.2 ms |        25.0 ms |  29.3 ms |      29.0 ms |   16.8 ms | none observed |             13.4 MB |
|   500 |    138.7 ms |       134.0 ms |  22.4 ms |     118.4 ms |  116.7 ms |      113.0 ms |             31.2 MB |
| 1,000 |    174.4 ms |        44.2 ms |  30.8 ms |      46.0 ms |  250.0 ms |      257.0 ms |             68.0 MB |

These values are factual snapshots, not compatibility guarantees or passing timing gates. Layout isolation is unsupported by the harness because layout runs synchronously inside renderer memoization.

## 9. Accessibility

| Criterion                          | Status      | Evidence                                                                                      |
| ---------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| Keyboard basics and reduced motion | **Passed**  | Existing documented coverage includes keyboard basics and reduced-motion behavior.            |
| Full WCAG audit                    | **Not run** | No complete WCAG conformance audit was performed.                                             |
| Full assistive-technology matrix   | **Not run** | No complete browser/screen-reader/assistive-technology combination matrix was run.            |
| WCAG conformance claim             | **Blocked** | A conformance claim requires the missing full audit and manual assistive-technology evidence. |

## 10. Security and dependency audit

| Criterion                                         | Status      | Evidence                                                                                                                                             |
| ------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full dependency audit                             | **Passed**  | `npm audit` completed with 0 vulnerabilities.                                                                                                        |
| Production dependency audit                       | **Passed**  | `npm audit --omit=dev` completed with 0 vulnerabilities.                                                                                             |
| Known remaining npm vulnerability                 | **Passed**  | The final audit evidence reports none.                                                                                                               |
| Authenticated npm account/permission verification | **Blocked** | Unauthenticated package-name lookups returned `E404`, but that does not establish scope ownership, package-name availability, or publish permission. |

## 11. CI and release automation

| Criterion                              | Status      | Evidence                                                                                                                                                                                                       |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI workflow preparation                | **Passed**  | `.github/workflows/ci.yml` defines quality and Chromium smoke jobs using Node from `.nvmrc`.                                                                                                                   |
| CI execution in GitHub Actions         | **Not run** | The workflow has never been executed in GitHub Actions; **CI has not passed**.                                                                                                                                 |
| Protected publish workflow preparation | **Passed**  | `.github/workflows/publish.yml` is manual, defaults to validation-only, restricts refs to `main` or `v1.0.0`, validates manifests/tests/packages/consumer, and gates publishing through the `npm` environment. |
| Publish workflow execution             | **Not run** | Neither validation-only nor live publication is claimed to have run in GitHub Actions.                                                                                                                         |
| Pages workflow preparation             | **Passed**  | `.github/workflows/pages.yml` builds with `/brnchly/`, uploads `dist`, and deploys through the `github-pages` environment.                                                                                     |
| Pages workflow execution               | **Not run** | It has not been dispatched or observed on GitHub Actions.                                                                                                                                                      |

Exact local verification commands whose final results are represented in this report:

```sh
nvm use
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:dry-run
npm run test:consumer
npm run test:e2e
npm run profile:production
npm audit
npm audit --omit=dev
git diff --check
```

Final results: formatting and all listed static/build/package/consumer checks passed; `npm test` passed 19 files and 115 tests; full local Playwright passed 18 with 1 intentional project mismatch skipped; the production profile passed 1 test; both audits reported 0 vulnerabilities; and `git diff --check` passed.

## 12. Documentation

| Criterion                                  | Status      | Evidence                                                                                                                                                             |
| ------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture/API/integration documentation | **Passed**  | Repository docs cover architecture, public API, renderer, styling, schema, playback, import/export, integration, accessibility, migration, release, and performance. |
| Release status wording                     | **Passed**  | README, changelog, and release docs describe `1.0.0` as an unpublished release candidate and do not claim npm publication, CI success, or Pages deployment.          |
| Production performance documentation       | **Passed**  | `docs/performance.md` documents the committed Phase 5 production-preview artifact and its methodology/limitations.                                                   |
| Deployed documentation/site access         | **Not run** | Pages was not deployed or accessed.                                                                                                                                  |

## 13. Demo readiness

| Criterion                             | Status      | Evidence                                                                                                                       |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Local demo production build           | **Passed**  | `npm run build` passed.                                                                                                        |
| Local app browser flows               | **Passed**  | The full local Chromium suite passed its applicable tests after extraction.                                                    |
| Pages-path build preparation          | **Passed**  | `npm run build:pages` is configured to use `/brnchly/` and copy `dist/index.html` to `dist/404.html`.                          |
| Live demo deployment                  | **Not run** | No GitHub Pages deployment has occurred.                                                                                       |
| Live URL smoke/access check           | **Not run** | No deployed Pages URL has been accessed.                                                                                       |
| Ant Design application bundle warning | **Passed**  | The build completed, but the existing Ant Design app chunk warning remains and is recorded as a limitation rather than hidden. |

## 14. Known limitations

| Criterion                           | Status      | Limitation                                                                                                                                                          |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Large-graph frame consistency       | **Failed**  | The production snapshot records frame p95 of 116.7 ms at 500 nodes and 250.0 ms at 1,000 nodes; this remains material variability, although timings are non-gating. |
| 1,000-node long tasks               | **Failed**  | The production artifact records a 257.0 ms long-task p95, above the documentation's suggested non-gating 200 ms investigation threshold.                            |
| Ant Design app chunk size           | **Failed**  | The existing >500 kB Ant Design application chunk warning remains. The app still has Ant Design; the publishable packages do not.                                   |
| Full accessibility conformance      | **Not run** | Full WCAG and assistive-technology verification remain incomplete.                                                                                                  |
| Multi-browser support evidence      | **Not run** | Firefox, WebKit, and mobile browsers remain unverified.                                                                                                             |
| React 19 evidence                   | **Not run** | React 19 remains inside the declared peer range but has not been verified.                                                                                          |
| npm ownership/publication authority | **Blocked** | Authenticated identity and permission checks are outstanding.                                                                                                       |
| External automation evidence        | **Blocked** | Publication, deployment, and tagging must wait for GitHub Actions execution and explicit approvals.                                                                 |

## 15. Breaking changes

| Criterion                       | Status      | Evidence / impact                                                                                                                                                                   |
| ------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 5 extraction boundary     | **Passed**  | The candidate introduces explicit `@no0vie/brnchly-core` and `@no0vie/brnchly-react` package-root APIs and moves the reusable renderer/core implementation behind those boundaries. |
| Published-consumer breakage     | **Not run** | No prior npm package release is verified in the repository, and these packages have not been published; registry consumer migration cannot be tested.                               |
| Internal import compatibility   | **Blocked** | Repository/internal `src/` paths are not public APIs and must not be presented as stable compatibility paths. Consumers must use package-root exports.                              |
| Persisted schema compatibility  | **Passed**  | The public docs define the graph schema as a versioned persisted-data contract with validation and migration APIs; the local 115-test suite passed.                                 |
| Version reuse after publication | **Blocked** | `1.0.0` must not be reused after a successful publication. Any post-publication incompatible change requires the semantic-versioning policy in `docs/release.md`.                   |

## 16. Release checklist and commands

### Completed local checklist

| Criterion                                                     | Status      |
| ------------------------------------------------------------- | ----------- |
| Format and format check                                       | **Passed**  |
| Lint                                                          | **Passed**  |
| Typecheck                                                     | **Passed**  |
| Unit/component tests: 19 files, 115 tests                     | **Passed**  |
| Application/package build                                     | **Passed**  |
| Two-package pack dry-run                                      | **Passed**  |
| Isolated tarball consumer typecheck/build                     | **Passed**  |
| Full local Chromium Playwright: 18 passed, 1 intentional skip | **Passed**  |
| Production profile: 1 test and committed stable artifact      | **Passed**  |
| Full and production npm audits: 0 vulnerabilities             | **Passed**  |
| Whitespace/error diff check                                   | **Passed**  |
| GitHub Actions CI                                             | **Not run** |
| Authenticated npm preflight                                   | **Blocked** |
| npm publication                                               | **Blocked** |
| GitHub Pages deployment/access                                | **Not run** |
| Release tag                                                   | **Blocked** |

### npm publication sequence — instructions only, do not execute without approval

The safe order is identity and registry verification, then tarball inspection, then core-before-React publication. These commands were **not run** as publication operations:

```sh
npm whoami
npm view @no0vie/brnchly-core name version
npm view @no0vie/brnchly-react name version
npm view @no0vie/brnchly-core@1.0.0 version
npm view @no0vie/brnchly-react@1.0.0 version
npm pack packages/core --dry-run
npm pack packages/react --dry-run
npm publish packages/core --access public --provenance
npm publish packages/react --access public --provenance
```

Expected `E404` for an unpublished target version is only acceptable after `npm whoami` confirms the intended authenticated owner and the owner confirms scope/package authority. Stop if either target version exists, identity is wrong, permission is unclear, or tarball contents differ from the reviewed candidate. The repository's preferred live path is the protected manual workflow, with `dry_run=false`, not an unreviewed local publish.

### GitHub Actions and Pages — instructions only

1. **Blocked — owner action:** merge/approve the exact RC commit on `main` and allow `.github/workflows/ci.yml` to run; inspect both `quality` and `chromium-smoke`. Do not proceed on a failed, cancelled, or missing job.
2. **Not run — optional publish validation:** dispatch `.github/workflows/publish.yml` with its default `dry_run=true` from `main` and review the validation job before considering live publication.
3. **Blocked — repository configuration:** configure Pages to use GitHub Actions and confirm the `github-pages` environment/permissions.
4. **Not run — manual Pages dispatch:** after approval, run:

   ```sh
   gh workflow run pages.yml --ref main
   gh run list --workflow pages.yml
   ```

   Select the resulting run ID and inspect it with:

   ```sh
   gh run watch RUN_ID
   gh run view RUN_ID --log
   ```

5. **Not run — post-deploy verification:** obtain the deployment URL from the successful workflow/environment, open it, and smoke-test the repository-path deployment. No URL is claimed before this succeeds.

### Remaining manual approvals

| Approval / authority             | Status      | Required action                                                                                                         |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Owner RC acceptance              | **Blocked** | Owner reviews this report, diff, package API, artifacts, and known limitations.                                         |
| GitHub Actions result acceptance | **Blocked** | Owner reviews the first actual CI run; local results cannot substitute for it.                                          |
| npm identity/scope authority     | **Blocked** | Authorized publisher runs authenticated `npm whoami`/`npm view` checks and confirms scope permission.                   |
| Protected `npm` environment      | **Blocked** | Configure required reviewers, `NPM_TOKEN`, and trusted publishing/provenance, then explicitly approve live publication. |
| GitHub Pages deployment          | **Blocked** | Owner explicitly approves dispatch/deployment and validates the live URL.                                               |
| Release tag/release notes        | **Blocked** | Owner explicitly approves creation only after the chosen CI/publication/deployment gates complete.                      |

## 17. Recommendation

**Ready with Limitations for owner RC review.**

| Decision criterion                 | Status      | Recommendation                                                                                                                                           |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Present candidate for owner review | **Passed**  | Local quality, package, consumer, Chromium, audit, build, and production-profile evidence is sufficient for RC review.                                   |
| Publish packages                   | **Blocked** | Do not publish until authenticated npm ownership/permission checks pass, the owner explicitly approves, and the protected workflow is reviewed/executed. |
| Deploy GitHub Pages                | **Blocked** | Do not claim or perform deployment without explicit approval, repository Pages configuration, workflow execution, and live URL verification.             |
| Create `v1.0.0` tag/release        | **Blocked** | Do not tag until the owner accepts the RC and required external automation/authority checks have completed.                                              |
| Claim CI success                   | **Not run** | CI workflows are prepared but have never run in GitHub Actions; no CI pass claim is permitted.                                                           |

The release candidate is locally verified but externally unproven. The explicit limitations accepted for owner review are Chromium-only browser evidence, React 18-only verification, incomplete WCAG/assistive-technology coverage, large-graph frame/long-task variability, and the remaining Ant Design application chunk warning. Packages exclude Ant Design even though the repository app still uses it.
