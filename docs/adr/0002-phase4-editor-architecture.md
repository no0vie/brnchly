# ADR 0002: Phase 4 editor command, state, and persistence architecture

- Status: Accepted for the current Phase 4 implementation; Phase 4 remains in progress
- Date: 2026-10-28

## Context

Phase 4 adds authoring to a renderer that was deliberately read-only at its domain boundary. The editor must create and modify universal graphs, reject invalid intermediate results, support visual interactions and form alternatives, provide undo/redo, and preserve local documents without coupling the graph renderer to editor state or a backend.

The implementation also needs to serve embedders that control selection, camera, playback visibility, and highlighting. Those consumers must not be forced to adopt the Phase 4 editor or its local persistence model.

The following constraints shape the decision:

- `EvolutionGraph` remains the canonical serializable document.
- Existing schema validation and migration are the authority at command and persistence boundaries.
- Renderer components must report interaction intent rather than mutate graph data.
- Compound editor gestures must be atomic and undo as one user operation.
- The first persistence target is browser-local documents, not accounts, cloud sync, or collaboration.
- Phase 4 is not declared complete, and current browser/E2E results do not establish release readiness.

## Decision

### 1. Use immutable graph commands

All domain edits are represented by the `GraphCommand` union in `src/editor/core`. Commands cover graph metadata, Stage/Lane/Branch CRUD and reorder, Node/Edge CRUD and reorder, and compound operations.

`applyGraphCommand` performs these steps:

1. clone the current graph with `structuredClone`;
2. apply the command to the clone;
3. validate the complete resulting graph;
4. return the new graph and history data on success;
5. return the original graph reference and validation feedback on failure.

The input graph is never modified by the command executor. A rejected operation therefore cannot leave a partially changed document. The command layer also owns referential deletion behavior: reject, reassign, or delete referencing nodes; deleting a node removes incident edges.

The editor UI does not directly update graph arrays. Inspector saves, forms, visual node drag, edge handles, metadata edits, and bulk deletion all map to commands. This keeps validation and undo semantics consistent across visual and form-based interaction paths.

### 2. Store bounded before/after snapshots for history

Each accepted command records a `GraphHistoryData` entry containing the command plus complete `before` and `after` graph snapshots. `createGraphHistory` defaults to a depth of **100** entries and permits a different non-negative depth.

Undo selects the stored `before` graph; redo selects `after`. Executing a new accepted command clears the redo stack. Rejected commands never enter history.

Snapshot history is chosen over inverse-command generation because:

- graph objects are currently small enough for the simpler implementation;
- deletion can cascade to nodes and incident edges;
- validation can reject complex operations;
- exact restoration is easier to reason about than maintaining an inverse for every command and migration-sensitive field.

The trade-off is memory proportional to graph size × retained history depth. This must be profiled before raising the depth or targeting very large editable graphs. History is session-only and is not persisted.

### 3. Treat transactions as one atomic command

`transaction` and the compatibility-equivalent `batch` contain nested commands. Nested commands apply to one cloned working graph, and validation occurs before the result is accepted. If a nested operation throws or the final graph is invalid, the original graph is returned unchanged.

An accepted transaction creates one history entry. The editor uses this for:

- bulk deletion;
- moving several manually positioned nodes by one drag delta;
- any future multi-entity gesture that should undo as one action.

Transactions are not database transactions and provide no cross-tab or cross-process isolation. Their atomicity is limited to one in-memory graph command evaluation.

### 4. Define controlled and uncontrolled renderer semantics explicitly

`GraphRenderer` supports independent controlled state domains:

- **selection:** `selectedNodeId` is controlled when supplied; otherwise `defaultSelectedNodeId` initializes internal state. `onSelectedNodeChange` reports requested changes. The deprecated `onNodeSelectionChange` callback remains for compatibility. `selectedNodeIds` is a separate visual multi-selection input used by the editor.
- **camera:** `camera` is controlled when supplied; otherwise `defaultCamera` initializes internal viewport state. `onCameraChange` reports pan, zoom, focus, fit, reset, and imperative camera requests. In controlled mode, the renderer does not adopt a requested camera unless the owner passes it back.
- **highlighting:** `highlightState` controls traversal-root, traversal-mode, and selected-lane highlighting. Lower-level highlighted node/edge/lane ID sets remain available. Derived traversal from `highlightState` takes precedence for nodes/edges, and `highlightState.selectedLaneIds` takes precedence for lanes.
- **playback presentation:** visible/new node and edge IDs and active stage are inputs; they do not mutate graph data.

The imperative `GraphRendererHandle` remains a camera command surface (`fitToView`, reset, focus, set/get, cancel transition), not a graph mutation API. Camera transitions can be timed, eased, and aborted. Manual camera input cancels active transitions.

Controlled props follow React ownership semantics: callbacks are notifications/requests, not promises that internal state changed. Owners must update controlled values. Controlled state is presentation state and is not part of `EvolutionGraph` serialization.

### 5. Keep renderer and editor boundaries separate

The renderer owns:

- layout projection and displayed drag previews;
- SVG edge geometry and HTML node presentation;
- pan, zoom, focus, pointer handling, connection handles, and camera transitions;
- controlled/uncontrolled presentation state;
- reporting `onNodePositionCommit` and `onConnectionCommit` intent.

The renderer does **not** own:

- graph validation or persistence;
- command/history stacks;
- node or edge creation policy;
- IDs for new entities;
- autosave or document lifecycle;
- whether a requested edit is accepted.

The editor owns those concerns. It receives renderer commits, converts them into commands, validates them through the editor core, updates history, and schedules persistence. The editor also supplies forms as an alternative to pointer gestures.

This boundary preserves `GraphRenderer` as an embeddable component and prevents editor-specific MobX, storage, or document concepts from entering the renderer. It also means renderer callbacks alone do nothing unless an owner applies the resulting graph update.

### 6. Persist local documents through a replaceable service boundary

`LocalDocumentService` accepts a `StorageLike` implementation and currently uses `window.localStorage`. It stores:

- a document summary index;
- each serialized schema-v2 graph;
- an optional, separate editor layout record.

The service validates and round-trips graphs through the canonical serializer/parser before saving. It provides create/new, list, open, save, rename, duplicate, delete, import, and export operations. Imports use the domain parser, so supported legacy schemas migrate before storage. Import collision policy can reject, duplicate, or overwrite; the current UI chooses duplicate.

A commit writes graph, layout, and index records while retaining their previous values. If a later storage operation fails, the service attempts best-effort restoration and reports typed storage, quota, corruption, not-found, invalid-graph, or collision errors. This improves consistency but cannot make localStorage truly transactional.

The editor schedules graph saves with a 500 ms debounce. A shortcut can flush pending work. Autosave exposes unsaved/saving/saved/error state and retains the pending value after a save error.

Local persistence deliberately excludes:

- undo/redo history;
- selection, camera, inspector drafts, and playback state;
- accounts, permissions, synchronization, collaboration, conflict resolution, and server backup;
- encryption beyond browser/platform behavior;
- durable guarantees against site-data clearing, private-mode behavior, storage policy, or quota eviction.

The separate `StorageLike` boundary allows a future adapter, but a remote persistence implementation will need explicit async, concurrency, revision, conflict, authentication, and authorization semantics rather than pretending to be localStorage.

## Consequences

### Positive

- Every UI path shares immutable validation and error behavior.
- Failed commands preserve the exact prior graph.
- Transactions make compound gestures atomic and produce one undo step.
- Snapshot history is straightforward to test and restores cascading edits exactly.
- Renderer consumers can control presentation state without adopting the editor.
- The renderer remains independent of local documents and persistence.
- Imports, saves, and exports reuse canonical schema migration/validation/serialization.
- Storage failures and quota errors are surfaced instead of silently discarded.

### Negative

- Complete snapshots can consume substantial memory for large graphs; the default depth of 100 is a bound, not proof of scalability.
- `structuredClone` and full-graph validation happen per accepted command attempt.
- localStorage is synchronous, quota-limited, origin-scoped, and not fully transactional.
- History disappears on reload or document switch.
- The current layout persistence stores only the editor’s layout strategy, not a complete workspace.
- Controlled camera owners must promptly feed callback values back or interactions can appear not to move.
- `selectedNodeId` and editor `selectedNodeIds` serve different single-selection/detail and multi-selection presentation purposes and require careful integration.
- Export currently reads persisted data and does not automatically flush pending autosave.
- The command API exposes capabilities (reassignment and reorder) that the current editor UI does not expose completely.

## Alternatives considered

### Mutate graph state directly in React components

Rejected. It would duplicate validation, make partial failures likely, couple gesture code to domain invariants, and complicate undo/redo.

### Store inverse commands instead of snapshots

Deferred. Inverses could reduce memory, but cascading deletes, reorder normalization, transactions, and schema evolution make exact inverse generation more complex. Revisit if measured editor memory or command latency makes snapshots unacceptable.

### Put editing state inside `GraphRenderer`

Rejected. It would collapse renderer/editor boundaries and force embedders to accept command, history, ID, validation, and persistence policies. The renderer instead previews gestures and emits commit intent.

### Persist the entire editor session

Rejected for the current local implementation. Persisting history, camera, selection, and drafts would increase compatibility and recovery complexity. Only canonical graph data and the selected layout strategy are currently durable.

### IndexedDB or a server-backed document store

Deferred. IndexedDB would improve capacity and asynchronous behavior; a backend would enable durable synchronization and collaboration. Both require migration, transaction, and failure semantics beyond the current Phase 4 scope. The `StorageLike` service boundary is useful for tests but is not by itself a sufficient remote-storage abstraction.

### Adopt a third-party graph editor framework

Deferred. The current renderer can support required drag and connection gestures while preserving the existing accessible HTML/SVG model. Reconsider only with measured requirements for virtualization, richer selection, routing, or collaboration.

## Security and operational notes

The editor has no authentication or authorization boundary because it does not send documents to a server. Imported JSON is treated as untrusted domain data and passes through JSON parsing, migration, and graph validation before storage/rendering. Graph text is rendered through React rather than injected as HTML.

These facts do not make local documents confidential: any script executing in the same origin can potentially access localStorage. Applications embedding the editor must supply their own origin security, content-security policy, dependency maintenance, and any required data classification or encryption controls.

The initial full installed dependency audit reported 44 development-toolchain advisories. After aligning `typescript-eslint` v8 with TypeScript 5.9, the current audit reports 43 dev-only findings (4 moderate, 36 high, 3 critical), while `npm audit --omit=dev` reports zero production vulnerabilities. Remaining findings are transitive test/build tooling without a non-breaking automated fix; the browser-profiling script remains non-gating.

## Validation status

Unit and component tests cover command immutability, validation rejection, dependency cycles, transactions, bounded history, persistence failures, imports/collisions, autosave, editor shortcuts, multi-select, Preview, and mapping visual commits to commands. A Phase 4 Playwright scenario exists.

The current production build passes. This ADR does **not** claim that Phase 4 is complete or that browser/E2E tests passed. The browser performance harness currently has no baseline because the bounded Playwright run failed to complete and a retry timed out while Chromium was creating a page.

## Revisit when

Revisit this decision when any of the following is measured or required:

- snapshot history materially affects memory or edit latency;
- graphs require collaborative or concurrent editing;
- persistence moves to IndexedDB or a remote service;
- multi-tab edits require revision/conflict handling;
- controlled selection needs one unified single/multi-selection API;
- renderer virtualization or Canvas/WebGL changes drag/connection boundaries;
- reorder, reassignment, accessible connection workflows, or canvas multi-select become required UI features;
- stable package exports require compatibility guarantees for commands and controlled props.
