# @no0vie/brnchly-react

Interactive React renderer for brnchly EvolutionGraph documents.

> The repository is a v1.0 release candidate; npm publication is not confirmed. The install command applies once the packages are published.

```sh
npm install @no0vie/brnchly-core @no0vie/brnchly-react react react-dom
```

```tsx
import type { EvolutionGraph } from "@no0vie/brnchly-core";
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";

export function Graph({ graph }: { graph: EvolutionGraph }) {
  return (
    <div style={{ width: "100%", minHeight: 600 }}>
      <GraphRenderer graph={graph} layout="horizontal-dag" />
    </div>
  );
}
```

`layout` is required and the stylesheet must be imported once. The component needs a practical-size browser container. Graph, selection, camera, highlight sets, and edit results remain caller-owned; callbacks do not mutate the graph.

React and React DOM `>=18 <20` are peer dependencies. The package is ESM-only, includes TypeScript declarations, and exports `GraphRenderer`, its public types, and `./styles.css`. Rendering requires browser APIs; SSR output and hydration are not compatibility promises.

See the repository [API documentation](../../docs/api.md) and [architecture](../../docs/architecture.md).
