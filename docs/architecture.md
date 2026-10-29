# Architecture

## Layers

1. **`@no0vie/brnchly-core`** — DOM-free schema and deterministic graph utilities. It has no React, storage, or application dependency.
2. **`@no0vie/brnchly-react`** — browser renderer using core. React and React DOM are peers; Ant Design and the editor are not package dependencies.
3. **Repository app** — demo, compatibility view, playback composition, performance harness, and `UniversalEditor` with local persistence.

Dependencies flow from app → React package → core. Core never imports upward.

## Ownership model

The graph is caller-owned. Public core functions derive results or return migrated/parsed values; consumers should not rely on in-place mutation. `GraphRenderer` derives positions and visual state without writing into the input graph.

Interaction outputs cross the boundary through callbacks:

- selection: `onSelectedNodeChange`;
- camera: `onCameraChange`;
- manual positions: `onNodePositionCommit`;
- connections: `onConnectionCommit`;
- layout choice: `onLayoutChange`.

For controlled state, pass the latest value back through `selectedNodeId` or `camera`. For uncontrolled initialization, use `defaultSelectedNodeId` or `defaultCamera`; later default-prop changes do not reset user state.

## Renderer composition

`GraphRenderer` computes layout, routes SVG edges, and renders HTML node cards over the graph viewport. It observes container dimensions, handles pointer camera gestures, and exposes imperative focus/camera methods through a ref.

## Editor boundary

The editor command/history/persistence implementation remains application source. It is useful as an integration example but has no compatibility promise as a package API.

## Runtime boundary

Core source is checked to avoid DOM globals. The React package root is tested for module evaluation in the project test environment, but actual rendering requires browser APIs. No server-rendering or hydration guarantee is made.
