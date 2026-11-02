# Release process

## Policy

The two packages use semantic versioning and release together. `@no0vie/brnchly-react` currently pins the matching core version.

- Patch: compatible fixes, documentation, and internal changes.
- Minor: backward-compatible public API additions or deprecations.
- Major: removed/renamed exports, incompatible behavior/type changes, peer-range breaks, or incompatible persisted-schema changes.

The manifests target `1.0.0`, but that version remains a release candidate until publication is verified. Never reuse a version after successful publication.

## Required local checks

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
npm run test:e2e
npm audit
npm audit --omit=dev
git diff --check
```

Also inspect tarball contents, package versions/dependencies, licenses, changelog, docs links, and source maps.

## Registry preflight

With the intended authorized account, verify identity, scope access, and target versions:

```sh
npm whoami
npm view @no0vie/brnchly-core name version
npm view @no0vie/brnchly-react name version
npm view @no0vie/brnchly-core@1.0.0 version
npm view @no0vie/brnchly-react@1.0.0 version
```

An `E404` does not by itself prove package-name availability or publish authority.

## Protected publishing

`.github/workflows/publish.yml` is manual and defaults to validation-only. For the current candidate it restricts refs and versions to the configured `1.0.0` policy, validates tests/packages/consumer installation, checks npm identity and unpublished target versions, requires the protected `npm` environment, and publishes core before React with provenance.

Confirm whether the repository uses an npm automation token, trusted publishing/OIDC, or both as intentionally configured. Do not weaken unpublished-version checks without a documented recovery path. Publication is not atomic: if core succeeds and React fails, owner review is required before resuming.

Do not make publishing automatic on push/tag. Do not publish, tag, or push without explicit owner approval.

## GitHub Pages

`.github/workflows/pages.yml` builds the app for `/brnchly/`, uploads `dist`, and deploys through the `github-pages` environment. Configure Pages to use GitHub Actions and verify the resulting URL before documenting a live demo. Workflow configuration is not proof of deployment.

## After release

Verify registry metadata, provenance, tarball contents, and a clean registry-based consumer install. Only then create/confirm release notes and update RC wording in README/changelog. Record actual CI, publication, and Pages results rather than inferring them from local checks.
