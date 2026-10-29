# Release process

## Versioning policy

Published packages use semantic versioning and are released together while `@no0vie/brnchly-react` pins its core dependency.

- **Patch:** compatible fixes, documentation, and internal changes.
- **Minor:** backward-compatible public API additions or deprecations.
- **Major:** removed/renamed public exports, incompatible type/behavior changes, peer-range breaks, or incompatible persisted schema changes.

The current manifests intentionally remain at the requested target `1.0.0`. They describe an unpublished v1 candidate artifact, not a completed npm release. Actual publication is approval-gated; do not change the target version or treat it as published until the protected workflow succeeds. Do not reuse the version after publication.

## Required checks

```sh
nvm use
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:dry-run
npm run test:consumer
npm audit --omit=dev
npm run test:ci:e2e
```

Also review tarball contents, changelog, docs links, licenses, package versions/dependencies, and registry ownership/name availability.

## Registry verification

Before publishing, verify both scoped package names and access with the intended npm account:

```sh
npm view @no0vie/brnchly-core name version
npm view @no0vie/brnchly-react name version
npm whoami
```

A not-found response can indicate availability or missing access depending on scope visibility; confirm while authenticated. Unauthenticated lookups on 2026-10-29 returned `E404` for both package names, so neither was publicly visible from this environment. That result does not prove scoped-name availability or publish authority. Authenticated scope ownership and permission verification remains a release blocker.

## Manual publishing workflow

`.github/workflows/publish.yml` is `workflow_dispatch` only and fails unless dispatched from `main` or the exact release tag `v1.0.0`. It defaults to validation-only. Actual publishing requires explicitly setting `dry_run` to false and approval from the protected `npm` environment. The workflow requires that both manifests and React’s core dependency are exactly `1.0.0`, runs authenticated `npm whoami`, and refuses to continue unless `npm view` returns the expected unpublished `E404` for both target versions. It publishes core before React with public access and provenance.

Configure the protected `npm` environment with required reviewers and an `NPM_TOKEN` environment secret that can run the identity and registry preflights. Configure npm trusted publishing for this repository/environment before using provenance. Never publish from an unreviewed `main` commit or tag, and never make publishing automatic on push/tag. Confirm the workflow run, package versions, changelog, npm identity, and expected unpublished status before approving the environment. The `1.0.0` files remain an unpublished v1 candidate artifact until that approval-gated publish completes.

## Pages

`.github/workflows/pages.yml` prepares the demo at `/brnchly/` on manual dispatch or `main` push and deploys through the `github-pages` environment. Configure repository Pages to use GitHub Actions. The workflow is prepared only; this document does not claim it has run or deployed.

## After release

Verify registry metadata and a clean consumer install, create the corresponding Git tag/release notes, and move changelog entries from release-candidate wording only when facts support it. Do not produce a final Phase 5 RC report until all required external checks have evidence.
