# brnchly — Universal Evolution Graph Engine

`brnchly` is an open-source React/TypeScript renderer and local editor for arbitrary evolution graphs. Its domain model is limited to branches, stages, lanes, nodes, and typed edges; it does not contain resume, career, company, or skill-event business rules.

## Status

**Evolution Graph 2.0 — Phase 4 is in progress. Do not treat this as a Phase 4 completion or release claim.**

The current worktree includes:

- the versioned universal graph schema, validation, migration, serialization, layout, viewport, playback, traversal, routing, and Classic/Graph renderers from earlier phases;
- a local universal graph editor with validated CRUD, manual node positioning, visual edge creation, bounded undo/redo, import/export, autosave, and Preview;
- controlled renderer APIs for selection, camera, and highlighting;
- unit/component coverage and Playwright scenarios, including a real-browser performance harness.

The current production build succeeds. Browser profiling has not produced a usable baseline in the current environment because Playwright hung while creating a page. The presence of Playwright specifications is not evidence that browser/E2E tests passed.

## Architecture

```text
src/
├── domain/evolutionGraph/  # Schema, validation, migrations, JSON codec
├── editor/
│   ├── core/               # Immutable commands, validation, transactions, history
│   ├── persistence/        # localStorage documents and debounced autosave
│   └── ui/                 # Universal editor, structure tree, forms, inspector
├── graph/playback/         # Pure deterministic playback plan/controller
├── graph/traversal/        # Indexed dependency-neighborhood traversal
├── graph/routing/          # Stable multi-port SVG edge routing
├── layout/                 # Pure deterministic layout strategies
├── viewport/               # Pure camera/coordinate math
├── renderer/               # Embeddable Classic and Graph renderers
├── performance/            # Deterministic fixtures and browser harness
├── data/                   # Universal demo configurations
├── stores/, contexts/      # Legacy Classic editor state
└── components/             # Classic UI and editor components
docs/adr/                   # Architecture decisions
```

The domain, command, layout, viewport, playback, traversal, and routing layers are React-independent. The renderer receives graph and presentation state; the editor maps user actions to domain commands rather than letting the renderer mutate graph data.

See [ADR 0001](docs/adr/0001-layout-engine-and-renderer.md) for the layout/renderer decision and [ADR 0002](docs/adr/0002-phase4-editor-architecture.md) for the Phase 4 editor architecture.

## Universal graph model

Schema version `2` supports branches, optional stages and lanes, nodes, and edges:

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
  position?: { x: number; y: number };
}
```

Edge types are `dependency`, `evolution`, and visually undirected `related`. Validation checks collection shapes, enum values, references, unique IDs, stage orders, lane coordinates, Stage/Lane placement, and dependency cycles. Invalid editor commands retain the previous graph and expose validation feedback.

## Creating and editing graphs

Open **Editor Mode**, then create a new local document or open an existing one. Editing does not require hand-authored JSON.

### Document and graph metadata

The editor can:

- create, open, duplicate, rename, and delete local documents;
- edit the canonical graph title and description;
- search the structure list;
- switch among View, Edit, and Preview.

Document names and graph titles are related but separate: renaming a local document changes its index label, while editing graph metadata changes serialized graph data.

### Stage, Lane, and Branch CRUD

Stages, lanes, and branches can be created, inspected, edited, and deleted. The inspector exposes:

- stage title, description, and order;
- lane title, numeric coordinate, and color;
- branch title, description, and color.

Deleting a referenced Stage, Lane, or Branch can reject the operation or delete the nodes that reference it. The command API also supports reassignment, although the current inspector does not expose that policy. Deleting nodes also removes incident edges atomically.

### Node and Edge CRUD

Nodes can be created and edited with ID, title, branch, status, optional Stage/Lane placement, description, and manual coordinates. Edges can be created and edited with ID, source, target, and type. All changes pass through graph validation; for example, a dependency edge that introduces a cycle is rejected.

The editor provides two edge-creation paths:

1. choose the connection edge type, drag from a node’s connection handle, and release on a target;
2. use the **Add edge** form to choose source, target, and edge type.

The form is the accessible and precise alternative when pointer-based handles are inconvenient.

### Manual layout and visual drag

The editor exposes Stage/Lane, Horizontal DAG, and Manual layouts. Stored `node.position` coordinates drive Manual layout. Manual X/Y can be edited in the inspector, or nodes can be dragged when Manual layout and Edit mode are active.

If several selected nodes already have manual positions, dragging one selected node commits the same delta for the group as one transaction. Dragging in an automatic layout is not enabled; switch to Manual first.

### Multi-select and bulk operations

The structure list supports:

- click for a single selection;
- `Cmd`/`Ctrl` + click to toggle items across entity types;
- **Select all**, **Clear**, and **Bulk delete**;
- `Cmd`/`Ctrl` + `A`, `Escape`, and `Delete`/`Backspace` shortcuts.

Canvas node selection is reflected through `selectedNodeIds`. Multi-selection is primarily managed in the structure list; canvas clicks currently replace the editor selection with one node. Bulk deletion is one validated transaction, so any failing nested command rejects the whole operation.

### Undo and redo

Every accepted editor command records complete before/after graph snapshots. Undo and redo default to a bounded depth of 100 accepted operations. Transactions—including group drag and bulk delete—occupy one history entry. A new command clears the redo stack; rejected commands are not recorded.

Undo/redo history is in memory only. Opening or reloading a document starts a fresh history.

### Autosave and local documents

Accepted commands schedule a debounced save after 500 ms. `Cmd`/`Ctrl` + `S` flushes pending autosave immediately. The status indicator reports `unsaved`, `saving`, `saved`, or `error`.

Documents are stored in browser `localStorage` under the `brnchly:documents` namespace. The graph, document index, and editor layout strategy are separate records. Saves validate and serialize the graph first; storage writes attempt to restore previous records if a later write fails.

This is local browser persistence, not durable cloud storage:

- data is scoped to the browser profile and origin;
- clearing site data, private browsing behavior, browser policy, or quota pressure can remove or prevent access;
- there is no account, synchronization, collaboration, server backup, encryption layer, or cross-device recovery;
- localStorage is synchronous and quota-limited;
- camera, selection, undo/redo stacks, unsaved inspector drafts, and Preview playback state are not persisted;
- the stored layout record currently contains the selected layout strategy, not a complete editor session.

Export important documents regularly.

### Import and export

**Export JSON** downloads the current persisted document through the schema serializer. Pending autosave is not explicitly flushed by Export, so save first (`Cmd`/`Ctrl` + `S` and wait for `saved`) if the latest edit must be included.

**Import file** parses, migrates, and validates JSON before creating a local document. The UI uses duplicate-on-graph-ID-collision behavior. The persistence API also supports reject and overwrite policies. Schema v0/v1 payloads migrate to v2; malformed JSON, unknown future schema versions, invalid references, and invalid graphs produce errors.

### Preview

Preview renders the current in-memory graph through the read-only `EvolutionGraphView` with autoplay. It hides editor controls and does not intentionally mutate graph data or history. Return to Edit to continue authoring. Preview is not an export or publication workflow.

## Keyboard shortcuts

Shortcuts apply while the universal editor is open and are intentionally ignored while typing in an input, textarea, select, or content-editable control.

| Shortcut                     | Action                                         |
| ---------------------------- | ---------------------------------------------- |
| `Cmd`/`Ctrl` + `Z`           | Undo                                           |
| `Cmd`/`Ctrl` + `Shift` + `Z` | Redo                                           |
| `Cmd`/`Ctrl` + `Y`           | Redo                                           |
| `Cmd`/`Ctrl` + `S`           | Flush autosave                                 |
| `Cmd`/`Ctrl` + `A`           | Select all graph entities                      |
| `Delete` or `Backspace`      | Delete the current selection                   |
| `Escape`                     | Clear selection                                |
| `Cmd`/`Ctrl` + click         | Toggle an item in the structure-list selection |

## Renderer APIs

`GraphRenderer` remains usable without editor state. Selection and camera each support controlled and uncontrolled forms:

```tsx
<GraphRenderer
  graph={graph}
  layout="manual"
  selectedNodeId={selectedNodeId}
  onSelectedNodeChange={setSelectedNodeId}
  camera={camera}
  onCameraChange={setCamera}
  highlightState={{
    rootNodeId: selectedNodeId,
    traversalMode: "both",
    selectedLaneIds,
  }}
/>
```

- Selection: `selectedNodeId` + `onSelectedNodeChange` is controlled; `defaultSelectedNodeId` initializes uncontrolled selection. `onNodeSelectionChange` remains as a deprecated compatibility callback. Editor-specific `selectedNodeIds` supplies visual multi-selection.
- Camera: `camera` + `onCameraChange` is controlled; `defaultCamera` initializes uncontrolled camera state. In controlled mode, callbacks request changes and the owner must pass the next value back.
- Highlighting: `highlightState` controls root/traversal/lane highlighting. Lower-level `highlightedNodeIds`, `highlightedEdgeIds`, and `highlightedLaneIds` are also available; derived `highlightState` traversal takes precedence for nodes and edges, and its lane set takes precedence for lanes.
- Playback presentation: `visibleNodeIds`, `visibleEdgeIds`, `newNodeIds`, and `activeStageId` are controlled inputs.
- Editing integration: `editingEnabled`, `onNodePositionCommit`, and `onConnectionCommit` report user intent; the owner is responsible for validating and updating `graph`.

`GraphRendererHandle` exposes `fitToView`, `resetView`, `focusStage`, `focusLane`, `focusNode`, `setCamera`, `getCamera`, and `cancelCameraTransition`. Focus/set methods accept optional duration, easing, and `AbortSignal` settings.

## Layout, playback, highlighting, and routing

Supported layouts are `stage-lane`, `horizontal-dag`, `vertical-dag`, `radial` (plus the `radial-tree` compatibility alias), and `manual`. Layout is derived from graph data and memoized; camera and highlight changes do not recalculate node positions.

Playback is deterministic and presentation-only. Graph Mode supports play/pause/resume, restart, stage navigation, seek, speed control, reduced motion, and Follow/Overview/Manual camera modes. Highlighting supports upstream, downstream, both, related, and lane focus. Routing uses deterministic boundary ports and parallel-edge offsets, but not global obstacle avoidance or bundling.

## Development and validation

```bash
npm install
npm run dev
```

Quality commands:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm run profile:chromium
```

### Current verified facts (2026-10-28)

- `npm run build` passes with Vite 5.4.21.
- Current production output: app JavaScript **207.82 kB** (**65.61 kB gzip**), Ant Design **831.32 kB** (**264.34 kB gzip**), React shim **0.07 kB** (**0.09 kB gzip**), and CSS **17.97 kB** (**4.58 kB gzip**).
- Recorded pre-Phase-4 baseline: app JavaScript **167.34 kB** (**53.34 kB gzip**) plus Ant Design **831.32 kB** (**264.34 kB gzip**).
- The current app chunk is therefore 40.48 kB larger minified and 12.27 kB larger gzip than that baseline; the Ant Design chunk is unchanged. Vite still warns that the Ant Design chunk exceeds 500 kB.
- The current full `npm audit` reports **13 development-toolchain advisories**: 5 moderate, 6 high, and 2 critical; `npm audit --omit=dev` reports **0 production vulnerabilities**. The critical findings are in the Vitest `tinypool` dependency and require a controlled breaking toolchain upgrade rather than `npm audit fix --force`.
- `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` are aligned on v8, removing the previous unsupported TypeScript-version warning. The profiling script is non-gating.
- The Chromium `newPage()` hang was isolated to the Zed terminal's macOS Mach-service sandbox. The same Playwright reproduction and application tests run successfully outside that sandbox.
- Existing editor, export, legacy smoke, and reduced-motion-project specs pass in real bundled Chromium. A 100/500/1,000-node baseline now exists under `artifacts/performance/`; lane highlighting and 500/1,000-node frame/long-task measurements require optimization.
- Phase 4.7 is **not accepted**: several mandatory drag, multi-select, storage-failure, import, keyboard, focus, and manual accessibility scenarios remain unexecuted. See [docs/phase-4.7-acceptance.md](docs/phase-4.7-acceptance.md).

See [docs/performance.md](docs/performance.md) for the browser-harness methodology and exact limitations. Node/Vitest algorithm benchmarks are not browser-rendering measurements.

## Known issues and limitations

- Phase 4 remains in progress; the editor UI and public APIs are not declared stable.
- Persistence is localStorage-only and has no synchronization, recovery, collaboration, authentication, authorization, or server-side durability.
- Export reads the persisted document and does not first flush a pending autosave.
- Document rename does not change the graph title, and graph-title edits do not rename the document index entry.
- Undo/redo and session state do not survive reload or document switches.
- The UI exposes reject/delete-referenced-node policies, but not the command layer’s reassignment policy.
- Canvas multi-selection gestures are not implemented; use the structure list. Group drag requires selected nodes to already have manual positions.
- Visual node drag is Manual-layout-only. There is no stage/lane drag-and-drop reordering UI despite reorder commands in the core.
- Connection handles are pointer-oriented; the Add Edge form is the non-drag alternative.
- No virtualization is implemented. The current browser baseline shows lane-highlight p95 of 457.0/773.1/1079.5 ms at 100/500/1,000 nodes and frame p95 of 99.9/233.3 ms at 500/1,000 nodes.
- HTML nodes plus SVG edges favor accessibility and straightforward theming, but very large graphs may require virtualization or another rendering strategy.
- Edge routing does not globally avoid nodes or bundle edges.
- Ant Design remains the largest production chunk, and the app chunk increased with Phase 4 work.
- The full development dependency audit is not clean even though the production-only audit reports zero findings.

## Roadmap

### Phase 4 — Editor (in progress)

Continue hardening the current editor rather than declaring it complete: establish passing browser flows, resolve export/autosave ordering, improve accessible connection and canvas multi-select behavior, decide whether reordering/reassignment need UI, address development-tooling advisories, and establish a reproducible browser performance baseline.

### Phase 5 — Integration readiness

- define stable package boundaries and supported renderer/editor exports;
- add framework integration examples and consumer-facing API documentation;
- establish compatibility/versioning policy for controlled selection, camera, highlight, and command APIs;
- profile production browser builds and evaluate code splitting, virtualization, and renderer alternatives using measured data;
- complete accessibility, keyboard, touch, and security reviews;
- add durable persistence adapters and integration hooks without coupling the core to a specific backend;
- establish reliable cross-browser E2E and release gates.
