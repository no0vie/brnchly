# Standalone editor

`UniversalEditor` is part of the repository application. It demonstrates graph authoring, validation, history, playback preview, import/export, and local persistence, but it is not exported from either npm package.

## Modes

The application exposes:

- **Classic Mode:** the original scrolling presentation and its EvolutionSteps editor;
- **Graph Mode:** `GraphRenderer`, highlighting, camera controls, and evolution playback;
- **Editor Mode:** local graph documents in view, edit, and preview states.

Classic and Editor modes are supported product paths and are covered by repository tests.

## Editing model

Editor UI actions become immutable `GraphCommand` values. The command layer clones the current graph, applies the operation, validates the complete result, and accepts or rejects it atomically. Failed commands preserve the original graph.

Accepted commands retain bounded before/after snapshots for undo and redo. Transactions group compound actions, such as bulk deletion and multi-node movement, into one history entry. History is session-only.

Snapshots were chosen over inverse commands because cascading deletes, reorder normalization, validation failure, transactions, and schema evolution make exact inverses more complex. The trade-off is memory proportional to graph size and retained history depth. Revisit this choice if measured editor memory or command latency becomes material.

The renderer owns gesture previews and reports node-position/connection intent. The editor owns IDs, validation policy, graph updates, history, and persistence.

## Documents and persistence

`LocalDocumentService` stores a document index, serialized schema-v2 graphs, and the selected editor layout in browser `localStorage`. Autosave is debounced and reports unsaved/saving/saved/error state.

Imports pass through canonical JSON parsing, migration, and validation. Invalid imports do not partially replace the current graph. Exports use the persisted canonical graph after pending autosave is flushed by the UI.

Local storage is origin-scoped, synchronous, quota-limited, and subject to browser clearing/private-mode policies. It is not a backup, collaboration system, security boundary, or transactionally durable database. A future IndexedDB or remote adapter will require explicit async, revision, conflict, authentication, and authorization semantics; the current `StorageLike` test boundary is not sufficient by itself.

Imported JSON is untrusted and passes through parsing, migration, and graph validation before storage/rendering. React renders graph text without HTML injection, but local documents are not confidential from scripts executing in the same origin. Embedders remain responsible for origin security and content-security policy.

## Keyboard and accessibility

The editor includes native form controls, undo/redo/save/select-all shortcuts, deletion, focus restoration for tested add forms, and reduced-motion handling in graph playback. This is not a WCAG conformance claim; see [Known limitations](limitations.md).

## Integration boundary

Applications that need their own editor should compose public core validation/serialization with `GraphRenderer` callbacks. Do not import `src/editor` as a public API: its command and persistence modules have no package compatibility promise.
