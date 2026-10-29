# Public API

Only package-root exports and the React stylesheet subpath are public. Files under `src/`, the demo, editor, Ant Design components, and repository playback hooks are internal.

## `@no0vie/brnchly-core`

### Schema and documents

- Constants: `CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION`.
- Types: `EvolutionGraph`, `EvolutionGraphV2`, `EvolutionNode`/`GraphNode`, `EvolutionEdge`/`GraphEdge`, `EvolutionBranch`/`GraphBranch`, `GraphStage`, `GraphLane`, statuses, metadata, evidence, and validation result/issue types.
- Functions/classes: `validateEvolutionGraph`, `migrateEvolutionGraph`, `migrateLegacyEvolutionData`, `parseEvolutionGraph`, `serializeEvolutionGraph`, `EvolutionGraphImportError`.

```ts
import { parseEvolutionGraph, validateEvolutionGraph } from "@no0vie/brnchly-core";

const graph = parseEvolutionGraph(text);
const result = validateEvolutionGraph(graph);
```

### Layout

`layoutGraph` (also exported as `calculateGraphLayout`) accepts a graph and required strategy option and returns positions, bounds, node size, and regions.

```ts
import { layoutGraph } from "@no0vie/brnchly-core";
const result = layoutGraph(graph, { strategy: "horizontal-dag" });
```

Strategies: `manual`, `horizontal-dag`, `vertical-dag`, `radial`, and `stage-lane`.

### Traversal and routing

`createGraphIndex` and `traverseGraph` support direct/upstream/downstream/both/related graph traversal. Routing exports include `routeEdges` and its public routing types.

### Playback

`PlaybackController`, `createPlaybackPlan`, `snapshotAt`, `nextStageCheckpoint`, and `previousStageCheckpoint`, with plan/config/status/snapshot/checkpoint types.

### Viewport

Core exports viewport construction, fit/focus, resize, pan, zoom, and coordinate-conversion utilities and their types. These are mathematical utilities; they do not read the DOM.

## `@no0vie/brnchly-react`

Runtime export: `GraphRenderer`.

Type exports: `GraphRendererProps`, `GraphRendererHandle`, `GraphHighlightState`, and `CameraTransitionOptions`.

Stylesheet export:

```ts
import "@no0vie/brnchly-react/styles.css";
```

```tsx
<GraphRenderer graph={graph} layout="horizontal-dag" />
```

See [Renderer](renderer.md) for all props and state ownership. `EvolutionGraphView` is a repository app component, not a package export.

## Stability

The package API follows the policy in [Release](release.md). Internal paths and CSS implementation classes are not stable imports. The graph schema is a persisted-data contract and receives major-version treatment for incompatible changes.
