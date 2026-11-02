# brnchly

`brnchly` is a toolkit for modelling, laying out, rendering, and editing evolution graphs. It provides a framework-independent TypeScript core, an interactive React renderer, and a standalone browser demo/editor.

> **Release status:** the package manifests target `1.0.0`, but npm publication, GitHub Actions execution, and GitHub Pages deployment are not confirmed. Treat this repository as a v1.0 release candidate, not as evidence that the packages are already available from npm.

## Features

- Versioned EvolutionGraph schema v2 with validation, migration, parsing, and serialization.
- Deterministic DAG, radial, manual, and stage/lane layouts.
- Traversal, edge routing, playback planning, and viewport utilities without React or DOM dependencies.
- React `GraphRenderer` with pan/zoom, selection, highlighting, editing callbacks, controlled camera state, and an imperative focus API.
- Standalone Classic, Graph, and Editor modes with local browser persistence and JSON import/export.

## Architecture

- `@no0vie/brnchly-core` — schema and pure graph algorithms; no React or DOM dependency.
- `@no0vie/brnchly-react` — browser renderer built on core; React and React DOM are peers.
- Repository application — demo, Classic compatibility UI, playback composition, performance harness, and `UniversalEditor`. It is not an npm API.

Dependencies flow from the application to React to core. See [Architecture](docs/architecture.md).

## Installation

Once the packages are published to npm:

```sh
npm install @no0vie/brnchly-core @no0vie/brnchly-react react react-dom
```

For the current repository candidate, use the npm workspace or the tarballs produced by `npm run test:consumer`; do not assume registry availability.

## Quick example

```tsx
import { useState } from "react";
import type { EvolutionGraph } from "@no0vie/brnchly-core";
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";

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

`layout` is required. Import the stylesheet once and provide a practical viewport size. Graphs and controlled values remain caller-owned; callbacks request changes and do not mutate the input graph.

## Local development

Node 20 is selected by `.nvmrc`.

```sh
nvm use
npm ci
npm run dev
```

The application exposes Classic, Graph, and Editor modes. Editor documents are stored in browser local storage.

## Documentation

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [EvolutionGraph schema](docs/graph-schema.md)
- [Public API](docs/api.md)
- [Standalone editor](docs/editor.md)
- [Development and performance](docs/development.md)
- [Release process](docs/release.md)
- [Known limitations](docs/limitations.md)
- [Repository cleanup report](docs/repository-cleanup-report.md)

No live demo URL is listed because a successful deployment has not been verified.

## Compatibility

Both packages are ESM-only and include TypeScript declarations. Node 20+ is the supported Node/tooling environment. Core is DOM-free; `GraphRenderer` is client/browser UI and uses DOM measurement, pointer events, `ResizeObserver`, animation frames, and `performance`. The peer range permits React 18 and 19, but repository verification currently covers React 18 only.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and required checks.

## License

[MIT](LICENSE) © 2026 Eugene Malin.
