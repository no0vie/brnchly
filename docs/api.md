# Public API

Only package-root exports and the React stylesheet subpath are public. The lists below reflect the current source barrels; repository `src/` paths, the editor, Ant Design components, app hooks, and CSS implementation classes are internal.

## `@no0vie/brnchly-core`

### Domain and documents

Exports include:

- `CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION`;
- graph/entity types including `EvolutionGraph`, `EvolutionGraphV2`, `EvolutionNode`/`GraphNode`, `EvolutionEdge`/`GraphEdge`, `EvolutionBranch`/`GraphBranch`, `GraphStage`, `GraphLane`, `Position`, status/evidence/metadata types;
- view settings and `EvolutionLayoutStrategy`;
- validation result/code/issue types and `validateEvolutionGraph`;
- `migrateEvolutionGraph`, `migrateLegacyEvolutionData`;
- `parseEvolutionGraph`, `serializeEvolutionGraph`, `EvolutionGraphImportError`.

See [EvolutionGraph schema](graph-schema.md).

### Layout

`layoutGraph` is also exported as the compatibility alias `calculateGraphLayout`. It returns positions, bounds, node size, and regions.

```ts
const result = layoutGraph(graph, { strategy: "horizontal-dag" });
```

Strategies are `manual`, `horizontal-dag`, `vertical-dag`, `radial`, `radial-tree`, and `stage-lane`.

### Traversal and routing

- `createGraphIndex`, `traverseGraph`, and traversal types support `direct`, `upstream`, `downstream`, `both`, and `related` modes.
- `routeEdges` and routing types produce deterministic cubic SVG paths from node positions and sizes.

### Playback

`PlaybackController`, `createPlaybackPlan`, `snapshotAt`, `nextStageCheckpoint`, and `previousStageCheckpoint`, plus playback configuration, plan, status, snapshot, group, position, camera-mode, and checkpoint types.

### Viewport

`clampZoom`, `createViewport`, `worldToScreen`, `screenToWorld`, `fitBounds`, `focusRegion`, `focusStage`, `focusLane`, `panViewport`, `zoomAt`, and `resizeViewport`, plus viewport option/types. These functions are mathematical and do not read the DOM.

## `@no0vie/brnchly-react`

Runtime export: `GraphRenderer`.

Type exports: `GraphRendererProps`, `GraphRendererHandle`, `GraphHighlightState`, and `CameraTransitionOptions`.

```tsx
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";

<GraphRenderer graph={graph} layout="horizontal-dag" />;
```

### Props

| Prop                                                              | Purpose                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `graph`, `layout`                                                 | Required caller-owned graph and layout strategy.                         |
| `readonly`, `showLaneLabels`                                      | Presentation/interaction switches.                                       |
| `onNodeClick`                                                     | Reports the clicked node.                                                |
| `editingEnabled`, `selectedNodeIds`                               | Enables edit gestures and multi-node drag participation.                 |
| `onNodePositionCommit`, `onConnectionCommit`                      | Reports edit intent; never mutates `graph`.                              |
| `selectedNodeId`, `onSelectedNodeChange`                          | Controlled selection.                                                    |
| `defaultSelectedNodeId`                                           | Initial uncontrolled selection.                                          |
| `onNodeSelectionChange`                                           | Deprecated compatibility callback; use `onSelectedNodeChange`.           |
| `camera`, `onCameraChange`                                        | Controlled viewport camera.                                              |
| `defaultCamera`                                                   | Initial uncontrolled camera.                                             |
| `onLayoutChange`                                                  | Reports a requested layout selection.                                    |
| `onManualCameraInteraction`                                       | Reports manual pan/zoom interaction.                                     |
| `visibleNodeIds`, `visibleEdgeIds`, `newNodeIds`, `activeStageId` | Playback/presentation inputs.                                            |
| `highlightState`                                                  | Derives traversal and lane highlighting from a root/mode/selected lanes. |
| `highlightedNodeIds`, `highlightedEdgeIds`, `highlightedLaneIds`  | Lower-level controlled highlight sets.                                   |

Do not combine controlled and uncontrolled ownership for the same state domain. Replace sets rather than mutating a set already passed as a prop.

### Imperative handle

A ref exposes `fitToView`, `resetView`, `focusStage`, `focusLane`, `focusNode`, `setCamera`, `getCamera`, and `cancelCameraTransition`. Transition options support `duration`, `linear | easeInOut` easing, and an `AbortSignal`.

### Styling and browser boundary

Import `@no0vie/brnchly-react/styles.css` once. Give the renderer a normal-width container and at least roughly 600 px vertical space; current package CSS uses a 520 px minimum viewport height.

The renderer uses browser APIs and should be loaded/rendered on the client. Module evaluation is tested in the repository environment, but SSR output and hydration are not compatibility promises.

## Playback composition

Playback planning is public core API. Playback controls and `usePlayback` in the standalone application are not React-package exports. Pass snapshot sets to `GraphRenderer` to build playback UI.

## Stability

Package-root exports, the stylesheet subpath, and schema compatibility follow [release policy](release.md). Internal paths are not stable imports.
