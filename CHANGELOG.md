# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [1.0.0 RC] - 2026-10-29

Release-candidate preparation; not a statement that packages have been published.

### Added

- Extracted ESM `@no0vie/brnchly-core` and `@no0vie/brnchly-react` package boundaries with TypeScript declarations.
- Versioned evolution-graph schema, validation, migration, serialization, layout, traversal, routing, playback, and viewport APIs.
- React `GraphRenderer` with controlled/uncontrolled selection and camera, imperative focus methods, highlighting, editing callbacks, and exported stylesheet.
- Repository demo/editor with local documents, undo/redo, import/export, preview, and browser persistence.
- Package dry-run and isolated consumer validation.
- Phase 5 documentation, CI, manual protected publishing, and GitHub Pages workflow preparation.

### Changed

- Node.js 20 is the pinned minimum for development and package metadata.
- Vite Pages builds can use `/brnchly/` without changing local `/` development.

### Known limitations

- Unauthenticated npm lookups returned `E404` for both package names; scoped-name ownership, publish permission, and publication remain unverified.
- CI and Pages/publishing workflows are prepared but are not claimed to have run or passed.
- Automated browser coverage is Chromium; Firefox/WebKit and full accessibility conformance are not verified.
- The editor is not a published package API and uses local browser storage.
- Large-graph frame and long-task variability remains; see `docs/performance.md`.

[1.0.0 RC]: https://github.com/no0vie/brnchly/releases
