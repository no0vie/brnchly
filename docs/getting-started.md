# Getting started

## Choose a package

Use `@no0vie/brnchly-core` for data, validation, layout, traversal, playback, routing, or viewport math without React. Add `@no0vie/brnchly-react` when you need the interactive browser renderer. Package availability on npm is not yet verified in this phase.

```sh
npm install @no0vie/brnchly-core
# React applications:
npm install @no0vie/brnchly-react react react-dom
```

Both packages are ESM-only, include declarations, and require Node.js 20+ for supported tooling/consumption. The React package accepts React/React DOM `>=18 <20`.

## Create and validate a graph

```ts
import { validateEvolutionGraph, type EvolutionGraph } from "@no0vie/brnchly-core";

export const graph: EvolutionGraph = {
  schemaVersion: 2,
  id: "learning-path",
  title: "Learning path",
  branches: [{ id: "web", title: "Web", color: "#2563eb" }],
  stages: [{ id: "foundation", title: "Foundation", order: 0 }],
  lanes: [{ id: "frontend", title: "Frontend", coordinate: 0 }],
  nodes: [
    {
      id: "html",
      title: "HTML",
      branchId: "web",
      stageId: "foundation",
      laneId: "frontend",
      status: "available",
    },
  ],
  edges: [],
};

const result = validateEvolutionGraph(graph);
if (!result.valid) console.error(result.issues);
```

## Render it

```tsx
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";
import { graph } from "./graph";

export function LearningPath() {
  return (
    <main style={{ minHeight: 600 }}>
      <GraphRenderer graph={graph} layout="stage-lane" />
    </main>
  );
}
```

The `layout` prop is required. Import CSS once. The renderer is client-side browser UI; SSR/hydration is not a verified integration target.

## Own your data

Treat graphs, sets, selection, and camera values as immutable caller-owned inputs. Renderer edit callbacks are requests, not mutations. Construct a new graph/state value and pass it back. See [Renderer](renderer.md) and [Integration](integration.md).

## Try the repository app

```sh
nvm use
npm ci
npm run dev
```

The demo includes Classic, Graph, and Editor modes. `UniversalEditor` is not exported from the published packages.
