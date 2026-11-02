# Contributing

Thank you for contributing to brnchly.

## Setup

Use the Node version in `.nvmrc` (Node 20) and npm from the root manifest.

```sh
nvm use
npm ci
npm run dev
```

Do not commit generated `dist`, Playwright reports, or local performance output unless a task explicitly requires an artifact.

## Change workflow

1. Keep changes focused and preserve package boundaries: core must remain DOM/framework-free; React must not depend on the demo/editor or Ant Design.
2. For behavior changes and bug fixes, add a failing focused test first, implement the smallest fix, then run the full relevant suite.
3. Treat graph inputs as immutable and keep state ownership explicit. Renderer callbacks request application changes; they must not mutate caller data.
4. Update documentation and `CHANGELOG.md` for public API, schema, compatibility, or release-process changes.
5. Do not add public exports casually; exported names and persisted schema affect semantic versioning.

## Quality checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:dry-run
npm run test:consumer
```

For browser-facing changes, install Playwright Chromium if needed and run:

```sh
npx playwright install chromium
npm run test:smoke
```

Run the broader `npm run test:e2e` when the change touches editor, playback, reduced motion, or application interactions. Performance profiling is non-gating and should follow `docs/development.md`.

## Documentation

Use English for primary project documentation. Keep examples compilable against package-root exports, include the required `GraphRenderer` `layout` prop, import the stylesheet, and show adequate container sizing. Do not claim SSR, browsers, accessibility, package publication, CI, or deployments without evidence.

## Pull requests

Describe the problem, approach, tests run, user-visible impact, and any limitations. Link an issue when applicable. Keep generated/formatting noise out of unrelated changes.

By submitting a contribution, you agree it may be distributed under the [MIT License](LICENSE).
