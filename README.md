# brnchly — Universal Evolution Graph Engine

`brnchly` — open-source React/TypeScript renderer for arbitrary interactive evolution graphs. The core knows only about branches, stages, lanes, nodes, and typed edges; it contains no resume, career, company, or skill-event business model.

## Status

**Evolution Graph 2.0 — Phase 2 complete.**

- React 18, TypeScript strict, Vite, Ant Design.
- Versioned universal graph schema with runtime validation and migration.
- Pure layout and viewport engines independent from React.
- Interactive Graph Mode plus backward-compatible Classic Mode.
- Dark/light themes and three selectable demos.

## Architecture

```text
src/
├── domain/evolutionGraph/  # Schema, validation, migrations, JSON codec
├── layout/                 # Pure deterministic layout strategies
├── viewport/               # Pure camera/coordinate math
├── renderer/               # Embeddable Classic and Graph renderers
├── data/                   # Universal demo configurations
├── stores/, contexts/      # Legacy Classic editor state
└── components/             # Classic UI and editor components
docs/adr/                   # Architecture decisions
```

Layout is calculated from graph data only. The React renderer memoizes it. Hover, node selection, pan, zoom, fit, and focus update presentation/camera state without recalculating node positions.

## Universal Graph Model

Schema version `2` adds optional stages and lanes while preserving all Phase 1 properties.

```ts
interface GraphStage {
  id: string;
  title: string;
  order: number;
  description?: string;
}

interface GraphLane {
  id: string;
  title: string;
  coordinate: number;
  color?: string;
}

interface EvolutionNode {
  id: string;
  title: string;
  branchId: string;
  status: "locked" | "available" | "acquired" | "mastered";
  stageId?: string;
  laneId?: string;
  // description, icon, level, evidence, position, metadata...
}
```

`EvolutionGraph` contains `branches`, optional `stages`/`lanes`, `nodes`, and `edges`. Edge types are:

- `dependency` — directed prerequisite;
- `evolution` — directed progression;
- `related` — visually undirected association and excluded from DAG ordering.

### Validation policy

`validateEvolutionGraph` checks collection shapes, enums, references, unique IDs, stage orders, and lane coordinates. Duplicate lane coordinates are explicitly rejected. If a node uses Stage/Lane placement, both `stageId` and `laneId` must be supplied and reference existing entries. Dependency cycles remain invalid domain data; the layout engine still has a deterministic cycle fallback for unvalidated callers.

## Layout engine

```ts
import { layoutGraph } from "./layout";

const result = layoutGraph(graph, {
  strategy: "stage-lane",
  nodeSize: { width: 176, height: 88 },
});
```

`LayoutResult` exposes `positions`, complete `bounds`, `nodeSize`, and `regions` used by headers, labels, and camera focus.

Supported strategies:

- `stage-lane` — stages left-to-right by `order`, lanes top-to-bottom by numeric `coordinate`; dynamic cell sizing and deterministic multi-node packing;
- `horizontal-dag` — dependency/evolution flow left-to-right;
- `vertical-dag` — dependency/evolution flow top-to-bottom;
- `radial` (`radial-tree` compatibility alias) — deterministic circular placement;
- `manual` — stored node positions, with deterministic fallback for missing coordinates.

The engine handles empty/single graphs, multiple roots and parents, disconnected components, non-contiguous and negative lane coordinates, cross-stage/cross-lane edges, and cyclic input without hanging.

## Graph Mode

Graph Mode uses accessible HTML node cards and an SVG geometry layer.

- title, description, icon, status, and lane/branch color;
- click and keyboard activation with details panel;
- multiple incoming/outgoing edges;
- distinct dependency, evolution, and related styles;
- selectable layout, stage, and lane;
- edge legend and optional lane labels;
- stage headers and lane labels synchronized to the camera.

Stage headers and lane labels are overlays, not graph nodes. Selecting one focuses its layout region.

## Viewport

The pure `src/viewport` API includes:

- `fitBounds`, `focusStage`, `focusLane`;
- `panViewport`, `zoomAt`, `clampZoom`;
- `worldToScreen`, `screenToWorld`;
- `resizeViewport` and `createViewport`.

The renderer supports drag pan, cursor-relative wheel zoom, touch pan/pinch, zoom limits, fit-to-view, reset, and focus. Stage/Lane opens with fit-to-view and a readable minimum scale. `GraphRendererHandle` exposes `fitToView`, `resetView`, `focusStage`, `focusLane`, `setCamera`, and `getCamera` for embedding and future camera animation.

## Renderer API

```tsx
import { EvolutionGraphView } from "./renderer";

<EvolutionGraphView
  graph={graph}
  mode="graph"
  layout="stage-lane"
  theme="dark"
  readonly
  showLaneLabels
  onLayoutChange={setLayout}
  onNodeClick={(node) => console.log(node.id)}
/>;
```

Use `mode="classic"` for the Phase 1 scrolling renderer. Its adapter and editor remain available.

## Import/export and compatibility

```ts
import { parseEvolutionGraph, serializeEvolutionGraph } from "./domain/evolutionGraph";

const json = serializeEvolutionGraph(graph);
const restored = parseEvolutionGraph(json);
```

- Schema v0 and v1 imports migrate deterministically to v2.
- Existing v1 TypeScript call sites remain accepted and serialization upgrades their payload.
- Unknown future schema versions and invalid references produce actionable import errors.
- Legacy `GraphItem[] + EvolutionStep[]` migration and Classic adapter remain supported.

## Demo configurations

The UI exposes:

1. **Three-Lane Evolution** — four stages, coordinates `-1/0/1`, multiple nodes per cell, cross-stage/lane edges.
2. **Technology Evolution** — Foundation, Development, Expansion, Advanced across Interface, Systems, Infrastructure.
3. **Free Graph** — ordinary disconnected DAG with no Stage/Lane semantics.

These are example data only and are not part of core behavior.

## Development

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm test
npm run lint
npm run build
```

Phase 2 currently has 31 unit tests covering domain validation/migration/serialization, all layouts (including deterministic 150-node DAG and multi-node Stage/Lane overlap checks), viewport fit/zoom/transforms/focus/resize, and Classic adapter regression.

## Current limitations

- Edge routing uses smooth cubic paths but does not perform obstacle avoidance or edge bundling.
- Nodes are not draggable/editable in Graph Mode; full CRUD belongs to Phase 4.
- No virtualization. The tested target is 100+ nodes; larger datasets should be profiled before choosing Canvas/WebGL.
- No playback or complex camera/node animation.
- Stage order and lane coordinate collisions are rejected rather than automatically resolved.
- Ant Design remains the largest production chunk; code splitting is future optimization work.

See [ADR 0001](docs/adr/0001-layout-engine-and-renderer.md) for renderer/layout trade-offs.

## Roadmap

### Phase 3 — Evolution Experience

- staged playback and reduced-motion support;
- dependency/branch focus and traversal highlighting;
- animated camera transitions through the existing camera API;
- improved edge routing and graph navigation.

### Phase 4 — Editor

- CRUD for stages, lanes, nodes, and edges;
- graph drag/drop, manual positioning, undo/redo;
- import/export UI, autosave, and validation feedback.

### Phase 5 — Integration Readiness

- package boundary and framework integration examples;
- renderer performance profiling and optional virtualization;
- accessibility audit and stable public API preparation.
