# brnchly

`brnchly` is an evolution-graph toolkit: a framework-independent graph model and algorithms, a React renderer, and a browser demo/editor for authoring and previewing graph documents.

> Release status: the workspace packages are versioned `1.0.0`, but this repository is preparing a 1.0.0 release candidate. On 2026-10-29, unauthenticated npm registry lookups returned `E404` for both names. They are not publicly visible from that check; scope ownership and publish permission remain unverified, so do not assume the packages are installable.

## Packages

- `@no0vie/brnchly-core`: ESM TypeScript declarations and DOM-free graph schema, validation, migration, serialization, layout, traversal, routing, playback, and viewport utilities.
- `@no0vie/brnchly-react`: `GraphRenderer`, built on core. The peer range permits React 18 and 19, but only React 18 has been verified.
- The Ant Design demo and `UniversalEditor` live in this repository and are **not** exported by either package.

## Quick start: core

```sh
npm install @no0vie/brnchly-core
```

```ts
import { layoutGraph, validateEvolutionGraph, type EvolutionGraph } from "@no0vie/brnchly-core";

const graph: EvolutionGraph = {
  schemaVersion: 2,
  id: "example",
  title: "Example",
  branches: [{ id: "main", title: "Main", color: "#6366f1" }],
  nodes: [{ id: "start", title: "Start", branchId: "main", status: "available" }],
  edges: [],
};

const validation = validateEvolutionGraph(graph);
if (!validation.valid) throw new Error(validation.issues.map(({ message }) => message).join(" "));

const layout = layoutGraph(graph, { strategy: "horizontal-dag" });
```

## Quick start: React

```sh
npm install @no0vie/brnchly-core @no0vie/brnchly-react react react-dom
```

```tsx
import { useState } from "react";
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";
import type { EvolutionGraph } from "@no0vie/brnchly-core";

const graph: EvolutionGraph = {
  schemaVersion: 2,
  id: "example",
  title: "Example",
  branches: [{ id: "main", title: "Main", color: "#6366f1" }],
  nodes: [{ id: "start", title: "Start", branchId: "main", status: "available" }],
  edges: [],
};

export function Example() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  return (
    <div style={{ width: "100%", minHeight: 600 }}>
      <GraphRenderer
        graph={graph}
        layout="horizontal-dag"
        selectedNodeId={selectedNodeId}
        onSelectedNodeChange={setSelectedNodeId}
      />
    </div>
  );
}
```

`layout` is required. Import the stylesheet once and give the renderer practical viewport space; the supplied stylesheet currently sets the viewport to `min(68vh, 720px)` with a `520px` minimum height.

Inputs are caller-owned and treated as immutable. The renderer does not write layout, selection, camera, connection, or node-position changes back into `graph`; use callbacks to create a new graph/state value and pass it back. Selection and camera each support controlled (`selectedNodeId`, `camera`) or initially uncontrolled (`defaultSelectedNodeId`, `defaultCamera`) use.

## Editor and demo

Run the repository app to explore Classic, Graph, and Editor modes:

```sh
nvm use
npm ci
npm run dev
```

Editor documents and autosave use browser storage. Import/export is JSON-based. The editor is an example application, not a published package API. A GitHub Pages workflow is prepared for the repository path `/brnchly/`; no deployment is claimed here.

## Documentation

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Graph schema](docs/graph-schema.md)
- [Public API](docs/public-api.md)
- [Renderer](docs/renderer.md)
- [Styling](docs/styling.md)
- [Playback](docs/playback.md)
- [Import and export](docs/import-export.md)
- [Integration](docs/integration.md)
- [Accessibility](docs/accessibility.md)
- [Migration guide](docs/migration-guide.md)
- [Release process](docs/release.md)
- [Performance methodology](docs/performance.md)

## Browser and runtime compatibility

- React peer range: React/React DOM `>=18 <20`; current verification covers React 18 only, so React 19 compatibility is not claimed.
- Automated browser coverage is Chromium through Playwright. Firefox, WebKit, mobile browsers, and full assistive-technology combinations are not release-tested.
- The renderer uses browser APIs including DOM measurement, pointer events, `ResizeObserver`, animation frames, and `performance`; it is a client/browser component.
- Core is kept free of DOM globals. Package-root module evaluation is tested in the project test environment. Server rendering/hydration is not an advertised or verified capability; load and render `GraphRenderer` on the client.
- Published packages are ESM-only and require Node.js 20+ for tooling/module consumption.

## Current limitations

- The editor is repository-only and persists locally; there is no collaboration service or backend.
- Large graphs can produce slow frames and long tasks; see [performance notes](docs/performance.md). Virtualization is not implemented.
- Accessibility coverage is partial. Keyboard basics and reduced motion are covered, but no complete WCAG audit has been performed.
- The renderer owns its toolbar/details UI; low-level node rendering customization is not a public API.
- Stage/lane layout requires coherent stage and lane references; validation rejects incomplete or inconsistent documents.

## Development

Node `20` is pinned in `.nvmrc`.

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:dry-run
npm run test:consumer
npm run test:ci:e2e
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and test expectations.

## Contributing

Issues and focused pull requests are welcome. By contributing, you agree that your contribution is distributed under the repository license. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change.

## License

[MIT](LICENSE) © 2026 Eugene Malin.
