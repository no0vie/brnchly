# brnchly — Universal Evolution Graph Engine

`brnchly` — open-source React/TypeScript renderer for arbitrary interactive evolution graphs. The core knows only about branches, stages, lanes, nodes, and typed edges; it contains no resume, career, company, or skill-event business model.

## Status

**Evolution Graph 2.0 — Phase 3 implemented.**

- React 18, TypeScript strict, Vite, Ant Design.
- Versioned universal graph schema with runtime validation and migration.
- Pure layout and viewport engines independent from React.
- Interactive Graph Mode plus backward-compatible Classic Mode.
- Deterministic evolution playback with seek, stage navigation, speed control, and reduced-motion support.
- Animated camera, dependency/lane highlighting, stable multi-port edge routing, and three universal demos.
- Vitest component/unit coverage plus Chromium Playwright smoke tests.

## Architecture

```text
src/
├── domain/evolutionGraph/  # Schema, validation, migrations, JSON codec
├── graph/playback/         # Pure deterministic playback plan/controller
├── graph/traversal/        # Indexed dependency neighborhood traversal
├── graph/routing/          # Stable multi-port SVG edge routing
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

## Evolution playback

`src/graph/playback` is React-independent. `createPlaybackPlan` derives deterministic reveal groups and direct seek snapshots from an `EvolutionGraph`; `PlaybackController` supplies play, pause/resume, restart, seek, speed changes, ticking, and stage checkpoints. Stage/Lane graphs use stage order and stable node IDs. Free graphs use dependency/evolution topological batches with deterministic disconnected-component and cycle fallback. Edges appear only after both endpoints; `related` edges never affect ordering.

Graph Mode exposes Play/Pause/Resume, Restart, Previous/Next stage, seek, `0.5×–2×`, progress announcements, and Follow/Overview/Manual camera modes. Playback changes presentation only: it does not mutate graph data or recalculate layout per frame.

## Highlighting and routing

Selecting a node enables Direct, Upstream, Downstream, Both, and Related neighborhoods. Traversal is cycle-safe and reuses an indexed adjacency structure. Lane highlighting supports multiple arbitrary numeric-coordinate lanes, cross-lane edges, reset, and single-lane camera focus. Selection/highlight styles use outline, opacity, and text—not color alone.

Routing uses deterministic boundary ports and stable parallel-edge offsets. It avoids duplicate arrowheads at a shared port and keeps geometry stable across renders without global route optimization.

## Viewport

The pure `src/viewport` API includes:

- `fitBounds`, `focusStage`, `focusLane`;
- `panViewport`, `zoomAt`, `clampZoom`;
- `worldToScreen`, `screenToWorld`;
- `resizeViewport` and `createViewport`.

The renderer supports drag pan, cursor-relative wheel zoom, touch pan/pinch, zoom limits, fit-to-view, reset, and focus. Stage/Lane opens with fit-to-view and a readable minimum scale. `GraphRendererHandle` exposes `fitToView`, `resetView`, `focusStage`, `focusLane`, `focusNode`, `setCamera`, `getCamera`, and `cancelCameraTransition`. Focus/set methods accept `{ duration, easing, signal }`; a new command or manual pan/zoom cancels the prior transition without jumping to a stale target.

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
npm run test:e2e
```

The Vitest suite covers domain compatibility, layout/viewport, playback, traversal, routing, React behavior, reduced-motion wiring, cleanup, and deterministic performance fixtures. Playwright runs the critical flow in Chromium and a `prefers-reduced-motion: reduce` project. Install browsers once with `npx playwright install chromium`.

`src/performance` contains deterministic 100/500/1000-node algorithmic benchmarks with median/p95 reporting. These Node/Vitest numbers are not browser measurements. See [docs/performance.md](docs/performance.md) for the reproducible real-browser profiling procedure and result table.

## Current limitations

- Edge routing uses stable multi-port cubic paths but does not perform global obstacle avoidance or bundling.
- Nodes are not draggable/editable in Graph Mode; full CRUD belongs to Phase 4.
- No virtualization; the deterministic 1000-node algorithm benchmarks do not replace real-browser render/FPS profiling.
- Stage order and lane coordinate collisions are rejected rather than automatically resolved.
- Ant Design remains the largest production chunk. Graph Mode is the default route, so lazy-loading it would not improve the default experience; no speculative code split was added without a route-level loading boundary.
- Camera follow targets stages; free-graph playback remains overview/manual rather than following every topological batch.

See [ADR 0001](docs/adr/0001-layout-engine-and-renderer.md) for renderer/layout trade-offs.

## Roadmap

### Phase 3 — Evolution Experience

Implemented: staged/free-graph playback, reduced motion, dependency and multi-lane focus, cancellable camera transitions, stable edge routing, component/E2E tests, and profiling harness.

### Phase 4 — Editor

- CRUD for stages, lanes, nodes, and edges;
- graph drag/drop, manual positioning, undo/redo;
- import/export UI, autosave, and validation feedback.

### Phase 5 — Integration Readiness

- package boundary and framework integration examples;
- renderer performance profiling and optional virtualization;
- accessibility audit and stable public API preparation.
