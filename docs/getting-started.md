# Getting started

Use `@no0vie/brnchly-core` for schema, validation, migration, layout, traversal, routing, playback, and viewport math. Add `@no0vie/brnchly-react` for the interactive browser renderer.

The repository is a v1.0 release candidate. Registry publication is not confirmed, so the commands below apply once the packages are published. Current contributors should use the workspace and distribution checks instead.

```sh
npm install @no0vie/brnchly-core
npm install @no0vie/brnchly-react react react-dom
```

Both packages are ESM-only and include TypeScript declarations. React and React DOM `>=18 <20` are peers of the React package.

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
if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join(" "));
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

Import CSS once, pass the required `layout`, and provide enough container space. The renderer is browser UI; SSR markup and hydration are not supported claims.

Treat graph data, sets, selection, and camera values as immutable caller-owned inputs. Apply callback results to new state and pass that state back.

## Run the repository app

```sh
nvm use
npm ci
npm run dev
```

The app includes Classic, Graph, and Editor modes. `UniversalEditor` and application playback controls are repository-only, not package exports.

Next: [public API](api.md), [schema](graph-schema.md), and [editor](editor.md).
