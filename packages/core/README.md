# @no0vie/brnchly-core

Framework-independent ESM TypeScript APIs for EvolutionGraph schema v2, validation, migration, serialization, deterministic layout, traversal, routing, playback, and viewport calculations. Core has no React or DOM dependency.

> The repository is a v1.0 release candidate; npm publication is not confirmed. The install command applies once the package is published.

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
const layout = layoutGraph(graph, { strategy: "horizontal-dag" });
```

The package is ESM-only, includes TypeScript declarations, and supports Node 20+ as its declared Node environment. See the repository [API documentation](../../docs/api.md) and [schema guide](../../docs/graph-schema.md).
